import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app import auth

URL = "https://example.supabase.co"
KEY = ec.generate_private_key(ec.SECP256R1())
OTHER_KEY = ec.generate_private_key(ec.SECP256R1())
PROFILES = {"u-advisor": {"role": "advisor", "modules": ["m03"]}, "u-coord": {"role": "coordinator", "modules": []}}


def token(sub="u-advisor", key=KEY, exp_in=3600, aud="authenticated", iss=f"{URL}/auth/v1", iat_offset=0):
    now = int(time.time())
    return jwt.encode({"sub": sub, "aud": aud, "iss": iss, "iat": now + iat_offset, "exp": now + exp_in}, key, algorithm="ES256")


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", URL)
    monkeypatch.setattr(auth, "signing_key", lambda t: KEY.public_key())
    monkeypatch.setattr(auth, "fetch_profile", lambda uid: PROFILES.get(uid))
    app = FastAPI()

    @app.get("/me")
    def me(user: auth.User = Depends(auth.current_user)):
        return {"id": user.id, "role": user.role, "modules": list(user.modules)}

    @app.get("/coord")
    def coord(user: auth.User = Depends(auth.require_role("coordinator", "admin"))):
        return {"ok": True}

    return TestClient(app)


def bearer(t):
    return {"Authorization": f"Bearer {t}"}


def test_valid_token_returns_profile(client):
    r = client.get("/me", headers=bearer(token()))
    assert r.status_code == 200 and r.json() == {"id": "u-advisor", "role": "advisor", "modules": ["m03"]}


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Basic abc"}, bearer("not-a-jwt")])
def test_missing_or_malformed_token_is_401(client, headers):
    assert client.get("/me", headers=headers).status_code == 401


@pytest.mark.parametrize("bad", [
    dict(key=OTHER_KEY),            # wrong signature
    dict(exp_in=-120),              # expired beyond the clock leeway
    dict(aud="anon"),               # wrong audience
    dict(iss="https://evil/auth/v1"),  # wrong issuer
])
def test_rejected_claims_are_401(client, bad):
    assert client.get("/me", headers=bearer(token(**bad))).status_code == 401


def test_small_clock_skew_is_tolerated(client):
    # Supabase can issue a token whose iat is a few seconds ahead of the API host's clock.
    assert client.get("/me", headers=bearer(token(iat_offset=10))).status_code == 200


def test_user_without_profile_is_403(client):
    assert client.get("/me", headers=bearer(token(sub="u-unknown"))).status_code == 403


def test_role_check(client):
    assert client.get("/coord", headers=bearer(token())).status_code == 403
    assert client.get("/coord", headers=bearer(token(sub="u-coord"))).status_code == 200


def test_module_visibility():
    assert auth.User("a", "advisor", ("m03",)).sees("m03") and not auth.User("a", "advisor", ("m03",)).sees("m07")
    assert auth.User("b", "admin").sees("m07")
