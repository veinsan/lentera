"""Lentera API. Run from api/: uv run --env-file .env python -m uvicorn app.main:app --reload"""
from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.auth import User, current_user
from app.model import ARTIFACTS, Model


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the model and the generated JSON once per process.
    app.state.model = Model()
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
