from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.auth import User, current_user
from app.main import app, get_store

DATA = Path(__file__).resolve().parents[2] / "data"
pytestmark = pytest.mark.skipif(not (DATA / "test.csv").exists(), reason="competition data is local only")


class FakeStore:
    def __init__(self):
        self.calls = []

    def save_cohort(self, **kw):
        self.calls.append(kw)
        return "00000000-0000-0000-0000-000000000001"


@pytest.fixture
def client():
    store = FakeStore()
    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[current_user] = lambda: User("u-coord", "coordinator", ("m01",))
    with TestClient(app) as c:
        c.store = store
        yield c
    app.dependency_overrides.clear()


def upload(client, path, content, **form):
    return client.post(path, files={"file": ("cohort.csv", content, "text/csv")}, data=form)


def test_validate_returns_report(client):
    r = upload(client, "/cohorts/validate", (DATA / "test.csv").read_bytes())
    assert r.status_code == 200 and r.json()["can_score"] and r.json()["rows"] == 6502


def test_create_scores_and_stores(client):
    small = b"\n".join((DATA / "test.csv").read_bytes().splitlines()[:201])
    r = upload(client, "/cohorts", small, name="Uji 200 baris")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["summary"]["rows"] == 200 and sum(body["summary"]["tiers"].values()) == 200
    call = client.store.calls[0]
    assert call["name"] == "Uji 200 baris" and call["user_id"] == "u-coord" and len(call["scored"]) == 200
    assert {"reasons", "tier", "archetype", "code_module"} <= set(call["scored"].columns)
    drift = call["drift_report"]
    assert drift == body["drift_report"] and drift["n"] == 200 and len(drift["features"]) == 13


def test_invalid_csv_is_422_and_not_stored(client):
    r = upload(client, "/cohorts", b"id,foo\n1,2\n", name="Rusak")
    assert r.status_code == 422 and r.json()["quality_report"]["status"] == "error"
    assert client.store.calls == []


def test_advisor_cannot_upload(client):
    app.dependency_overrides[current_user] = lambda: User("u-adv", "advisor", ("m03",))
    assert upload(client, "/cohorts/validate", b"id\n1\n").status_code == 403
