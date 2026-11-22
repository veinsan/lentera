import json

import pytest
from fastapi.testclient import TestClient

from app.auth import User, current_user
from app.main import app
from app.model import ARTIFACTS


@pytest.fixture(scope="module")
def client():
    # Token verification is covered in test_auth.py; here a signed-in advisor is assumed.
    app.dependency_overrides[current_user] = lambda: User("u-test", "advisor", ("m03",))
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_health_reports_loaded_model(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    meta = json.loads((ARTIFACTS / "model_meta.json").read_text())
    assert body["status"] == "ok" and body["model_version"] == meta["model_version"] and body["threshold"] == 0.375


@pytest.mark.parametrize("path, artifact", [("/model", "model_card.json"), ("/insights", "insights.json")])
def test_endpoints_return_artifact_contents(client, path, artifact):
    r = client.get(path)
    assert r.status_code == 200
    assert r.json() == json.loads((ARTIFACTS / artifact).read_text(encoding="utf-8"))


@pytest.mark.parametrize("path", ["/model", "/insights"])
def test_endpoints_require_sign_in(client, path):
    override = app.dependency_overrides.pop(current_user)
    try:
        assert client.get(path).status_code == 401
    finally:
        app.dependency_overrides[current_user] = override


def test_cors_allows_local_frontend(client):
    r = client.options("/health", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"
