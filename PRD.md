# PRD: Lentera

> **Status** Draft for owner review
> **Author** veinsan
> **Last updated** 2026-11-22

Lentera is the deployment of the DSCO 2026 at-risk model as a web app. Student success advisors, course coordinators, and academic leaders use it at the week 4 cutoff of a course presentation to decide which students to contact, which intervention each student gets, and what to change in the course design.

Pending: the owner confirms the product name "Lentera".

## 1. Problem Statement

The DSCO 2026 model predicts `at_risk` for each student from data available in the first four weeks of a course presentation: demographics, assessment submissions and scores, and online learning activity (week 1 to week 4 interactions). The model is the team's final notebook model, a LightGBM and denoising-autoencoder MLP blend with a 5-fold cross-validation F1 of 0.7758; the team's final Kaggle score is 0.80150 public and 0.79363 private. A probability alone does not tell an institution what to do. Lentera turns each prediction into a decision.

The problem has four parts, each grounded in the model's out-of-fold (OOF) predictions on the 26,086 training rows.

- **Advisor time is limited, but risk is concentrated.** The top 10% of students by predicted probability are at risk 99.4% of the time and contain 18.9% of all at-risk students. The top 30% have a precision of 92.8% and a recall of 52.8%. An institution that contacts students in probability order reaches far more at-risk students per advisor hour than one that contacts students at random.
- **At-risk students are at risk for different reasons, and each reason needs a different action.** 3,045 training students have no recorded online activity and no submission by the cutoff. 98.8% of them are at risk, and they need an administrative check (enrollment status, access problems). 2,669 students are active online but missed a due assessment. 88.5% of them are at risk, and they need deadline support. One generic "at risk" flag sends all of them the same message.
- **The model is least reliable where human judgment matters most.** Active students with no missed submission make up 19,680 training rows. They are at risk 39.8% of the time, and the model's AUC on this segment is 0.762, against 0.848 overall. 92.8% of the model's OOF errors fall in this segment.
- **Course design limits what can be predicted at week 4.** Modules M05 and M07 have no graded assessment by week 4 (`has_score` is 0 for every student). M07 has the lowest module AUC (0.696), and 58.1% of M07 students fall in the uncertain probability band of 0.25 to 0.55. Coordinators can change this by adding an early graded assessment.

The probabilities are well calibrated on OOF data (expected calibration error 0.0075 over ten bins, Brier score 0.157). Lentera can therefore report the expected number of truly at-risk students in any contacted group as the sum of their probabilities.

## 2. Goals

Lentera is the final-round demonstration for DSCO 2026. The final round scores three aspects, and each goal maps to one of them.

| Judging aspect | Weight | What Lentera shows |
| --- | --- | --- |
| Model analysis and justification | 40% | The model card page: 5-fold out-of-fold validation, the LightGBM and DAE-MLP components against their blend, calibration, per-module and per-segment reliability, fairness breakdown, and the parity check that the deployed model reproduces the trained notebook model. |
| Prescriptive insight | 35% | The capacity planner, archetype routing, per-student reason codes split into actionable signals and context, counterfactual "path below the threshold", intervention playbook, and course design recommendations. |
| Presentation and visualization | 25% | A dashboard that follows the advisor's workflow from cohort overview to a single student, plus the system architecture diagram. |

Success measures:

- The deployed API reproduces the labels of the submitted file `outputs/final/submission.csv` (SHA256 `7e36b66a4e94eb846e83afa3a48ab3e36388bc61fffc9437457be020d4838c66`) for all 6,502 test rows.
- Every number displayed in the app traces to a generated artifact (model card JSON, insights JSON, or a database query). No number is typed by hand.
- The live demo runs end to end on the deployed URLs: sign in, upload the week 4 cohort, review the dashboard, build a capacity plan, open a student, log an intervention.

Pending: the owner sets the final-round presentation date, which fixes the build deadline.

## 3. Target Users

- **Student success advisor:** Contacts students. Works from a prioritized list for the modules assigned to them, needs the reason a student is flagged, what to say, and a place to record the outcome.
- **Course coordinator:** Owns one or more modules. Uploads the week 4 cohort export, reviews the data quality report, and reads course design recommendations for their modules.
- **Academic leader:** Decides how many advisor hours to allocate. Uses the capacity planner to see how many at-risk students each staffing level reaches.
- **Final-round judges:** Watch the demo and read the model card. They sign in with a demo account.
- **Project owner:** veinsan's team, which defines scope and presents in the final round.
- **Builders:** The team's developers and Claude Code, working from this PRD and `ARCHITECTURE.md`.

## 4. User Stories

### Cohort and planning

- As an academic leader, I want to see the risk distribution of the current cohort so that I know the size of the problem before I allocate staff.
  - **Acceptance criteria:** The dashboard shows the number of scored students, the number flagged at the model threshold (0.387), the expected number of at-risk students (sum of probabilities), counts per risk tier and per archetype, and a module by presentation heatmap of mean predicted risk.
- As an academic leader, I want to enter advisor capacity and see the resulting intervention plan so that I can justify a staffing decision.
  - **Acceptance criteria:** After the user enters the number of advisors and hours per advisor, the planner returns the number of students assigned to each intervention, the expected number of at-risk students reached, the share of all expected at-risk students that number represents, and the mean probability of the contacted group.
  - **Acceptance criteria:** The planner draws a curve of expected at-risk students reached against total advisor hours, so the user sees the marginal value of one more advisor.
- As an academic leader, I want to set an assumed effectiveness for each intervention so that I can compare plans by estimated retained students as well as by reach.
  - **Acceptance criteria:** Effectiveness values default to 1.0 (pure reach). Any output computed with a value other than 1.0 is labeled as a scenario that depends on user assumptions.

### Advisor workflow

- As an advisor, I want a prioritized list of flagged students in my modules so that I contact the most urgent students first.
  - **Acceptance criteria:** The worklist shows only students in the advisor's assigned modules, sorted by probability by default, with tier, archetype, the top two actionable reasons, the recommended intervention, and intervention status.
  - **Acceptance criteria:** The advisor can filter by module, tier, archetype, and status, and export the filtered list as CSV.
- As an advisor, I want to see why a student is flagged in plain Indonesian so that I can open the conversation with the right topic.
  - **Acceptance criteria:** The student profile lists the student's top SHAP contributions in two groups: actionable signals (activity, submission, and score features) and context (demographic, course, and registration features). Each item has a one-line explanation, such as "Terakhir aktif 9 hari sebelum cutoff".
  - **Acceptance criteria:** The profile states that context features are never grounds for an intervention on their own.
- As an advisor, I want to see what would bring a student below the threshold so that I can give the student a concrete target.
  - **Acceptance criteria:** The profile shows the smallest combination of predefined actionable levers (for example, submit the pending assessment, be active on more days in week 4) that moves the predicted probability below the threshold, with the probability before and after. When no combination reaches the threshold, the profile shows the combination with the largest reduction.
  - **Acceptance criteria:** Only levers that lower the student's probability on their own are offered.
  - **Acceptance criteria:** The section is labeled as a model scenario, not a causal effect. Students without recorded online activity get an administrative check instead of a scenario.
- As an advisor, I want a message template for the recommended intervention so that I can contact the student quickly.
  - **Acceptance criteria:** The profile shows an Indonesian message template for the student's archetype, filled with the student's module, missed assessment, and last active day.
- As an advisor, I want to record the outcome of each contact so that my team can follow up and the institution builds evidence about what works.
  - **Acceptance criteria:** The advisor can save the intervention type, contact status, issue category, notes, and a follow-up date. The saved record appears in the student's history and updates the status on the worklist.

### Coordinator workflow

- As a coordinator, I want to upload the week 4 cohort export and see a data quality report before scoring so that I trust the predictions.
  - **Acceptance criteria:** The upload accepts a CSV in the DSCO `test.csv` schema. The report lists missing or extra columns, unknown category labels, rows with the placeholder activity block, and label repairs applied (for example, `GGG` mapped to `M07`, case normalization of `highest_education`). The cohort is scored only when required columns are present.
- As a coordinator, I want course design insights for my modules so that I can change what the course measures in the first four weeks.
  - **Acceptance criteria:** For each module the page shows OOF AUC, the share of students in the uncertain band, the share with a graded score by week 4, and median weekly interactions of at-risk and not-at-risk students for weeks 1 to 4.
  - **Acceptance criteria:** Rule-based recommendations appear for the module, such as "add a low-stakes graded assessment before week 3" for modules with no graded score by week 4.

### Model transparency

- As a judge, I want to read how the model was built and validated so that I can assess its justification.
  - **Acceptance criteria:** The model page shows the model version, training data hash, 5-fold CV F1 per fold and out-of-fold, the team's Kaggle F1 (public and private), threshold and how it was chosen, the component comparison, the calibration curve, per-module and per-segment metrics, and flag rate, precision, and recall by gender, disability, age band, and IMD band.
- As a coordinator, I want to know whether an uploaded cohort differs from the training data so that I know when predictions need caution.
  - **Acceptance criteria:** For each uploaded cohort the model page shows the population stability index (PSI) of the top features and of the predicted probability against the training data, with features above 0.2 highlighted.

## 5. Functional Requirements

### Scoring and model

- FR-01: The API scores a cohort CSV with the same preprocessing, feature set, and model as the DSCO final notebook (`dsco/notebooks/dsco_lgbm_dae_pair_final.ipynb`): LightGBM (1,405 trees, 15 leaves, learning rate 0.01, seed 42) and an MLP on denoising-autoencoder activations, logits averaged, trained on all 26,086 training rows. Module-presentation ranks are computed over the training rows plus the scored cohort, as the notebook does over train and test.
- FR-02: The API applies the threshold 0.387 to set the `flagged` label: the notebook's expected-F1 plug-in rule applied once to the DSCO test cohort, without labels.
- FR-03: The API assigns each student one risk tier from the predicted probability: Low below 0.387, Watch from 0.387 to below 0.6, High from 0.6 to below 0.85, Critical from 0.85.
- FR-04: The API marks a prediction as uncertain when the probability is between 0.25 and 0.55.
- FR-05: The API assigns each student exactly one archetype, checked in this order: Silent (placeholder activity block and no submission by cutoff), No LMS record (placeholder activity block), Missed submission (`no_submission_by_cutoff` is 1), Low score (`has_score` is 1 and `avg_score` below 60), Fading (week 4 interactions below half of week 1 interactions), Engaged (all others).
- FR-06: The API computes SHAP values for every scored student and stores the top contributions, grouped as actionable or context.
- FR-07: The API computes a counterfactual for a flagged student: the smallest set of predefined levers that moves the probability below the threshold, searched over at most three levers, plus the combination with the largest reduction. Levers that do not lower the student's probability on their own are excluded.
- FR-08: The API recomputes the probability for a user-chosen set of lever values (what-if).

### Planning and intervention

- FR-09: The planner allocates one intervention per flagged student from the playbook in section 5.1, maximizing the sum of probability times assumed effectiveness within the advisor minutes available. Automated nudges use no advisor minutes.
- FR-10: The planner returns per-intervention counts, expected at-risk students reached, coverage of expected at-risk students, mean probability of contacted students, and the reach curve over advisor hours.
- FR-11: Users with the coordinator or admin role save a plan with its parameters and results.
- FR-12: Advisors create intervention records and view the intervention history of a student.

### Data and monitoring

- FR-13: The upload flow validates the CSV, shows the data quality report, then scores and stores the cohort.
- FR-14: The API computes PSI per top feature and for the predicted probability for each stored cohort against the training data.
- FR-15: The API logs each request with user, endpoint, status code, and latency. The model page shows request count, error rate, and median and 95th percentile latency.

### Access

- FR-16: Users sign in with email and password through Supabase Auth.
- FR-17: Each user has one role: advisor, coordinator, or admin. Advisors see students in their assigned modules only. Coordinators see their assigned modules and upload cohorts. Admins see everything and manage roles.
- FR-18: Demo accounts exist for each role for the final-round judges.

### 5.1 Intervention Playbook

The playbook below is the default. The minutes per student and the effectiveness defaults are proposals awaiting the owner's confirmation; users can edit them in the planner.

| Archetype | Train count | Train at-risk rate | Recommended intervention | Advisor minutes |
| --- | ---: | ---: | --- | ---: |
| Silent | 3,045 | 98.8% | Administrative check: confirm enrollment and access, call the student | 10 |
| No LMS record | 692 | 79.6% | Access check: confirm LMS login and data export for the student | 5 |
| Missed submission | 2,669 | 88.5% | Phone call with deadline plan and assignment clinic referral | 15 |
| Low score | 2,957 | 66.4% | Tutoring referral and office hours invitation | 10 |
| Fading | 5,608 | 37.9% | Automated personalized nudge, escalated to a call if activity keeps falling | 0 |
| Engaged | 11,115 | 33.7% | Automated check-in message; advisor review when the student is flagged | 0 |

The tier says how urgent a student is. The archetype says why and selects the intervention. Fading and Engaged have similar at-risk rates, so the archetype alone is a weak risk signal for these two groups; the probability and tier carry the urgency.

## 6. Non-Functional Requirements

- Scoring and SHAP for the 6,502-row DSCO test cohort complete in under 60 seconds on the deployed API. (Proposal awaiting the owner's confirmation.)
- The what-if and counterfactual endpoints respond in under 1 second for one student.
- Dashboard, worklist, and student profile pages render their data in under 2 seconds for a 6,502-student cohort.
- The data contains no names or contact details. Student pages still require sign-in, and Supabase row level security enforces module access for advisors.
- The Supabase service role key and the API's secrets stay server-side. The browser uses only the Supabase anon key and the user's access token.
- Model training and inference use Python only. Next.js is the presentation layer.
- The competition data files (`train.csv`, `test.csv`) are not committed to the repository.
- The layout works on desktop widths from 1280 px. Tablet and mobile layouts are out of scope.
- Interface text is in Indonesian. Project documents and code are in English.

Pending: the owner confirms with the DSCO committee that a TypeScript frontend is acceptable under the Python-only rule, since the rule text covers the competition work.

## 7. Scope

- **In scope:** Cohort upload with data quality report, batch scoring with SHAP, tiers, archetypes, the dashboard, capacity planner, advisor worklist, student profile with reason codes, counterfactual, what-if, message templates, intervention log, course design insights, model card with fairness breakdown, drift and request monitoring, Supabase Auth with three roles, demo accounts, deployment of the API to Azure and the frontend to Vercel.
- **Out of scope:** Integration with a real LMS or student information system, sending real emails or messages, causal or uplift modeling, retraining from the app, generated text from a language model, a student-facing portal, multi-institution tenancy, mobile layouts.
- **Changes:** None yet.
