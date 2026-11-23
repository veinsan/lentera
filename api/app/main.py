"""Lentera API. Run from api/: uv run --env-file .env python -m uvicorn app.main:app --reload"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta

import httpx
from fastapi import Depends, FastAPI, File, Form, HTTPException, Path, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
from pydantic import BaseModel, Field

from app import drift, evaluation, monitoring, planner, quality, rules, scenarios
from app.auth import User, current_user, require_role
from app.explain import Explainer
from app.model import ARTIFACTS, Model
from app.scoring import score_cohort, summarize
from app.store import SupabaseStore

MAX_UPLOAD_BYTES = 20 * 1024 * 1024
UUID_PATTERN = r"^[0-9a-fA-F-]{36}$"
NOT_LOGGED = {"/health", "/docs", "/docs/oauth2-redirect", "/openapi.json"}  # probes and API docs
log = logging.getLogger("lentera")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the model and the generated JSON once per process.
    app.state.model = Model()
    app.state.explainer = Explainer(app.state.model)
    app.state.schema = quality.load_schema()
    app.state.targets = scenarios.load_targets()
    app.state.plan_cache = {}  # cohort_id -> predictions frame; stored predictions never change
    app.state.contexts = {}  # cohort_id -> ranking context for what-if; the last few cohorts only
    app.state.model_card = json.loads((ARTIFACTS / "model_card.json").read_text(encoding="utf-8"))
    app.state.insights = json.loads((ARTIFACTS / "insights.json").read_text(encoding="utf-8"))
    # Built from the DSCO test labels by scripts/build_test_evaluation.py; absent until the labels are available.
    test_eval = ARTIFACTS / "test_evaluation.json"
    app.state.test_evaluation = json.loads(test_eval.read_text(encoding="utf-8")) if test_eval.exists() else None
    app.state.drift_reference = drift.load_reference(ARTIFACTS / "drift_reference.json")
    # Request logging needs the Supabase secret key; without it (tests, CI smoke test) nothing is logged.
    keys = os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    app.state.request_log = SupabaseStore() if keys else None
    yield


# The deployed image sets IMAGE_TAG; there the interactive docs and the schema stay off.
DOCS = os.getenv("IMAGE_TAG") is None
app = FastAPI(title="Lentera API", version="0.1.0", lifespan=lifespan, docs_url="/docs" if DOCS else None,
              redoc_url=None, openapi_url="/openapi.json" if DOCS else None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


def get_store() -> SupabaseStore:
    return SupabaseStore()


def _write_log(store: SupabaseStore, row: dict) -> None:
    try:
        store.log_request(row)
    except Exception as e:  # a failed log write must never fail the request
        log.warning("request_log write failed: %s", e.__class__.__name__)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """One request_log row per API call, written off the request path after the response is ready."""
    started = time.perf_counter()
    status_code = 500  # stays 500 if the handler raises
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        store = getattr(request.app.state, "request_log", None)
        if store is not None and request.method != "OPTIONS" and request.url.path not in NOT_LOGGED:
            route = request.scope.get("route")
            row = dict(endpoint=f"{request.method} {route.path if route else 'unmatched'}",
                       status_code=status_code, latency_ms=round((time.perf_counter() - started) * 1000, 1),
                       user_id=getattr(request.state, "user_id", None),
                       cohort_id=getattr(request.state, "cohort_id", None))
            asyncio.get_running_loop().run_in_executor(None, _write_log, store, row)


@app.get("/health")
def health(request: Request) -> dict:
    meta = request.app.state.model.meta
    return {"status": "ok", "model_version": meta["model_version"], "threshold": meta["threshold"],
            "image_tag": os.getenv("IMAGE_TAG", "local")}


@app.get("/model")
def model_card(request: Request, user: User = Depends(current_user)) -> dict:
    return {**request.app.state.model_card, "test_evaluation": request.app.state.test_evaluation}


@app.get("/insights")
def insights(request: Request, user: User = Depends(current_user)) -> dict:
    return request.app.state.insights


def _read_upload(file: UploadFile) -> bytes:
    content = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File lebih dari 20 MB.")
    return content


def _validate(request: Request, content: bytes):
    try:
        frame = quality.read_csv(content)
    except (ValueError, UnicodeDecodeError) as e:
        raise HTTPException(422, f"File bukan CSV yang valid ({e.__class__.__name__}).") from None
    return quality.validate(frame, request.app.state.schema)


@app.post("/cohorts/validate")
def validate_cohort(request: Request, file: UploadFile = File(...),
                    user: User = Depends(require_role("coordinator", "admin"))) -> dict:
    report, _ = _validate(request, _read_upload(file))
    return report


@app.post("/cohorts")
def create_cohort(request: Request, file: UploadFile = File(...), name: str = Form(..., min_length=1, max_length=120),
                  user: User = Depends(require_role("coordinator", "admin")),
                  store: SupabaseStore = Depends(get_store)):
    started = time.perf_counter()
    content = _read_upload(file)
    report, typed = _validate(request, content)
    if not report["can_score"]:
        return JSONResponse(status_code=422, content={"detail": "Data tidak lolos pemeriksaan.", "quality_report": report})
    model = request.app.state.model
    ctx = model.context(typed)
    scored = score_cohort(model, request.app.state.explainer, typed, ctx)
    drift_report = drift.report(typed, scored.probability.to_numpy(), request.app.state.drift_reference)
    try:
        cohort_id = store.save_cohort(name=name.strip(), user_id=user.id, csv_bytes=content, raw=typed, scored=scored,
                                      model_version=model.meta["model_version"], quality_report=report,
                                      drift_report=drift_report)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Gagal menyimpan ke Supabase ({e.__class__.__name__}).") from None
    request.state.cohort_id = cohort_id
    _remember_context(request, cohort_id, ctx)
    return {"cohort_id": cohort_id, "summary": summarize(scored), "quality_report": report,
            "drift_report": drift_report, "seconds": round(time.perf_counter() - started, 2)}


CONTEXTS_KEPT = 2  # each context holds the cohort's ranking pools, a few tens of MB


def _remember_context(request: Request, cohort_id: str, ctx) -> None:
    contexts = request.app.state.contexts
    contexts.pop(cohort_id, None)
    contexts[cohort_id] = ctx
    while len(contexts) > CONTEXTS_KEPT:
        contexts.pop(next(iter(contexts)))


def _student_frame(request: Request, student_id: int, user: User, store: SupabaseStore):
    """Stored raw row for one student and the ranking context of its cohort; 404 outside the user's modules."""
    try:
        student = store.get_student(student_id)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Gagal membaca Supabase ({e.__class__.__name__}).") from None
    if student is None or not user.sees(student["code_module"]):
        raise HTTPException(404, "Mahasiswa tidak ditemukan.")
    raw = quality.frame_from_records([student["raw"]], request.app.state.schema)
    cohort_id = student["cohort_id"]
    ctx = request.app.state.contexts.get(cohort_id)
    if ctx is None:
        # The student is ranked within its cohort, as when it was scored; rebuild that cohort from its stored CSV.
        try:
            content = store.get_cohort_csv(cohort_id)
        except httpx.HTTPError as e:
            raise HTTPException(502, f"Gagal membaca file kohort ({e.__class__.__name__}).") from None
        _, typed = _validate(request, content)
        if typed is None:
            raise HTTPException(409, "File kohort tidak lagi lolos pemeriksaan data.")
        ctx = request.app.state.model.context(typed)
    _remember_context(request, cohort_id, ctx)
    return raw, ctx


@app.get("/students/{student_id}/counterfactual")
def student_counterfactual(student_id: int, request: Request, user: User = Depends(current_user),
                           store: SupabaseStore = Depends(get_store)) -> dict:
    raw, ctx = _student_frame(request, student_id, user, store)
    model = request.app.state.model
    result = scenarios.counterfactual(model, raw, request.app.state.targets, ctx)[0]
    arch = str(rules.archetype(raw)[0])
    book = rules.PLAYBOOK[arch]
    return {**result, "threshold": model.threshold, "archetype": arch,
            "playbook": {k: book[k] for k in ("action", "label", "description", "minutes")},
            "message": rules.message(arch, raw.iloc[0]),
            "levers": [{"key": k, "label": scenarios.LEVER_LABELS[k]} for k in scenarios.LEVERS]}


class SimulateBody(BaseModel):
    levers: list[str] = Field(..., max_length=10)


@app.post("/students/{student_id}/simulate")
def student_simulate(student_id: int, body: SimulateBody, request: Request, user: User = Depends(current_user),
                     store: SupabaseStore = Depends(get_store)) -> dict:
    unknown = set(body.levers) - set(scenarios.LEVERS)
    if unknown:
        raise HTTPException(422, f"Lever tidak dikenal ({', '.join(sorted(unknown))}).")
    raw, ctx = _student_frame(request, student_id, user, store)
    model = request.app.state.model
    p = scenarios.simulate(model, raw, body.levers, request.app.state.targets, ctx)[0]
    base = float(model.predict_proba(raw, ctx)[0])
    if p != p:  # NaN: placeholder activity block, scenarios do not apply
        return {"applicable": False, "base": base, "probability": None, "levers": body.levers}
    return {"applicable": True, "base": base, "probability": float(p), "levers": body.levers,
            "flagged": bool(p >= model.threshold)}


class PlaybookOverride(BaseModel):
    minutes: float | None = Field(None, ge=0, le=240)
    effectiveness: float | None = Field(None, ge=0, le=1)


class PlanBody(BaseModel):
    cohort_id: str = Field(..., pattern=UUID_PATTERN)
    advisors: int = Field(..., ge=0, le=200)
    hours_per_advisor: float = Field(..., ge=0, le=80)
    overrides: dict[str, PlaybookOverride] = {}


def _plan(request: Request, body: PlanBody, user: User, store: SupabaseStore) -> dict:
    unknown = set(body.overrides) - set(rules.ARCHETYPES)
    if unknown:
        raise HTTPException(422, f"Archetype tidak dikenal ({', '.join(sorted(unknown))}).")
    request.state.cohort_id = body.cohort_id
    cache = request.app.state.plan_cache
    if body.cohort_id not in cache:
        try:
            cache[body.cohort_id] = pd.DataFrame(store.get_predictions(body.cohort_id))
        except httpx.HTTPError as e:
            raise HTTPException(502, f"Gagal membaca Supabase ({e.__class__.__name__}).") from None
    students = cache[body.cohort_id]
    if students.empty:
        raise HTTPException(404, "Kohort tidak ditemukan.")
    students = students[students.code_module.map(user.sees)].rename(columns={"student_id": "id"})
    overrides = {k: v.model_dump(exclude_none=True) for k, v in body.overrides.items()}
    result = planner.plan(students, body.advisors, body.hours_per_advisor, overrides)
    result.pop("assignments")  # thousands of rows; recomputable from params
    return result


@app.post("/plans/preview")
def plan_preview(body: PlanBody, request: Request, user: User = Depends(require_role("coordinator", "admin")),
                 store: SupabaseStore = Depends(get_store)) -> dict:
    return _plan(request, body, user, store)


@app.post("/plans")
def plan_save(body: PlanBody, request: Request, user: User = Depends(require_role("coordinator", "admin")),
              store: SupabaseStore = Depends(get_store)) -> dict:
    result = _plan(request, body, user, store)
    try:
        plan_id = store.save_plan(cohort_id=body.cohort_id, user_id=user.id, params=body.model_dump(), result=result)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Gagal menyimpan ke Supabase ({e.__class__.__name__}).") from None
    return {"id": plan_id, **result}


@app.post("/cohorts/{cohort_id}/outcomes")
def cohort_outcomes(request: Request, cohort_id: str = Path(..., pattern=UUID_PATTERN), file: UploadFile = File(...),
                    user: User = Depends(require_role("coordinator", "admin")),
                    store: SupabaseStore = Depends(get_store)) -> dict:
    """Evaluate a scored cohort against its real outcomes (CSV with id and at_risk) and store the aggregate report.

    Per-student labels are not stored. The report covers the whole cohort, so only users who see every module of
    the cohort may upload outcomes for it.
    """
    try:
        labels = evaluation.parse_labels(_read_upload(file))
    except ValueError as e:
        raise HTTPException(422, str(e)) from None
    request.state.cohort_id = cohort_id
    try:
        preds = pd.DataFrame(store.get_predictions(cohort_id))
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Gagal membaca Supabase ({e.__class__.__name__}).") from None
    if preds.empty:
        raise HTTPException(404, "Kohort tidak ditemukan.")
    if not preds.code_module.map(user.sees).all():
        raise HTTPException(403, "Hasil akhir hanya bisa diunggah oleh pengguna yang melihat semua modul kohort ini.")
    merged, coverage = evaluation.match(preds, labels)
    if coverage["matched"] == 0:
        raise HTTPException(422, "Tidak ada id yang cocok dengan mahasiswa di kohort ini.")
    report = dict(coverage=coverage, uploaded_at=datetime.now(UTC).isoformat(),
                  **evaluation.evaluate(merged, request.app.state.model.threshold, plan_capacity=planner.OPENING))
    try:
        store.set_outcome_report(cohort_id, report)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Gagal menyimpan ke Supabase ({e.__class__.__name__}).") from None
    return report


@app.get("/monitoring/requests")
def request_stats(days: int = Query(7, ge=1, le=30), user: User = Depends(require_role("coordinator", "admin")),
                  store: SupabaseStore = Depends(get_store)) -> dict:
    since = (datetime.now(UTC) - timedelta(days=days)).isoformat()
    try:
        rows = store.get_request_log(since)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Gagal membaca Supabase ({e.__class__.__name__}).") from None
    return monitoring.request_stats(rows, days)
