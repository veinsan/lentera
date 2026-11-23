import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.auth import User, current_user
from app.main import app, get_store
from app import rules
from app.rules import ARCHETYPES

COHORT = "00000000-0000-0000-0000-00000000c0de"


class FakeStore:
    def __init__(self):
        rng = np.random.default_rng(3)
        self.rows = [dict(student_id=i, code_module=f"m0{1 + i % 7}", probability=float(rng.uniform()),
                          archetype=ARCHETYPES[i % 6]) for i in range(700)]
        self.saved = []

    def get_predictions(self, cohort_id):
        return self.rows if cohort_id == COHORT else []

    def save_plan(self, **kw):
        self.saved.append(kw)
        return 7


@pytest.fixture
def client():
    store = FakeStore()
    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[current_user] = lambda: User("u-coord", "coordinator", ("m01", "m02"))
    with TestClient(app) as c:
        c.app.state.plan_cache.clear()
        c.store = store
        yield c
    app.dependency_overrides.clear()


def body(**kw):
    return {"cohort_id": COHORT, "advisors": 2, "hours_per_advisor": 5, **kw}


def test_preview_limits_to_user_modules_and_capacity(client):
    r = client.post("/plans/preview", json=body())
    assert r.status_code == 200, r.text
    s = r.json()["summary"]
    visible = [x for x in client.store.rows if x["code_module"] in ("m01", "m02")]
    assert s["flagged"] == sum(x["probability"] >= rules.THRESHOLD for x in visible)
    assert s["minutes_used"] <= 2 * 5 * 60 and s["marginal_per_advisor"] >= 0
    assert "assignments" not in r.json() and len(r.json()["playbook"]) == 6 and len(r.json()["curve"]) == 21


def test_effectiveness_override_is_a_scenario(client):
    r = client.post("/plans/preview", json=body(overrides={"silent": {"effectiveness": 0.2}}))
    assert r.json()["summary"]["is_scenario"] is True


@pytest.mark.parametrize("bad", [body(advisors=-1), body(hours_per_advisor=100), body(overrides={"x": {"minutes": 5}}),
                                 body(overrides={"fading": {"effectiveness": 2}})])
def test_invalid_inputs_are_422(client, bad):
    assert client.post("/plans/preview", json=bad).status_code == 422


def test_unknown_cohort_is_404(client):
    assert client.post("/plans/preview", json=body(cohort_id="00000000-0000-0000-0000-000000000000")).status_code == 404


def test_save_stores_params_and_result(client):
    r = client.post("/plans", json=body())
    assert r.status_code == 200 and r.json()["id"] == 7
    saved = client.store.saved[0]
    assert saved["user_id"] == "u-coord" and saved["params"]["advisors"] == 2 and "summary" in saved["result"]


def test_advisor_cannot_plan(client):
    app.dependency_overrides[current_user] = lambda: User("u-adv", "advisor", ("m03",))
    assert client.post("/plans/preview", json=body()).status_code == 403
