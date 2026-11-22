import json
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import quality, rules
from app.auth import User, current_user
from app.main import app, get_store
from app.model import Model
from app.pipeline.features import placeholder_activity
from app.store import _clean

DATA = Path(__file__).resolve().parents[2] / "data"
pytestmark = pytest.mark.skipif(not (DATA / "test.csv").exists(), reason="competition data is local only")


@pytest.fixture(scope="module")
def cohort():
    schema = quality.load_schema()
    _, typed = quality.validate(quality.read_csv((DATA / "test.csv").read_bytes()), schema)
    p = Model().predict_proba(typed)
    return typed.reset_index(drop=True), p


class FakeStore:
    """Stores rows the way SupabaseStore does: JSON round trip with NaN as null."""

    def __init__(self, typed, module_of):
        self.rows = {i: dict(id=i, cohort_id="c", code_module=module_of(r),
                             raw=json.loads(json.dumps({k: _clean(v) for k, v in r.items()}, default=lambda o: o.item())))
                     for i, r in enumerate(typed.to_dict("records"))}

    def get_student(self, student_id):
        return self.rows.get(student_id)


@pytest.fixture
def client(cohort):
    typed, _ = cohort
    store = FakeStore(typed, lambda r: str(r["code_module"]).lower().replace("ggg", "m07"))
    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[current_user] = lambda: User("u-coord", "coordinator", tuple(f"m0{i}" for i in range(1, 8)))
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def first(typed, p, mask):
    return int(np.flatnonzero(mask & (p >= rules.THRESHOLD))[0])


def test_counterfactual_round_trip_and_contract(client, cohort):
    typed, p = cohort
    i = first(typed, p, (rules.archetype(typed) == "missed_submission"))
    r = client.get(f"/students/{i}/counterfactual")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["base"] == pytest.approx(p[i], abs=1e-12)  # stored row reproduces the scored probability
    assert body["archetype"] == "missed_submission" and body["playbook"]["action"] == "deadline_call"
    assert "asesmen" in body["message"] and len(body["levers"]) == 4
    assert all(s["probability"] < body["base"] for s in body["single"])


def test_placeholder_student_has_no_scenarios(client, cohort):
    typed, p = cohort
    i = first(typed, p, placeholder_activity(typed).to_numpy())
    body = client.get(f"/students/{i}/counterfactual").json()
    assert body["applicable"] is False and body["best"] is None
    sim = client.post(f"/students/{i}/simulate", json={"levers": ["return_to_activity"]}).json()
    assert sim["applicable"] is False and sim["probability"] is None


def test_simulate_matches_scenarios(client, cohort):
    typed, p = cohort
    i = first(typed, p, ~placeholder_activity(typed).to_numpy())
    r = client.post(f"/students/{i}/simulate", json={"levers": ["week4_median", "more_active_days"]})
    assert r.status_code == 200 and r.json()["applicable"] and 0 <= r.json()["probability"] <= 1
    assert client.post(f"/students/{i}/simulate", json={"levers": ["teleport"]}).status_code == 422


def test_student_outside_modules_is_404(client, cohort):
    typed, _ = cohort
    i = int(np.flatnonzero(typed.code_module.str.lower().eq("m01"))[0])
    app.dependency_overrides[current_user] = lambda: User("u-adv", "advisor", ("m03",))
    assert client.get(f"/students/{i}/counterfactual").status_code == 404
    assert client.get("/students/999999/counterfactual").status_code == 404
