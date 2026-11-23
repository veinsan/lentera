-- Real outcomes of a scored cohort, uploaded after the semester through POST /cohorts/{id}/outcomes.
-- Aggregates only (metrics, calibration, tiers, archetypes, capacity, planner check); per-student labels are never
-- stored, so the advisor workflow cannot depend on an outcome that is unknown at the week 4 cutoff.
-- Written by the API with the secret key; readable like the rest of the cohort row.
alter table public.cohorts add column if not exists outcome_report jsonb;
