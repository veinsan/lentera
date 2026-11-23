# CLAUDE.md: Lentera

Lentera deploys the DSCO 2026 at-risk model as a web app. Advisors, course coordinators, and academic leaders use it at the week 4 cutoff to plan interventions from model predictions.

## Documents

Every project document lives in `docs/`. This file holds the working rules and points there; read the document that matches the task before changing code.

| Document | Read it for |
| --- | --- |
| `docs/PRD.md` | Scope, users, decision rules, acceptance criteria, and what is out of scope |
| `docs/ARCHITECTURE.md` | The system, its components, and the step plan with completion criteria |
| `docs/DESIGN.md` | Design tokens, components, and visual rules (change it together with `web/app/globals.css`) |
| `docs/PRODUCT.md` | Product truth for design work: audience, promise, and voice |
| `docs/WORKFLOW.md` | How to work: when to proceed, when to ask, how to verify |
| `docs/TODO.md` | Current status of every step and decision, with verification evidence |

`docs/session-summary.md` is a local handoff note between chat sessions; it is gitignored and may be out of date, so the documents above win.

## Tech Stack

| Tool | Version or role |
| --- | --- |
| Next.js | 16.4.6, App Router, Turbopack, Cache Components and Partial Prefetching on (`web/next.config.ts`) |
| React | 19.3.0 |
| TypeScript | 5.9, strict mode |
| Tailwind CSS | 4.3.3, configured in CSS (`web/app/globals.css`), no `tailwind.config` file |
| HeroUI | 3.2.7 (`@heroui/react`, `@heroui/styles`) on React Aria Components 1.22; themed through its CSS variables in `web/app/globals.css`; class merging through the `cn` package (`web/lib/utils.ts`) |
| Motion | 14.14 (`motion/react`): route enter animation, nav indicator, backdrop parallax |
| three.js / React Three Fiber | three 0.187, `@react-three/fiber` 9.8, `@react-three/drei` 10.7: the cohort sky in `web/components/sky/` |
| NumberFlow | `@number-flow/react` 0.6: numbers that roll when they change (`Num` in `web/components/domain/stat.tsx`) |
| cmdk | 1.1: the command palette (Ctrl/Cmd+K) |
| Fonts | Google Sans Flex (display and UI, axes opsz, wdth, ROND) and Google Sans Code (IDs) through `next/font/google` |
| lucide-react | Icons |
| Recharts | 3.11, charts in `web/components/charts/` |
| `@supabase/ssr`, `@supabase/supabase-js` | Auth and database access from the frontend |
| PyJWT (crypto) | API verification of Supabase ES256 access tokens against the project JWKS |
| pnpm | 12.18, frontend package manager |
| Python | 3.13 (python.org build; see Local Environment) |
| FastAPI | API service |
| lightgbm | 4.6.0; the DAE-MLP half of the model runs in numpy |
| torch | 2.15.0 CPU, training only (`uv run --frozen --with torch==2.15.0`), not in the API image |
| pandas | 3.1.1 |
| numpy | 2.5.4 |
| scikit-learn | 1.9.1 |
| uv | Python package manager for `api/` |
| pytest | API tests, run as `uv run python -m pytest` |
| Supabase | Postgres, Auth, RLS, Storage |
| Vercel | Frontend hosting |
| Azure Container Apps | API hosting, image from `ghcr.io` |

The served model is the DSCO final notebook `dsco/notebooks/dsco_lgbm_dae_pair_final.ipynb` (LightGBM and DAE-MLP, logits averaged), retrained on CPU by `api/scripts/train.py`. The parity check passed on 2026-11-23: the 198 LightGBM features of `test.csv` equal the notebook's, LightGBM probabilities are identical, the numpy DAE-MLP differs from torch by at most 1.2e-7, and 6,502 of 6,502 labels reproduce the training run. Changing preprocessing, parameters, or versions can change probabilities near the threshold, so a version change requires a new parity check (`skills/verify-model-parity/SKILL.md`).

## Design System

`docs/DESIGN.md` holds the tokens. `web/app/globals.css` defines them as CSS variables in `:root`, sets HeroUI's own variables from them (`--background`, `--surface`, `--accent`, `--muted` is a text colour in HeroUI), and maps them to Tailwind utility names in the `@theme inline` block. Change a token in `docs/DESIGN.md` and `globals.css` together. Liquid glass (`glass`, `glass-night`, `glass-lens` utilities) is for the navigation layer only; content sits on solid `plate` surfaces. Tier and chart colours were checked with the dataviz palette validator; re-run it before changing them. Fonts load through `next/font/google` in `web/app/layout.tsx`.

## Project Structure

```text
docs/                      Project documents (see Documents above)
web/
  app/
    page.tsx               Public landing page (static; numbers from lib/generated/landing.json)
    (auth)/login/          One-click demo sign-in (role cards, Alt+1/2/3)
    demo/[role]/           Presenter deep link that signs in as a demo role
    (app)/                 Pages behind sign-in, sharing the glass sidebar layout
      @panel/(.)mahasiswa/[id]/  Intercepted student profile, shown as a side sheet over the current page
      dashboard/           X-Ray kohort: the 3D cohort sky, KPIs, capacity glance, archetype and module tables
      rencana/             Capacity planner and the advisor board
      prioritas/           Advisor worklist (rows open the student side sheet)
      mahasiswa/[id]/      Student profile as a full page (direct link or refresh)
      insight/             Course insights
      unggah/              Cohort upload and end-of-semester outcome upload
      model/               Model and monitoring (tabs: model card, test cohort, final outcomes, fairness, drift, API health)
  components/
    ui/                    DataTable (HeroUI table from column definitions) and LinkButton
    brand/                 Lantern mark and wordmark, liquid lens SVG filter
    sky/                   The React Three Fiber constellation and its client-only loader
    layout/                Sidebar, phone nav, command palette, page header, atlas backdrop
    charts/                Recharts wrappers that apply chart tokens, plus the HTML heatmap and segmented bar
    domain/                Section, stat, tier badge, archetype chip, student profile and panel, planner, upload, monitoring, outcome evaluation and impact
  lib/
    nav.ts                 Sidebar items and presenter shortcuts (1 to 6)
    landing.ts             Typed view of generated/landing.json (api/scripts/build_landing.py)
    sky.ts                 Cohort sky shape and the night tier colours
    utils.ts               cn() class merging
    auth.ts                getCurrentUser() and requireRole(): the data access layer for the session
    supabase/              Browser and server Supabase clients
    api.ts                 Typed client for the FastAPI service (`API_URL`, server-side only)
    api-browser.ts         File uploads from the browser to the API with the user's token (`NEXT_PUBLIC_API_URL`)
    labels.ts              Indonesian labels for archetypes, playbook actions, and contact status
    data.ts                Supabase reads for the latest cohort, all its predictions (parallel pages of 1,000), and the worklist
    worklist-params.ts     Worklist filter whitelist and URL query helpers (client-safe, no server imports)
    format.ts              Number and probability formatting (id-ID, decimal comma)
  proxy.ts                 Session refresh and the sign-in redirect for app routes (Next.js 16 name for middleware)
api/
  app/
    main.py                FastAPI app, routers, CORS
    auth.py                Supabase JWT verification and role checks
    pipeline/              Notebook features and the cohort ranking context (dsco_lgbm_dae_pair_final.ipynb)
    explain.py             SHAP and reason codes
    rules.py               Tier, uncertain band, archetype, playbook
    scenarios.py           Levers, what-if, counterfactual
    planner.py             Capacity planner
    drift.py               PSI against the training data
    evaluation.py          Predictions against real outcomes (test cohort outcomes, uploaded outcome files)
    monitoring.py          Request statistics from request_log
  artifacts/               Model and generated JSON, committed
  scripts/                 Offline training and artifact builders
  tests/
supabase/migrations/       Schema and RLS, applied in order by the owner in the SQL Editor
infra/                     Azure setup script
skills/                    Project skills
.impeccable/               Design direction contracts (surfaces/) and design.json; mocks and review captures stay local
data/                      Local only, gitignored
```

## Code Conventions

- TypeScript strict mode, no `any`. Functional components with typed props.
- Next.js 16 differs from older versions. Before writing Next.js code, read the relevant guide in `web/node_modules/next/dist/docs/` (`web/AGENTS.md`, which `next dev` re-adds; commit it).
- `web/lib/supabase/server.ts` calls `connection()` before reading cookies, because supabase-js reads `Date.now()` while loading the session and Cache Components rejects that during prerendering.
- Cache Components is on: wrap uncached data reads, `cookies()`, `headers()`, `searchParams`, and awaited dynamic `params` in `<Suspense>`. Client components that call `usePathname` in a shared layout also sit inside `<Suspense>` (see `web/components/layout/sidebar.tsx`).
- Use the `@/` import alias for `web/`.
- Supabase returns at most 1,000 rows per request. Page with `.range()`; `getCohortPredictions` in `web/lib/data.ts` fetches the pages in parallel.
- Modules imported by client components must not import `web/lib/data.ts` or `web/lib/supabase/server.ts`, which depend on `next/headers`.
- HeroUI compound components (`Table.Row`, `Select.Trigger`) work in client components only. A server component cannot dot into a client module: use the named parts (`TableRoot`, `TableRow`) as `web/components/ui/data-table.tsx` does, or wrap the kit in a small client component.
- Do not use `next/dynamic` with `ssr: false` inside a streamed Suspense boundary (it broke React's streaming in dev). Load client-only code with `React.lazy` after mount, as `web/components/sky/sky-stage.tsx` does.
- Entrance motion never hides content on first paint: CSS `rise`/`reveal` animations from a visible default, and the route template animates only in-app navigations. Every animation has a `prefers-reduced-motion` path. Ancestors of a `.reveal` use `overflow-clip`, never `overflow-hidden`: `view()` binds to the nearest scroll container, and the reveal then freezes half transparent and blurred.
- Fetch Supabase data in server components where possible. Call the API through `web/lib/api.ts` only. It returns `{ ok, data }` or `{ ok: false, error }` instead of throwing, and calls `unstable_rethrow` so Next.js prerender signals pass through; pages render `ApiError` on failure.
- Charts follow the dataviz rules: categorical and ordinal colors come only from validated tokens, 2px lines, bars at most 24px with 4px rounded ends, solid hairline grids, a legend for two or more series, a hover tooltip with the value first, and no dual axes.
- Format probabilities and counts through `web/lib/format.ts` so every page shows them the same way.
- Python: type hints on public functions, pydantic models for request and response bodies.
- Keep `api/app/rules.py`, `scenarios.py`, and `planner.py` free of I/O so they are unit-testable.
- Thresholds and tier cutoffs live in one place, `api/app/rules.py`, and reach the frontend through API responses or stored predictions. The frontend never hardcodes 0.387, 0.6, or 0.85.
- Every number shown in the interface comes from an artifact or a query. Do not type metrics into components or copy.
- Interface text is Indonesian. Code, comments, and documents are English.
- If an instruction is ambiguous, ask what it means before coding.

## Features

The planned pages and their steps are in `docs/ARCHITECTURE.md`.

- [x] Model artifacts and parity check (`api/artifacts/`, `api/scripts/parity_check.py`)
- [x] Reason codes, decision rules, scenarios, counterfactual, and capacity planner in `api/app/` (no endpoints yet)
- [x] API endpoints `GET /health`, `/model`, `/insights` (no sign-in yet)
- [x] App shell: sidebar navigation, page headers, and empty states for every page
- [x] Supabase schema with RLS (`supabase/migrations/0001_init.sql`), demo accounts (`api/scripts/seed_demo_users.py`)
- [x] One-click demo sign-in (no email or password; `DEMO_PASSWORD` stays on the web server), role switch in the rail, role-filtered navigation, role gate for coordinator and admin pages; API token verification
- [x] Cohort upload: data quality gate, scoring with reason codes, storage in Supabase, upload page with report and summary
- [x] Dashboard for the latest cohort and the advisor worklist with filters, pagination, and CSV export (`/prioritas/export`)
- [x] Student profile: reason codes, scenario panel (what-if and counterfactual), message template, weekly chart, intervention log and history
- [x] Capacity planner: advisor capacity inputs, live preview, reach curve, allocation table, editable playbook assumptions with scenario labeling, saved plans
- [x] Model & Monitoring page: KPIs, 5-fold cross-validation, model components (LightGBM, DAE-MLP, blend), calibration, capacity curve, tiers, segment and module reliability, signal importance, fairness, artifacts, drift report (PSI per feature and probability distribution), API health (requests, errors, latency per endpoint)
- [x] Insight Course page: risk heatmap, per-module metrics, recommendations, weekly interaction small multiples
- [x] Drift report stored per scored cohort (`api/app/drift.py`) and request logging middleware with `GET /monitoring/requests`
- [x] Deployment: API on Azure Container Apps through GitHub Actions, web on Vercel (see Production)
- [x] Evaluation against real outcomes: the DSCO test cohort's final outcomes (`scripts/build_test_evaluation.py`, Kohort uji tab, landing proof rows) and outcome upload per cohort (`POST /cohorts/{id}/outcomes`, Hasil akhir tab) that first estimates the impact of advisor contacts (flagged contacted vs not contacted, observed against the calibrated expectation, labelled as an observational estimate) and then the model's accuracy; only aggregates are stored
- [x] Star atlas redesign: public landing page (cohort sky, four stages, safety, proof, role entry), liquid glass shell, X-Ray dashboard with the 3D cohort sky, student side sheet over the worklist, command palette, HeroUI kit; landing numbers from `api/scripts/build_landing.py`

## Do Not

- Commit `data/`, `.env`, `.env.local`, or any file with a real key. `SUPABASE_SERVICE_ROLE_KEY` exists only in the API environment.
- Read the session anywhere except through `web/lib/auth.ts`, or set a user's role from the frontend. Roles live in `app_metadata` (secret key only) and are copied into `profiles` by the `on_auth_user_created` trigger.
- Change the database outside a new file in `supabase/migrations/`. The owner applies migrations in the Supabase SQL Editor.
- Change preprocessing, model parameters, the threshold, or ML library versions without running the parity check and recording the result in `docs/TODO.md`.
- Present a scenario, counterfactual, or effectiveness-weighted number without the scenario panel label from `docs/DESIGN.md`.
- Use context features (demographics, module, registration, studied credits) as the reason for a recommended intervention.
- Use npm or yarn in `web/`, or pip directly in `api/`. Use pnpm and uv.
- Add LLM-generated text, an LMS integration, or real message sending. They are out of scope in `docs/PRD.md`.

## Testing

- API: `uv run python -m pytest` from `api/`.
- Local API server: `uv run --env-file .env python -m uvicorn app.main:app --reload` from `api/`, then open `http://localhost:8000/docs`. `CORS_ORIGINS` (comma-separated) sets the allowed frontend origins; the default is `http://localhost:3000`.
- Model training: `uv run --frozen --with torch==2.15.0 python scripts/train.py` from `api/` (about 2 hours on CPU, mostly the DAE), then `uv run --frozen python scripts/train.py --finalize` for the threshold. Keep `--frozen`: `uv run` with resolver options such as `--exclude-newer` re-locks the project and downgrades packages.
- Model parity: `uv run python scripts/parity_check.py` from `api/`, following `skills/verify-model-parity/SKILL.md`.
- Frontend: no automated tests yet. Verify pages manually in a browser with each demo role. The owner works in Orca: use its embedded browser through the `orca` CLI (`orca tab create`, `orca screenshot --page <id>`), not Chrome. Start dev servers outside the Claude Code sandbox, or the browser cannot reach them.
- Test cohort evaluation: `uv run python scripts/build_test_evaluation.py` from `api/` reads `data/test_outcomes.csv` and rewrites `api/artifacts/test_evaluation.json`; rerun `build_landing.py` after it. The threshold was chosen before these outcomes were used: never tune, retrain, or pick features on them.
- Landing data: `uv run python scripts/build_landing.py` from `api/` rewrites `web/lib/generated/landing.json` from `data/test.csv`, the model, the planner, and `artifacts/model_card.json`. Rerun it after any artifact change. Kaggle scores live in `api/artifacts/kaggle_submissions.csv` (Kaggle CLI export) and reach the model card through `scripts/build_model_card.py`.

Local frontend: `pnpm dev` from `web/`, then open `http://localhost:3000`. Port 3000 is often taken by another project on the owner's machine; then run `pnpm dev --port 3001` and start the API with `CORS_ORIGINS=http://localhost:3000,http://localhost:3001`. The web defaults to `http://127.0.0.1:8000` for the API, because `localhost` on Windows tries IPv6 first and adds about 2 s per call. Pages that read the API need the local API on port 8000, or `API_URL` (server) and `NEXT_PUBLIC_API_URL` (browser uploads) in `web/.env.local`.

## Local Environment

Windows Smart App Control on the owner's machine blocks unsigned executables and DLLs. It blocks the uv-managed Python 3.12, the pandas 3.1.0 wheel, and the `pytest.exe` launcher. Use the python.org Python 3.13 (`api/.python-version`) and run tools as `uv run python -m <tool>`.

## Production

- Web: `https://lentera-khaki.vercel.app` (Vercel project `lentera`, root `web`, functions in `sin1`). A push to `main` deploys it through the Vercel GitHub integration. `.vercelignore` keeps `data/`, `api/`, and env files out of CLI uploads; its patterns start with `/` because a bare `supabase` also matches `web/lib/supabase`.
- API: `https://lentera-api.delightfulforest-3e8ecdc4.malaysiawest.azurecontainerapps.io` (Azure for Students, resource group `lentera-rg`, region `malaysiawest`, 1 vCPU, 2 GiB, scale 0 to 1). The `api` workflow deploys it with OIDC; the federated credential subject uses GitHub's id form `repo:veinsan@157286510/lentera@1467677443:ref:refs/heads/main`, and the name-only form fails with AADSTS700213. The environment is an express environment: it rejects `--revision-suffix` and keeps one revision named `lentera-api--latest`. Secrets live in the Container App; `CORS_ORIGINS` lists the Vercel domain and the local ports.
- Azure CLI is installed but not on the shell PATH here: call `C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd`. The active `gh` account is not `veinsan`; use `GH_TOKEN=$(gh auth token --user veinsan)` for one command instead of switching accounts.
- Piping values into `vercel env add` from Windows PowerShell 5.1 prepends a UTF-8 BOM. Pipe from Bash into `node <npm>/vercel/dist/vc.js` instead and check the pulled value byte for byte.

## Visual World

The design follows the direction contracts in `.impeccable/surfaces/web-app.md` (app) and `.impeccable/surfaces/web-app-page-tsx.md` (landing): a star atlas. Every student is a star whose size and warmth is their risk, archetypes are constellations; liquid glass is the navigation layer over a generated blue atlas plate (`web/public/atlas/`, Figma AI, provenance in the `.json` sidecars); one committed blue for actions; warm hues for risk tiers only, always labelled; Google Sans Flex and Google Sans Code. Product truth for design work is `docs/PRODUCT.md`. Each page title is the screen's finding as one sentence; no eyebrow or kicker above a heading. `docs/DESIGN.md` is written from the built world.

## Build

- Frontend: `pnpm build` and `pnpm lint` from `web/`. A successful build reports zero TypeScript errors, prerenders the static pages, and lists `/mahasiswa/[id]` as Partial Prerender.
- API: Docker is not installed on the owner's machine; the `api` workflow builds the image and checks `GET /health` in the container.

## Git Rules

After finishing code changes, summarize the result and provide Git commands in the response. The user runs `git add`, `git commit`, and `git push` themselves. Claude Code leaves staging, commits, and pushes to the user, including through other tools.

Provide the commands in this order, with values that match the task.

1. `git add -- <changed-file-path>` for the files related to the task.
2. `git diff --cached` to review the staged changes.
3. `git commit -m "<commit-message>"` with a message that says what changed and why.
4. `git push origin main`, or the feature branch in use.
