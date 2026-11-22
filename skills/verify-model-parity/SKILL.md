---
name: verify-model-parity
description: Use after any change to preprocessing, model parameters, the threshold, ML library versions, or model artifacts, and before reporting a number from the model in the app or the final presentation.
---

# Verify Model Parity

The deployed model must reproduce the DSCO submission and every displayed metric must trace to an artifact.

## Inputs

- `data/train.csv` and `data/test.csv`, copied locally from `dsco/data/`.
- `api/artifacts/model.cbm`, `api/artifacts/fit_state.json`, `api/artifacts/model_card.json`.
- Reference files in the DSCO workspace: `dsco/outputs/final/submission.csv` (SHA256 `7e36b66a4e94eb846e83afa3a48ab3e36388bc61fffc9437457be020d4838c66`) and `dsco/outputs/final/test_probabilities.csv`.

## Procedure

1. From `api/`, run `uv run python scripts/parity_check.py`. Pending: confirm the command once ML-03 exists.
2. Read its output and confirm:
   - 6,502 of 6,502 test labels equal the reference submission at threshold 0.375.
   - The maximum absolute probability difference against the reference probabilities. Report the value; any label mismatch is a failure.
   - The installed versions of catboost, pandas, numpy, and scikit-learn equal those in `CLAUDE.md`.
3. Compare `api/artifacts/model_card.json` with `dsco/docs/presentation.md`: nested F1 per seed (0.773766, 0.774437, 0.773273), mean 0.773825, seed SD 0.000477, threshold 0.375, public F1 0.78443.
4. When the change touches a page or slide that shows numbers, search the changed frontend files for numeric literals and confirm each displayed metric comes from an artifact or a query.

## Output

Report the command, the label match count, the maximum probability difference, the library versions, and any metric that does not match its source, with file references. Record the result in the relevant `TODO.md` row. A label mismatch blocks the step.
