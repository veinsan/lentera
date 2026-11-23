---
name: verify-model-parity
description: Use after any change to preprocessing, model parameters, the threshold, ML library versions, or model artifacts, and before reporting a number from the model in the app or the final presentation.
---

# Verify Model Parity

The deployed model must reproduce the trained DSCO final model (`dsco/notebooks/dsco_lgbm_dae_pair_final.ipynb`, LightGBM + DAE-MLP) and every displayed metric must trace to an artifact.

## Inputs

- `data/train.csv`, `data/test.csv`, `data/sample_submission.csv`, copied locally from `dsco/data/`.
- `api/artifacts/lgbm.txt`, `dae_mlp.npz`, `fit_state.npz`, `fit_state.json`, `model_meta.json`, `model_card.json`.
- The training run's local outputs in `data/blend/`: `test_pred.csv` (torch probabilities), `features_test.pkl` (the notebook's features for test.csv), `labels.csv` (flags from `--finalize`), `oof.csv`.
- For information: the team's Kaggle submission of the notebook, `dsco/sub_v5.csv` (it ran on a GPU, so a CPU retrain matches it closely, not exactly).

## Procedure

1. After a retrain (`uv run --frozen --with torch==2.15.0 python scripts/train.py`, then `uv run python scripts/train.py --finalize`), copy the threshold that `--finalize` prints into `THRESHOLD` in `api/app/rules.py`.
2. From `api/`, run `uv run python scripts/parity_check.py`. It reads the DSCO workspace from `../../dsco` by default; pass another path as the first argument. Exit code 1 means an exact check failed.
3. Read its output and confirm:
   - `features_differ` is empty: all 198 LightGBM features of test.csv, ranked within train plus the cohort, equal the notebook's.
   - `dae_input_max_abs_diff` and `lightgbm_max_abs_diff` are 0.
   - `label_matches_finalize` is 6,502 of 6,502 and `threshold` equals `threshold_in_rules`.
   - Report `dae_mlp_max_abs_diff_vs_torch` (numpy against torch float32 kernels), `label_matches_torch_run`, and `label_matches_kaggle_sub_v5`.
   - The installed versions of lightgbm, pandas, numpy, scikit-learn, and scipy equal those in `CLAUDE.md` and `api/uv.lock`.
4. Rebuild the generated files in this order: `build_model_card.py`, `build_drift_reference.py`, `build_insights.py`, `build_landing.py`. Then run `uv run python -m pytest`.
5. When the change touches a page or slide that shows numbers, search the changed frontend files for numeric literals and confirm each displayed metric comes from an artifact or a query.

## Output

Report the commands, the exact-check results, the numpy-versus-torch difference, the agreement with `sub_v5.csv`, the library versions, and any metric that does not match its source, with file references. Record the result in the relevant `docs/TODO.md` row. A failed exact check blocks the step.
