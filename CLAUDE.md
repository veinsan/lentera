# CLAUDE.md: Lentera

Lentera deploys the DSCO 2026 at-risk model as a web app. Advisors, course coordinators, and academic leaders use it at the week 4 cutoff to plan interventions from model predictions. Read `PRD.md` for scope, `ARCHITECTURE.md` for the system and the step plan, `DESIGN.md` for visual rules, `WORKFLOW.md` for working rules, and `TODO.md` for current status.

## Tech Stack

| Tool | Version or role |
| --- | --- |
| Next.js | 16.4.6, App Router, Turbopack, Cache Components and Partial Prefetching on (`web/next.config.ts`) |
| React | 19.3.0 |
| TypeScript | 5.9, strict mode |
| Tailwind CSS | 4.3.3, configured in CSS (`web/app/globals.css`), no `tailwind.config` file |
| shadcn/ui | 4.23, style `base-nova` on Base UI (`@base-ui/react`), copied into `web/components/ui/`; class merging through the `cn` package (`web/lib/utils.ts`) |
| lucide-react | Icons |
| Recharts | 3.11, charts in `web/components/charts/` |
| `@supabase/ssr`, `@supabase/supabase-js` | Auth and database access from the frontend |
| PyJWT (crypto) | API verification of Supabase ES256 access tokens against the project JWKS |
| pnpm | 12.18, frontend package manager |
| Python | 3.13 (python.org build; see Local Environment) |
| FastAPI | API service |
| catboost | 1.2.10 |
| pandas | 3.1.1 |
| numpy | 2.5.4 |
| scikit-learn | 1.9.1 |
| uv | Python package manager for `api/` |
| pytest | API tests, run as `uv run python -m pytest` |
| Supabase | Postgres, Auth, RLS, Storage |
| Vercel | Frontend hosting |
| Azure Container Apps | API hosting, image from `ghcr.io` |

The ML library versions match `dsco/outputs/audit/requirements-lock.txt`, except pandas 3.1.1 instead of 3.1.0. The parity check passed with 3.1.1 (6,502 of 6,502 labels, maximum probability difference 1.1e-16). Changing them can change probabilities near the threshold, so a version change requires a new parity check (`skills/verify-model-parity/SKILL.md`).

## Design System

`DESIGN.md` holds the tokens. `web/app/globals.css` defines them as CSS variables in `:root` and maps them to Tailwind utility names in the `@theme inline` block. Change a token in `DESIGN.md` and `globals.css` together. The shadcn/ui variable names map onto `DESIGN.md` roles; shadcn's `accent` is the hover surface, so the `DESIGN.md` amber accent is `brand-accent` in code. Fonts load through `next/font/google` in `web/app/layout.tsx`.

## Project Structure

```text
web/
  app/
    (auth)/login/          Sign-in page
    (app)/                 Pages behind sign-in, sharing the sidebar layout
      dashboard/
      rencana/             Capacity planner
      prioritas/           Advisor worklist
      mahasiswa/[id]/      Student profile
      insight/             Course insights
      unggah/              Cohort upload
      model/               Model and monitoring
  components/
    ui/                    shadcn/ui components
    layout/                Sidebar, nav links, page header
    charts/                Recharts wrappers that apply chart tokens
    domain/                Empty state, KPI card, section, tier badge, fairness table, API error; planned: archetype chip, scenario panel, reason list
  lib/
    nav.ts                 Sidebar items
    utils.ts               cn() class merging
    auth.ts                getCurrentUser() and requireRole(): the data access layer for the session
    supabase/              Browser and server Supabase clients
proxy.ts                   Session refresh and sign-in redirect (Next.js 16 name for middleware)
    api.ts                 Typed client for the FastAPI service (`API_URL`, server-side only)
    api-browser.ts         File uploads from the browser to the API with the user's token (`NEXT_PUBLIC_API_URL`)
    labels.ts              Indonesian labels for archetypes and playbook actions
    format.ts              Number and probability formatting (id-ID, decimal comma)
api/
  app/
    main.py                FastAPI app, routers, CORS
    auth.py                Supabase JWT verification and role checks
    pipeline/              Preprocessing ported from dsco/src/train_only.py
    explain.py             SHAP and reason codes
    rules.py               Tier, uncertain band, archetype, playbook
    scenarios.py           Levers, what-if, counterfactual
    planner.py             Capacity planner
    drift.py               PSI
  artifacts/               Model and generated JSON, committed
  scripts/                 Offline training and artifact builders
  tests/
supabase/migrations/       Schema and RLS
skills/                    Project skills
data/                      Local only, gitignored
```

## Code Conventions

- TypeScript strict mode, no `any`. Functional components with typed props.
- Next.js 16 differs from older versions. Before writing Next.js code, read the relevant guide in `web/node_modules/next/dist/docs/` (`web/AGENTS.md`, which `next dev` re-adds; commit it).
- `web/lib/supabase/server.ts` calls `connection()` before reading cookies, because supabase-js reads `Date.now()` while loading the session and Cache Components rejects that during prerendering.
- Cache Components is on: wrap uncached data reads, `cookies()`, `headers()`, `searchParams`, and awaited dynamic `params` in `<Suspense>`. Client components that call `usePathname` in a shared layout also sit inside `<Suspense>` (see `web/components/layout/sidebar.tsx`).
- Use the `@/` import alias for `web/`.
- Fetch Supabase data in server components where possible. Call the API through `web/lib/api.ts` only. It returns `{ ok, data }` or `{ ok: false, error }` instead of throwing, and calls `unstable_rethrow` so Next.js prerender signals pass through; pages render `ApiError` on failure.
- Charts follow the dataviz rules: categorical and ordinal colors come only from validated tokens, 2px lines, bars at most 24px with 4px rounded ends, solid hairline grids, a legend for two or more series, a hover tooltip with the value first, and no dual axes.
- Format probabilities and counts through `web/lib/format.ts` so every page shows them the same way.
- Python: type hints on public functions, pydantic models for request and response bodies.
- Keep `api/app/rules.py`, `scenarios.py`, and `planner.py` free of I/O so they are unit-testable.
- Thresholds and tier cutoffs live in one place, `api/app/rules.py`, and reach the frontend through API responses or stored predictions. The frontend never hardcodes 0.375, 0.6, or 0.85.
- Every number shown in the interface comes from an artifact or a query. Do not type metrics into components or copy.
- Interface text is Indonesian. Code, comments, and documents are English.
- If an instruction is ambiguous, ask what it means before coding.

## Features

The planned pages and their steps are in `ARCHITECTURE.md`.

- [x] Model artifacts and parity check (`api/artifacts/`, `api/scripts/parity_check.py`)
- [x] Reason codes, decision rules, scenarios, counterfactual, and capacity planner in `api/app/` (no endpoints yet)
- [x] API endpoints `GET /health`, `/model`, `/insights` (no sign-in yet)
- [x] App shell: sidebar navigation, page headers, and empty states for every page
- [x] Supabase schema with RLS (`supabase/migrations/0001_init.sql`), demo accounts (`api/scripts/seed_demo_users.py`)
- [x] Sign-in, role-filtered sidebar, sign-out, role gate for coordinator and admin pages; API token verification
- [x] Cohort upload: data quality gate, scoring with reason codes, storage in Supabase, upload page with report and summary
- [x] Model & Monitoring page: KPIs, nested validation, ablation, method comparison, calibration, capacity curve, tiers, segment and module reliability, signal importance, fairness, presentation stress test, artifacts (drift and API health pending)
- [x] Insight Course page: risk heatmap, per-module metrics, recommendations, weekly interaction small multiples
- [ ] Sign-in with three roles
- [ ] Cohort upload with data quality report
- [ ] Dashboard
- [ ] Capacity planner
- [ ] Advisor worklist
- [ ] Student profile with reason codes, what-if, counterfactual, message template
- [ ] Intervention log
- [ ] Course insights
- [ ] Model and monitoring

## Do Not

- Commit `data/`, `.env`, `.env.local`, or any file with a real key. `SUPABASE_SERVICE_ROLE_KEY` exists only in the API environment.
- Read the session anywhere except through `web/lib/auth.ts`, or set a user's role from the frontend. Roles live in `app_metadata` (secret key only) and are copied into `profiles` by the `on_auth_user_created` trigger.
- Change the database outside a new file in `supabase/migrations/`. The owner applies migrations in the Supabase SQL Editor.
- Change preprocessing, model parameters, the threshold, or ML library versions without running the parity check and recording the result in `TODO.md`.
- Present a scenario, counterfactual, or effectiveness-weighted number without the scenario panel label from `DESIGN.md`.
- Use context features (demographics, module, registration, studied credits) as the reason for a recommended intervention.
- Use npm or yarn in `web/`, or pip directly in `api/`. Use pnpm and uv.
- Add LLM-generated text, an LMS integration, or real message sending. They are out of scope in `PRD.md`.

## Testing

- API: `uv run python -m pytest` from `api/`.
- Local API server: `uv run --env-file .env python -m uvicorn app.main:app --reload` from `api/`, then open `http://localhost:8000/docs`. `CORS_ORIGINS` (comma-separated) sets the allowed frontend origins; the default is `http://localhost:3000`.
- Model parity: `uv run python scripts/parity_check.py` from `api/`, following `skills/verify-model-parity/SKILL.md`.
- Frontend: no automated tests yet. Verify pages manually in a browser with each demo role.

Local frontend: `pnpm dev` from `web/`, then open `http://localhost:3000`. Pages that read the API need the local API on port 8000, or `API_URL` (server) and `NEXT_PUBLIC_API_URL` (browser uploads) in `web/.env.local`.

## Local Environment

Windows Smart App Control on the owner's machine blocks unsigned executables and DLLs. It blocks the uv-managed Python 3.12, the pandas 3.1.0 wheel, and the `pytest.exe` launcher. Use the python.org Python 3.13 (`api/.python-version`) and run tools as `uv run python -m <tool>`.

## Build

- Frontend: `pnpm build` and `pnpm lint` from `web/`. A successful build reports zero TypeScript errors, prerenders the static pages, and lists `/mahasiswa/[id]` as Partial Prerender.
- API: `docker build -t lentera-api api/` succeeds and the container answers `GET /health`.

## Git Rules

After finishing code changes, summarize the result and provide Git commands in the response. The user runs `git add`, `git commit`, and `git push` themselves. Claude Code leaves staging, commits, and pushes to the user, including through other tools.

Provide the commands in this order, with values that match the task.

1. `git add -- <changed-file-path>` for the files related to the task.
2. `git diff --cached` to review the staged changes.
3. `git commit -m "<commit-message>"` with a message that says what changed and why.
4. `git push origin main`, or the feature branch in use.
