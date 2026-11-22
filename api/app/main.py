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

from app import quality
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
