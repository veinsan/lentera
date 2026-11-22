# Project Tasks

| ID | Task | Status | Next step or verification |
| --- | --- | --- | --- |
| DOC-01 | Project documents (PRD, ARCHITECTURE, DESIGN, CLAUDE, WORKFLOW, TODO, skill, README) | In progress | Owner reviews the pending lines in each document. |
| DEC-01 | Confirm product name "Lentera" | Pending | Owner decides. |
| DEC-02 | Confirm final-round presentation date | Pending | Owner provides the date; it sets the build deadline. |
| DEC-03 | Confirm pnpm for `web/` | Pending | Owner decides. uv is in use for `api/`. |
| DEC-04 | Confirm Azure subscription type and Container Apps | Pending | Owner checks the Azure account. |
| DEC-05 | Confirm playbook minutes, effectiveness defaults, tier cutoffs 0.6 and 0.85, low-score cutoff 60, and scenario levers | Pending | Owner reviews `PRD.md` section 5.1 and `ARCHITECTURE.md` scenarios. |
| DEC-06 | Confirm with the DSCO committee that a TypeScript frontend is acceptable | Pending | Owner asks the committee. |
| DEC-07 | Confirm design tokens | Pending | Owner reviews `DESIGN.md`. |
| S-01 | Scaffold `web/` and `api/` | In progress | `api/` has `pyproject.toml`, uv env on Python 3.13, and pytest (3 passed). `web/` waits for DEC-03; FastAPI `/health` is part of API-01. |
| S-02 | Supabase project, schema, RLS | Pending | Owner creates the Supabase project and shares the URL and keys through `.env.local`. |
| ML-01 | Port `clean_rank` preprocessing with fit state | Done | `api/app/pipeline/features.py` output equals DSCO `FoldFeatures("clean_rank").transform(..., "cat")` with `assert_frame_equal` on train (26,086 x 77) and test (6,502 x 77). Single-row scoring equals batch scoring (pytest). |
| ML-02 | Train final model and write artifacts | Done | `uv run python scripts/train.py` writes `model.cbm`, `fit_state.json`, `model_meta.json` in 46 s; `train.csv` SHA256 matches the DSCO experiment summary. |
| ML-03 | Parity check against the submitted predictions | Done | 6,502 of 6,502 labels match `dsco/outputs/final/submission.csv`; maximum probability difference 1.1e-16; 3,875 flagged; 179 rows within 0.01 of the threshold. |
| ML-04 | Build `model_card.json` and `insights.json` | Pending | None |
| ML-05 | SHAP reason codes | Pending | None |
| ML-06 | Tier, uncertain band, archetype, playbook rules | Pending | None |
| ML-07 | Scenario levers and counterfactual | Pending | None |
| ML-08 | Capacity planner | Pending | None |
| API-01 | Health, model, insights endpoints | Pending | None |
| API-02 | JWT verification and roles | Pending | None |
| API-03 | Cohort validation and scoring | Pending | None |
| API-04 | Simulate and counterfactual endpoints | Pending | None |
| API-05 | Plan endpoints | Pending | None |
| API-06 | Drift report | Pending | None |
| API-07 | Request logging | Pending | None |
| API-08 | Dockerfile and tests | Pending | None |
| API-09 | GitHub Actions deploy to Azure | Pending | Depends on DEC-04. |
| W-01 | Design tokens and app shell | Pending | None |
| W-02 | Sign-in and role-aware layout | Pending | None |
| W-03 | Cohort upload page | Pending | None |
| W-04 | Dashboard | Pending | None |
| W-05 | Capacity planner page | Pending | None |
| W-06 | Advisor worklist | Pending | None |
| W-07 | Student profile | Pending | None |
| W-08 | Intervention log | Pending | None |
| W-09 | Course insights page | Pending | None |
| W-10 | Model and monitoring page | Pending | None |
| W-11 | Vercel deployment | Pending | None |
| D-01 | Demo accounts and demo cohort | Pending | None |
| D-02 | Architecture diagram and demo script | Pending | None |
