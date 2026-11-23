import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import rules
from app.auth import User, current_user
from app.main import app, get_store

COHORT = "00000000-0000-0000-0000-00000000beef"


class FakeStore:
    def __init__(self):
        rng = np.random.default_rng(5)
        p = rng.uniform(0, 1, 300)
        self.rows = [dict(student_id=i, source_id=5000 + i, code_module=("m01", "m02")[i % 2], probability=float(p[i]),
                          tier=str(rules.tier(p[i:i + 1])[0]), archetype=rules.ARCHETYPES[i % 6]) for i in range(300)]
        self.reports = {}

    def get_predictions(self, cohort_id):
        return self.rows if cohort_id == COHORT else []

    def set_outcome_report(self, cohort_id, report):
        self.reports[cohort_id] = report


def labels_csv(rows, extra=b""):
    return b"id,at_risk\n" + b"".join(f"{r['source_id']},{int(r['probability'] > 0.5)}\n".encode() for r in rows) + extra


@pytest.fixture
def client():
    store = FakeStore()
    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[current_user] = lambda: User("u-coord", "coordinator", ("m01", "m02"))
    with TestClient(app) as c:
        c.store = store
        yield c
    app.dependency_overrides.clear()


def post(client, content, cohort=COHORT):
    return client.post(f"/cohorts/{cohort}/outcomes", files={"file": ("labels.csv", content, "text/csv")})


def test_outcomes_store_an_aggregate_report(client):
    r = post(client, labels_csv(client.store.rows[:250], b"99999,1\n"))
    assert r.status_code == 200, r.text
    report = client.store.reports[COHORT]
    assert report["coverage"] == dict(cohort=300, labels=251, matched=250, without_label=50, unknown_ids=1)
    assert report["metrics"]["n"] == 250 and "plan" in report
    assert "fairness" not in report  # demographic columns are not in stored predictions


def test_outcomes_reject_bad_files_and_unknown_cohorts(client):
    assert post(client, b"id,label\n1,1\n").status_code == 422
    assert post(client, b"id,at_risk\n1,1\n").status_code == 422  # no matching id
    assert post(client, labels_csv(client.store.rows), cohort="00000000-0000-0000-0000-000000000000").status_code == 404
    assert post(client, labels_csv(client.store.rows), cohort="not-a-uuid").status_code == 422


@pytest.mark.parametrize("user, status", [(User("u-adv", "advisor", ("m01", "m02")), 403),
                                          (User("u-coord", "coordinator", ("m01",)), 403)])
def test_outcomes_need_a_manager_who_sees_every_module(client, user, status):
    app.dependency_overrides[current_user] = lambda: user
    assert post(client, labels_csv(client.store.rows)).status_code == status
    assert client.store.reports == {}
