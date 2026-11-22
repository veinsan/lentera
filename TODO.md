# Project Tasks

| ID | Task | Status | Next step or verification |
| --- | --- | --- | --- |
| DOC-01 | Project documents (PRD, ARCHITECTURE, DESIGN, CLAUDE, WORKFLOW, TODO, skill, README) | In progress | Owner reviews the pending lines in each document. |
| DEC-01 | Confirm product name "Lentera" | Pending | Owner decides. |
| DEC-02 | Confirm final-round presentation date | Pending | Owner provides the date; it sets the build deadline. |
| DEC-03 | Confirm pnpm for `web/` | Done | Owner chose pnpm. |
| DEC-04 | Confirm Azure subscription type and Container Apps | Pending | Owner checks the Azure account. |
| DEC-05 | Confirm playbook minutes, effectiveness defaults, tier cutoffs 0.6 and 0.85, low-score cutoff 60, and scenario levers | Pending | Owner reviews `PRD.md` section 5.1 and `ARCHITECTURE.md` scenarios. |
| DEC-06 | Confirm with the DSCO committee that a TypeScript frontend is acceptable | Pending | Owner asks the committee. |
| DEC-07 | Confirm design tokens | Pending | Owner reviews `DESIGN.md`. |
| DEC-08 | Private leaderboard F1 for the model card | Pending | `dsco/outputs/submissions/ledger.json` has `private_score` null; owner supplies the value and the ledger is updated before the model card is rebuilt. |
| S-01 | Scaffold `web/` and `api/` | Done | `web/`: Next.js 16.4.6 with pnpm, shadcn/ui; `pnpm build` and `pnpm lint` pass. `api/`: uv on Python 3.13; `/health` runs with uvicorn. |
| S-02 | Supabase project, schema, RLS | Pending | Owner creates the Supabase project and shares the URL and keys through `.env.local`. |
| ML-01 | Port `clean_rank` preprocessing with fit state | Done | `api/app/pipeline/features.py` output equals DSCO `FoldFeatures("clean_rank").transform(..., "cat")` with `assert_frame_equal` on train (26,086 x 77) and test (6,502 x 77). Single-row scoring equals batch scoring (pytest). |
| ML-02 | Train final model and write artifacts | Done | `uv run python scripts/train.py` writes `model.cbm`, `fit_state.json`, `model_meta.json` in 46 s; `train.csv` SHA256 matches the DSCO experiment summary. |
| ML-03 | Parity check against the submitted predictions | Done | 6,502 of 6,502 labels match `dsco/outputs/final/submission.csv`; maximum probability difference 1.1e-16; 3,875 flagged; 179 rows within 0.01 of the threshold. |
| ML-04 | Build `model_card.json` and `insights.json` | Done | `scripts/build_model_card.py` reproduces nested mean F1 0.773825, seed SD 0.000477, ECE 0.0075, public F1 0.78443, and the tier table in `PRD.md`. `scripts/build_insights.py` flags M07 (no graded work, AUC 0.696, 53.9% uncertain), M05 (no graded work), M03 and M06 (high base risk). |
| ML-05 | SHAP reason codes | Done | SHAP plus expected value equals the raw logit (max error 1.2e-14 on test); reasons for 6,502 rows take 3.8 s; pytest covers additivity and placeholder folding. |
| ML-06 | Tier, uncertain band, archetype, playbook rules | Done | Archetype counts on `train.csv` equal `PRD.md` section 5.1; pytest covers every branch (12 tests pass in total). |
| ML-07 | Scenario levers and counterfactual | Done | `recompute_activity` reproduces the dataset aggregates (max error 5e-8); counterfactual for 3,875 flagged test students in 0.57 s; pytest covers lever consistency, submit scope, and the counterfactual contract. |
| ML-08 | Capacity planner | Done | Plan plus reach curve for the test cohort in 0.09 s; pytest checks capacity, reach equal to summed probabilities, automated assignment, scenario labeling, and override validation (27 tests pass in total). |
| API-01 | Health, model, insights endpoints | Done | `api/app/main.py` loads artifacts once at startup; live server answered `/health`, `/model` (20 KB, 10 ms), `/insights` (6 KB, 3 ms), `/docs` with 200; pytest checks contents and CORS (31 tests pass in total). Sign-in for `/model` and `/insights` and request statistics in `/model` arrive with API-02 and API-07. |
| API-02 | JWT verification and roles | Pending | None |
| API-03 | Cohort validation and scoring | Pending | None |
| API-04 | Simulate and counterfactual endpoints | Pending | None |
| API-05 | Plan endpoints | Pending | None |
| API-06 | Drift report | Pending | None |
| API-07 | Request logging | Pending | None |
| API-08 | Dockerfile and tests | Pending | None |
| API-09 | GitHub Actions deploy to Azure | Pending | Depends on DEC-04. |
| W-01 | Design tokens and app shell | Done | Tokens in `web/app/globals.css`; sidebar with six routes, active state (student profile highlights Daftar Prioritas), Plus Jakarta Sans and JetBrains Mono. Checked in the browser at 1280 px: redirect `/` to `/dashboard`, client navigation, no console errors. |
| W-02 | Sign-in and role-aware layout | Pending | None |
| W-03 | Cohort upload page | Pending | None |
| W-04 | Dashboard | Pending | None |
| W-05 | Capacity planner page | Pending | None |
| W-06 | Advisor worklist | Pending | None |
| W-07 | Student profile | Pending | None |
| W-08 | Intervention log | Pending | None |
| W-09 | Course insights page | Done | Renders `insights.json` from the API: risk heatmap, per-module metrics with warnings, recommendations, weekly small multiples on a shared axis. Checked at 1440 px with the local API; error state shown when the API is down. |
| W-10 | Model and monitoring page | In progress | Model card sections, fairness tabs, and charts render from `/model` and were checked at 1440 px. Chart palette and tier ramp pass the dataviz validator. Drift and request statistics wait for API-06 and API-07. |
| W-11 | Vercel deployment | Pending | None |
| D-01 | Demo accounts and demo cohort | Pending | None |
| D-02 | Architecture diagram and demo script | Pending | None |
