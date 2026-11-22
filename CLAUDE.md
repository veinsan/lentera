# CLAUDE.md: Lentera

Lentera deploys the DSCO 2026 at-risk model as a web app. Advisors, course coordinators, and academic leaders use it at the week 4 cutoff to plan interventions from model predictions. Read `PRD.md` for scope, `ARCHITECTURE.md` for the system and the step plan, `DESIGN.md` for visual rules, `WORKFLOW.md` for working rules, and `TODO.md` for current status.

## Tech Stack

| Tool | Version or role |
| --- | --- |
| Next.js | App Router, TypeScript strict mode. Pending: record the exact version after S-01. |
| Tailwind CSS | Styling, with tokens from `DESIGN.md` as CSS variables |
| shadcn/ui | Base components, copied into `web/components/ui/` |
| Recharts | Charts |
| `@supabase/ssr`, `@supabase/supabase-js` | Auth and database access from the frontend |
| pnpm | Frontend package manager (pending owner confirmation) |
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

`DESIGN.md` holds the tokens. `web/app/globals.css` defines them as CSS variables, and `web/tailwind.config.ts` (or the Tailwind theme block, depending on the scaffolded Tailwind version) maps them to utility names. Change a token in all three places together.

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
    charts/                Recharts wrappers that apply chart tokens
    domain/                Tier badge, archetype chip, scenario panel, reason list
  lib/
    supabase/              Browser and server Supabase clients
    api.ts                 Typed client for the FastAPI service
    format.ts              Number and probability formatting
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
- Use the `@/` import alias for `web/`.
- Fetch Supabase data in server components where possible. Call the API through `web/lib/api.ts` only.
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
- Change preprocessing, model parameters, the threshold, or ML library versions without running the parity check and recording the result in `TODO.md`.
- Present a scenario, counterfactual, or effectiveness-weighted number without the scenario panel label from `DESIGN.md`.
- Use context features (demographics, module, registration, studied credits) as the reason for a recommended intervention.
- Use npm or yarn in `web/`, or pip directly in `api/`. Use pnpm and uv.
- Add LLM-generated text, an LMS integration, or real message sending. They are out of scope in `PRD.md`.

## Testing

- API: `uv run python -m pytest` from `api/`.
- Model parity: `uv run python scripts/parity_check.py` from `api/`, following `skills/verify-model-parity/SKILL.md`.
- Frontend: no automated tests yet. Verify pages manually in a browser with each demo role.

Pending: confirm the frontend commands after S-01.

## Local Environment

Windows Smart App Control on the owner's machine blocks unsigned executables and DLLs. It blocks the uv-managed Python 3.12, the pandas 3.1.0 wheel, and the `pytest.exe` launcher. Use the python.org Python 3.13 (`api/.python-version`) and run tools as `uv run python -m <tool>`.

## Build

- Frontend: `pnpm build` from `web/` compiles with zero TypeScript errors.
- API: `docker build -t lentera-api api/` succeeds and the container answers `GET /health`.

## Git Rules

After finishing code changes, summarize the result and provide Git commands in the response. The user runs `git add`, `git commit`, and `git push` themselves. Claude Code leaves staging, commits, and pushes to the user, including through other tools.

Provide the commands in this order, with values that match the task.

1. `git add -- <changed-file-path>` for the files related to the task.
2. `git diff --cached` to review the staged changes.
3. `git commit -m "<commit-message>"` with a message that says what changed and why.
4. `git push origin main`, or the feature branch in use.
