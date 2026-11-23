# Lentera

A web app that turns the DSCO 2026 week 4 at-risk predictions into intervention plans for student success advisors, course coordinators, and academic leaders.

## Problem Solved

At the week 4 cutoff, an institution knows which students the model flags but not whom to contact first with limited advisor hours, what each student needs, or what to change in the course. Lentera ranks students by calibrated probability, groups them into archetypes that map to specific interventions, explains each prediction with actionable signals, plans interventions within advisor capacity, and points coordinators to modules where week 4 data cannot separate at-risk students.

## Key Features

The model service runs the DSCO final model and every feature below is implemented. See `docs/PRD.md` for scope and `docs/TODO.md` for status.

- Upload a week 4 cohort CSV and review a data quality report before scoring.
- See the cohort's risk tiers, archetypes, and module by presentation risk heatmap.
- Plan interventions for a given number of advisors and hours, with the expected number of at-risk students reached.
- Work through a prioritized list of flagged students per module.
- Open a student profile with reason codes, a what-if simulator, a counterfactual target, and a message template.
- Log interventions and follow-ups.
- Read course design insights per module.
- Read the model card, fairness breakdown, drift report, and API monitoring.
- Check the served model against the final outcomes of the DSCO test cohort.
- After the semester, upload a cohort's final outcomes to estimate whether advisor contacts lowered failure, then check the model's accuracy.

## Live Demo

Open `https://lentera-khaki.vercel.app` and pick a demo role on the sign-in page; no password is needed. The coordinator sees every module, the advisor sees M03 and M06 only (row level security), and the admin sees everything including API health. Presenter links: `/demo/koordinator`, `/demo/konselor`, `/demo/admin`.

## Tech Stack and Rationale

- **Next.js** for the dashboard frontend, hosted on Vercel.
- **FastAPI** for the Python model service, so inference uses the same Python code and library versions as the DSCO model. Hosted on Azure Container Apps from a GitHub Actions image.
- **LightGBM and a denoising-autoencoder MLP** form the DSCO final model (5-fold CV F1 0.7758; Kaggle F1 0.80150 public, 0.79363 private). The API runs the MLP half in numpy, so the image needs no torch.
- **Supabase** for authentication, the Postgres database with row level security, and file storage.

## Documentation

The project documents live in `docs/`: `PRD.md` (scope and decision rules), `ARCHITECTURE.md` (system and step plan), `DESIGN.md` (design system), `PRODUCT.md` (product voice), `WORKFLOW.md` (working rules), and `TODO.md` (status with verification evidence). `CLAUDE.md` holds the coding rules for agents and points to them.

## Installation and Setup

The competition data files go in `data/` locally and are not committed. Copy `api/.env.example` to `api/.env` and `web/.env.example` to `web/.env.local`, then fill in the values; both templates list every variable with its purpose.

Database: create a Supabase project, run the files in `supabase/migrations/` in order in the SQL Editor, turn off new user sign-ups in Authentication, and create the demo accounts with `uv run --env-file .env python scripts/seed_demo_users.py` from `api/`.

Frontend, from `web/`: install Node.js and pnpm, run `pnpm install`, then `pnpm dev` and open `http://localhost:3000`.

API and model, from the repository root:

1. Copy `train.csv`, `test.csv`, and `sample_submission.csv` into `data/`.
2. Install Python 3.13 and uv, then run `uv sync` in `api/`.
3. Retrain the model with `uv run --frozen --with torch==2.15.0 python scripts/train.py`, then `uv run --frozen python scripts/train.py --finalize` (optional; the artifacts are committed, and training takes about 2 hours on CPU).
4. Check parity with the DSCO submission with `uv run python scripts/parity_check.py <path-to-dsco-workspace>`.
5. Rebuild the input schema with `uv run python scripts/build_input_schema.py`, and the model card and course insights with `uv run python scripts/build_model_card.py <path-to-dsco-workspace>` and `uv run python scripts/build_insights.py <path-to-dsco-workspace>`.
6. Rebuild the landing page numbers with `uv run python scripts/build_landing.py` after any artifact change.
7. Run the tests with `uv run python -m pytest`.
8. Start the API with `uv run --env-file .env python -m uvicorn app.main:app --reload` and open `http://localhost:8000/docs` (the deployed API hides the docs).

## Deployment

The API runs on Azure Container Apps and the web app on Vercel. Secrets go into Azure and Vercel settings, never into the repository.

API:

1. Push to `main`. The `api` workflow runs pytest, builds `api/Dockerfile`, checks `GET /health` in the container, and pushes `ghcr.io/veinsan/lentera-api` with the commit SHA and `latest` tags.
2. Create a GitHub classic token with only the `read:packages` scope. Container Apps uses it to pull the private image.
3. With `az login` done (locally or in Azure Cloud Shell), run `bash infra/azure-setup.sh`. It asks for `SUPABASE_URL`, the Supabase service role key, and the token, then creates the resource group, the Container Apps environment, the app in `malaysiawest` (1 vCPU, 2 GiB, scale 0 to 1), and an OIDC sign-in for GitHub Actions limited to the resource group.
4. Set the five repository variables the script prints (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`, `AZURE_CONTAINERAPP`). From then on, every push to `main` that touches `api/` deploys a new revision and checks that the public `/health` reports the new commit SHA.

Web:

1. Import `veinsan/lentera` in Vercel and set the root directory to `web`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and set both `API_URL` and `NEXT_PUBLIC_API_URL` to the Azure API URL.
3. After the first deploy, allow the Vercel origin on the API: `az containerapp update -n lentera-api -g lentera-rg --set-env-vars CORS_ORIGINS=https://<vercel-domain>`.

With scale to zero, the first request after an idle period waits for the container to start. Before a demo, keep one replica warm with `az containerapp update -n lentera-api -g lentera-rg --min-replicas 1`, and set it back to 0 afterwards.
