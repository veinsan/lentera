# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: DSCO 2026 final-round judges**, watching a presenter drive the live demo on stage, and opening the deployed site themselves afterwards. They must understand in seconds what the model found, why it can be trusted, and what an institution should do on Monday. (Confirmed by the owner, 2026-11-23.)
- **Personas the demo plays**, each one click away: course coordinator (uploads the week 4 cohort, plans advisor capacity, reads course insights), student success advisor (works a prioritized list for the modules assigned, opens a student, logs a contact), and admin. They are demo roles, not daily users of a real institution.

## Product Purpose

Lentera turns the DSCO 2026 week 4 at-risk predictions into decisions: which students to contact first, which intervention each one gets, how many advisor hours reach how many at-risk students, and what to change in course design. Success is a judge leaving convinced on all three judging aspects: model analysis and justification (40%), prescriptive insight (35%), and presentation and visualization (25%).

## Positioning

A probability per student is what every entry produces. Lentera's mechanism is prescriptive and capacity-aware: calibrated probabilities (ECE 0.0075) let it count expected at-risk students reached per advisor hour, archetypes route each flagged student to a different action, SHAP reasons separate actionable signals from context, and a counterfactual shows the behavior change that would move a student below the threshold. The deployed model reproduces its own Kaggle submission of 31 October exactly (6,502 of 6,502 rows; public 0.78443, private 0.77775). The team's selected leaderboard submission is a different file (public 0.80150, private 0.79363); the interface labels the two separately.

## Operating Context

- A presenter drives the demo on a laptop and projector, in a timed final-round slot; judges may later open the URL on their own devices.
- Sign-in is one click: the visitor picks a demo role card and presses one button, as in the owner's proofskill and SafeTrip projects. A server route holds the shared demo password; no typing of email or password. Presenter shortcuts (Alt plus a letter) pick a role. (Confirmed by the owner, 2026-11-23.)
- The demo is not a daily production system; writes (uploads, intervention logs, saved plans) are allowed for the demo roles, with the demo cohort kept as the default view.

## Capabilities and Constraints

- Public landing page at `/`: what Lentera does, how it works in four stages, safety facts, model proof, and one-click entry to the demo roles.
- Pages: dashboard (X-Ray kohort), capacity planner (Rencana Intervensi), advisor worklist (Daftar Prioritas), student profile with reason codes, what-if and counterfactual, message template and intervention log, course insights (Insight Course), cohort upload with data quality report, model and monitoring (model card, fairness, drift, API health).
- Roles change what is visible: the advisor sees modules M03 and M06 only (row level security), coordinator and admin see all modules and the planner and upload pages.
- Stack in place: Next.js 16 on Vercel (web), FastAPI with CatBoost on Azure Container Apps (API), Supabase Postgres with RLS and Auth.
- UI copy is Indonesian; documents are English.
- Every displayed number traces to a generated artifact or a database query; no number is typed by hand.

## Brand Commitments

- Name: Lentera (lantern). Owner decision DEC-01 still pending in `TODO.md`.

## Evidence on Hand

- `api/artifacts/model_card.json`: nested CV F1 0.7738 (SD 0.0005), Kaggle public 0.78443 and private 0.77775 for the deployed model, the selected submission's public 0.80150 and private 0.79363 (from `api/artifacts/kaggle_submissions.csv`), calibration, ablation, fairness, per-module metrics.
- `web/lib/generated/landing.json`: the public landing page's numbers and the demo cohort sky (no IDs), built by `api/scripts/build_landing.py`.
- `api/artifacts/insights.json`: course insights per module.
- Demo cohort "Kohort uji DSCO (test.csv)": 6,502 scored students in Supabase; DSCO competition data, anonymized numeric IDs, approved by the owner for public display (2026-11-23).
- Absent: real institution users, testimonials, measured intervention effects. Effectiveness values in the planner are assumptions and are labeled as scenarios, never as causal effects.

## Product Principles

1. Lead with the finding, then the proof: each screen opens with one sentence a judge can repeat.
2. Prescribe, not just predict: every risk number comes with an action, a cost in advisor time, or a lever.
3. Honest uncertainty: show where the model is weak (uncertain band, M07, hard segment) instead of hiding it.
4. One click to any moment of the demo: no typing, no dead ends, deep links for the presenter.

## Accessibility & Inclusion

Projector readability: large type and strong contrast for numbers read from the back of a room; identity never carried by color alone (risk tiers have labels and icons).
