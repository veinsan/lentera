"""Request statistics from request_log rows: volume, error rates, and latency per endpoint and per day."""
from __future__ import annotations

from zoneinfo import ZoneInfo

import pandas as pd

WIB = ZoneInfo("Asia/Jakarta")


def _latency(s: pd.Series) -> dict:
    return dict(p50=float(s.quantile(0.5)), p95=float(s.quantile(0.95)))


def request_stats(rows: list[dict], days: int) -> dict:
    empty = dict(days=days, total=0, server_errors=0, client_errors=0, error_rate=None,
                 latency_ms=None, endpoints=[], daily=[])
    if not rows:
        return empty
    d = pd.DataFrame(rows)
    d["server_error"] = d.status_code >= 500
    d["client_error"] = d.status_code.between(400, 499)
    d["day"] = pd.to_datetime(d.created_at, format="ISO8601").dt.tz_convert(WIB).dt.strftime("%Y-%m-%d")
    endpoints = [
        dict(endpoint=ep, requests=int(len(g)), server_errors=int(g.server_error.sum()),
             client_errors=int(g.client_error.sum()), **_latency(g.latency_ms))
        for ep, g in d.groupby("endpoint")
    ]
    endpoints.sort(key=lambda e: -e["requests"])
    daily = [dict(day=day, requests=int(len(g)), server_errors=int(g.server_error.sum()))
             for day, g in d.groupby("day")]
    return dict(days=days, total=int(len(d)), server_errors=int(d.server_error.sum()),
                client_errors=int(d.client_error.sum()), error_rate=float(d.server_error.mean()),
                latency_ms=_latency(d.latency_ms), endpoints=endpoints, daily=daily)
