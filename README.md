# Lentera

A web app that turns the DSCO 2026 week 4 at-risk predictions into intervention plans for student success advisors, course coordinators, and academic leaders.

## Problem Solved

At the week 4 cutoff, an institution knows which students the model flags but not whom to contact first with limited advisor hours, what each student needs, or what to change in the course. Lentera ranks students by calibrated probability, groups them into archetypes that map to specific interventions, explains each prediction with actionable signals, plans interventions within advisor capacity, and points coordinators to modules where week 4 data cannot separate at-risk students.

## Key Features

The model service reproduces the DSCO submission; the app features are planned. See `PRD.md` for scope and `TODO.md` for status.

- Upload a week 4 cohort CSV and review a data quality report before scoring.
- See the cohort's risk tiers, archetypes, and module by presentation risk heatmap.
- Plan interventions for a given number of advisors and hours, with the expected number of at-risk students reached.
- Work through a prioritized list of flagged students per module.
- Open a student profile with reason codes, a what-if simulator, a counterfactual target, and a message template.
- Log interventions and follow-ups.
- Read course design insights per module.
- Read the model card, fairness breakdown, drift report, and API monitoring.

## Screenshot or Demo

A screenshot or demo is not yet available.

## Tech Stack and Rationale

- **Next.js** for the dashboard frontend, hosted on Vercel.
- **FastAPI** for the Python model service, so inference uses the same Python code and library versions as the DSCO model. Hosted on Azure Container Apps from a GitHub Actions image.
- **CatBoost** is the DSCO competition model (nested CV F1 0.7738, public leaderboard F1 0.78443).
- **Supabase** for authentication, the Postgres database with row level security, and file storage.

## Installation and Setup

The competition data files go in `data/` locally and are not committed.

Frontend, from `web/`: install Node.js and pnpm, run `pnpm install`, then `pnpm dev` and open `http://localhost:3000`.

API and model, from the repository root:

1. Copy `train.csv`, `test.csv`, and `sample_submission.csv` into `data/`.
2. Install Python 3.13 and uv, then run `uv sync` in `api/`.
3. Retrain the model with `uv run python scripts/train.py` (optional; the artifacts are committed).
4. Check parity with the DSCO submission with `uv run python scripts/parity_check.py <path-to-dsco-workspace>`.
5. Rebuild the model card and course insights with `uv run python scripts/build_model_card.py <path-to-dsco-workspace>` and `uv run python scripts/build_insights.py <path-to-dsco-workspace>`.
6. Run the tests with `uv run python -m pytest`.
7. Start the API with `uv run python -m uvicorn app.main:app --reload` and open `http://localhost:8000/docs`.
