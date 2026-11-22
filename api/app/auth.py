"""Supabase access-token verification and role checks.

Tokens are ES256 JWTs signed by the project's asymmetric key; the public keys come from the JWKS endpoint, so the
API holds no JWT secret. The role and modules come from public.profiles, read with the secret key.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache

import httpx
import jwt
from fastapi import Depends, HTTPException, Request, status

ROLES = ("advisor", "coordinator", "admin")


@dataclass(frozen=True)
class User:
    id: str
    role: str
    modules: tuple[str, ...] = field(default_factory=tuple)

    def sees(self, module: str) -> bool:
        return self.role == "admin" or module in self.modules


def _supabase_url() -> str:
    url = os.environ.get("SUPABASE_URL")
    if not url:
        raise RuntimeError("SUPABASE_URL is not set")
    return url.rstrip("/")


@lru_cache
def _jwks() -> jwt.PyJWKClient:
    # PyJWKClient caches keys and refetches when a token names an unknown key id.
    return jwt.PyJWKClient(f"{_supabase_url()}/auth/v1/.well-known/jwks.json", cache_keys=True)


def signing_key(token: str):
    return _jwks().get_signing_key_from_jwt(token).key


CLOCK_LEEWAY_SECONDS = 30  # a fresh token's iat can be ahead of this host's clock


def verify(token: str) -> dict:
    return jwt.decode(token, signing_key(token), algorithms=["ES256"], audience="authenticated",
                      issuer=f"{_supabase_url()}/auth/v1", options={"require": ["exp", "sub"]},
                      leeway=CLOCK_LEEWAY_SECONDS)


def fetch_profile(user_id: str) -> dict | None:
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    r = httpx.get(f"{_supabase_url()}/rest/v1/profiles", params={"id": f"eq.{user_id}", "select": "role,modules"},
                  headers={"apikey": key, "Authorization": f"Bearer {key}"}, timeout=10)
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else None


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"})


def current_user(request: Request) -> User:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise _unauthorized("Missing bearer token")
    try:
        claims = verify(header.removeprefix("Bearer ").strip())
    except (jwt.PyJWTError, jwt.PyJWKClientError) as e:
        raise _unauthorized(f"Invalid token: {e.__class__.__name__}") from None
    profile = fetch_profile(claims["sub"])
    if profile is None or profile.get("role") not in ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No Lentera profile for this user")
    request.state.user_id = claims["sub"]  # read by the request log
    return User(id=claims["sub"], role=profile["role"], modules=tuple(profile.get("modules") or ()))


def require_role(*roles: str):
    assert set(roles) <= set(ROLES), roles

    def check(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Requires role: {', '.join(roles)}")
        return user

    return check
