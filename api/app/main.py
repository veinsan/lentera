"""Lentera API. Run from api/: uv run --env-file .env python -m uvicorn app.main:app --reload"""
from __future__ import annotations

import json
import os
import time
from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app import quality, rules, scenarios
from app.auth import User, current_user, require_role
from app.explain import Explainer
from app.model import ARTIFACTS, Model
from app.scoring import score_cohort, summarize
from app.store import SupabaseStore

MAX_UPLOAD_BYTES = 20 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the model and the generated JSON once per process.
    app.state.model = Model()
    app.state.explainer = Explainer(app.state.model)
    app.state.schema = quality.load_schema()
    app.state.targets = scenarios.load_targets()
    app.state.model_card = json.loads((ARTIFACTS / "model_card.json").read_text(encoding="utf-8"))
    app.state.insights = json.loads((ARTIFACTS / "insights.json").read_text(encoding="utf-8"))
    yield


app = FastAPI(title="Lentera API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


def get_store() -> SupabaseStore:
    return SupabaseStore()


@app.get("/health")
def health(request: Request) -> dict:
    meta = request.app.state.model.meta
    return {"status": "ok", "model_version": meta["model_version"], "threshold": meta["threshold"],
            "image_tag": os.getenv("IMAGE_TAG", "local")}


@app.get("/model")
def model_card(request: Request, user: User = Depends(current_user)) -> dict:
    return request.app.state.model_card


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
        raise HTTPException(422, f"File bukan CSV yang valid: {e.__class__.__name__}") from None
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
    scored = score_cohort(model, request.app.state.explainer, typed)
    try:
        cohort_id = store.save_cohort(name=name.strip(), user_id=user.id, csv_bytes=content, raw=typed, scored=scored,
                                      model_version=model.meta["model_version"], quality_report=report)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Gagal menyimpan ke Supabase: {e.__class__.__name__}") from None
    return {"cohort_id": cohort_id, "summary": summarize(scored), "quality_report": report,
            "seconds": round(time.perf_counter() - started, 2)}


def _student_frame(request: Request, student_id: int, user: User, store: SupabaseStore):
    """Stored raw row for one student; 404 also when the student is outside the user's modules."""
    try:
        student = store.get_student(student_id)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Gagal membaca Supabase: {e.__class__.__name__}") from None
    if student is None or not user.sees(student["code_module"]):
        raise HTTPException(404, "Mahasiswa tidak ditemukan.")
    return quality.frame_from_records([student["raw"]], request.app.state.schema)


@app.get("/students/{student_id}/counterfactual")
def student_counterfactual(student_id: int, request: Request, user: User = Depends(current_user),
                           store: SupabaseStore = Depends(get_store)) -> dict:
    raw = _student_frame(request, student_id, user, store)
    model = request.app.state.model
    result = scenarios.counterfactual(model, raw, request.app.state.targets)[0]
    arch = str(rules.archetype(raw)[0])
    book = rules.PLAYBOOK[arch]
    return {**result, "threshold": model.threshold, "archetype": arch,
            "playbook": {k: book[k] for k in ("action", "label", "description", "minutes")},
            "message": rules.message(arch, raw.iloc[0]),
            "levers": [{"key": k, "label": scenarios.LEVER_LABELS[k]} for k in scenarios.LEVERS]}


class SimulateBody(BaseModel):
    levers: list[str]


@app.post("/students/{student_id}/simulate")
def student_simulate(student_id: int, body: SimulateBody, request: Request, user: User = Depends(current_user),
                     store: SupabaseStore = Depends(get_store)) -> dict:
    unknown = set(body.levers) - set(scenarios.LEVERS)
    if unknown:
        raise HTTPException(422, f"Lever tidak dikenal: {', '.join(sorted(unknown))}")
    raw = _student_frame(request, student_id, user, store)
    model = request.app.state.model
    p = scenarios.simulate(model, raw, body.levers, request.app.state.targets)[0]
    base = float(model.predict_proba(raw)[0])
    if p != p:  # NaN: placeholder activity block, scenarios do not apply
        return {"applicable": False, "base": base, "probability": None, "levers": body.levers}
    return {"applicable": True, "base": base, "probability": float(p), "levers": body.levers,
            "flagged": bool(p >= model.threshold)}
