"""Create or update the demo accounts (one per role) through the Supabase Admin API.

Run from api/: uv run --env-file .env python scripts/seed_demo_users.py
Needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DEMO_PASSWORD in api/.env. Role and modules go into
app_metadata, which only the secret key can write; the on_auth_user_created trigger copies them into profiles.
"""
import os
import sys

import httpx

MODULES_ALL = ["m01", "m02", "m03", "m04", "m05", "m06", "m07"]
DEMO_USERS = [
    dict(email="admin.demo@lentera.test", full_name="Admin Demo", role="admin", modules=[]),
    dict(email="koordinator.demo@lentera.test", full_name="Koordinator Demo", role="coordinator", modules=MODULES_ALL),
    # The advisor sees two modules only, which shows row level security in the demo.
    dict(email="konselor.demo@lentera.test", full_name="Konselor Demo", role="advisor", modules=["m03", "m06"]),
]


def main() -> int:
    url, key, password = (os.environ.get(k) for k in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DEMO_PASSWORD"))
    if not (url and key and password):
        print("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DEMO_PASSWORD in api/.env", file=sys.stderr)
        return 1
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    with httpx.Client(base_url=f"{url}/auth/v1/admin", headers=headers, timeout=30) as client:
        existing = {u["email"]: u["id"] for u in client.get("/users", params={"per_page": 1000}).json()["users"]}
        for u in DEMO_USERS:
            body = dict(email=u["email"], password=password, email_confirm=True,
                        user_metadata={"full_name": u["full_name"]},
                        app_metadata={"role": u["role"], "modules": u["modules"]})
            if u["email"] in existing:
                r = client.put(f"/users/{existing[u['email']]}", json=body)
                action = "updated"
            else:
                r = client.post("/users", json=body)
                action = "created"
            r.raise_for_status()
            print(f"{action} {u['email']} ({u['role']}, modules: {', '.join(u['modules']) or 'all'})")
    # Profiles of updated users do not pass through the insert trigger; sync role and modules directly.
    with httpx.Client(base_url=f"{url}/rest/v1", headers=headers, timeout=30) as rest:
        for u in DEMO_USERS:
            r = rest.patch("/profiles", params={"id": f"eq.{_user_id(url, headers, u['email'])}"},
                           json={"full_name": u["full_name"], "role": u["role"], "modules": u["modules"]})
            r.raise_for_status()
    return 0


def _user_id(url: str, headers: dict, email: str) -> str:
    users = httpx.get(f"{url}/auth/v1/admin/users", headers=headers, params={"per_page": 1000}, timeout=30).json()["users"]
    return next(u["id"] for u in users if u["email"] == email)


if __name__ == "__main__":
    sys.exit(main())
