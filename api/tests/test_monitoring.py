import pytest
from fastapi import Request
from fastapi.testclient import TestClient

from app.auth import User, current_user
from app.main import app, get_store
from app.monitoring import request_stats


def test_request_stats_aggregates_rows():
    rows = [dict(endpoint="GET /model", status_code=200, latency_ms=10.0, created_at="2026-11-23T01:00:00+00:00"),
            dict(endpoint="GET /model", status_code=200, latency_ms=30.0, created_at="2026-11-23T02:00:00+00:00"),
            dict(endpoint="POST /cohorts", status_code=502, latency_ms=900.0, created_at="2026-11-23T18:00:00+00:00"),
            dict(endpoint="GET /insights", status_code=401, latency_ms=5.0, created_at="2026-11-23T03:00:00+00:00")]
    s = request_stats(rows, 7)
    assert s["total"] == 4 and s["server_errors"] == 1 and s["client_errors"] == 1 and s["error_rate"] == 0.25
    assert s["endpoints"][0] == dict(endpoint="GET /model", requests=2, server_errors=0, client_errors=0, p50=20.0,
                                     p95=pytest.approx(29.0))
    # 18:00 UTC is the next day in WIB (UTC+7)
    assert [d["day"] for d in s["daily"]] == ["2026-11-23", "2026-11-24"]


def test_request_stats_empty():
    assert request_stats([], 7)["total"] == 0


class LogStore:
    def __init__(self):
        self.rows = []

    def log_request(self, row):
        self.rows.append(row)

    def get_request_log(self, since):
        return [dict(endpoint="GET /model", status_code=200, latency_ms=12.0, created_at=since)]


def signed_in(request: Request) -> User:
    request.state.user_id = "u-coord"  # as auth.current_user does
    return User("u-coord", "coordinator", ("m03",))


@pytest.fixture
def client():
    store = LogStore()
    app.dependency_overrides[current_user] = signed_in
    app.dependency_overrides[get_store] = lambda: store
    with TestClient(app, raise_server_exceptions=False) as c:
        app.state.request_log = store
        c.store = store
        yield c
    app.dependency_overrides.clear()


def wait_for(store, n):
    import time
    for _ in range(100):
        if len(store.rows) >= n:
            return
        time.sleep(0.02)


def test_middleware_logs_route_template_and_skips_probes(client):
    client.get("/health")
    client.options("/model", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"})
    client.get("/students/999999/counterfactual")  # FakeStore lacks get_student: the handler raises, logged as 500
    client.get("/nope")
    wait_for(client.store, 2)
    endpoints = {r["endpoint"]: r for r in client.store.rows}
    assert set(endpoints) == {"GET /students/{student_id}/counterfactual", "GET unmatched"}
    assert endpoints["GET unmatched"]["status_code"] == 404
    cf = endpoints["GET /students/{student_id}/counterfactual"]
    assert cf["status_code"] == 500 and cf["user_id"] == "u-coord" and cf["latency_ms"] >= 0


def test_stats_endpoint_needs_coordinator(client):
    r = client.get("/monitoring/requests?days=3")
    assert r.status_code == 200 and r.json()["total"] == 1 and r.json()["days"] == 3
    app.dependency_overrides[current_user] = lambda: User("u-adv", "advisor", ("m03",))
    assert client.get("/monitoring/requests").status_code == 403
