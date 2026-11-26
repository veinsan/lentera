// Typed view of lib/generated/landing.json (api/scripts/build_landing.py). The public page reads only this file.
import data from "@/lib/generated/landing.json";
import type { Sky } from "@/lib/sky";

export type Landing = {
  model: {
    cv_f1: number;
    cv_f1_sd: number;
    folds: number;
    ece: number;
    brier: number;
    threshold: number;
    signals: number;
    actionable_signals: number;
    archetypes: number;
    kaggle_public: number;
    kaggle_private: number;
  };
  cohort: {
    name: string;
    scored: number;
    flagged: number;
    expected_at_risk: number;
    uncertain: number;
    tiers: Record<"low" | "watch" | "high" | "critical", number>;
    archetypes: Record<string, { n: number; flagged: number; action: string }>;
    modules: Record<string, number>;
    advisor_visible: number;
    advisor_modules: string[];
  };
  /** The served model against the test cohort's real outcomes (api/artifacts/test_evaluation.json); null without labels. */
  test: {
    n: number;
    f1: number;
    precision: number;
    recall: number;
    ece: number;
    plan_contacted: number;
    plan_expected: number;
    plan_at_risk: number;
    /** Students in the test cohort whose final outcome was at risk. */
    at_risk: number;
    /** Share of each tier, and of each archetype, whose final outcome was at risk. */
    tier_at_risk: Record<string, number>;
    archetype_at_risk: Record<string, number>;
  } | null;
  /** Behavioural triggers with their historical at-risk rate on the labelled training data (build_landing.py). */
  findings: {
    early_day: number;
    train_n: number;
    train_rate: number;
    triggers: { code: "no_submission" | "no_lms" | "stopped_early"; n_train: number; rate: number; rate_rest: number; n_cohort: number }[];
    pilot: { modules: string[]; critical: number };
  };
  quality: { rows: number; status: string; repairs: { code: string; count: number }[] };
  plan: { advisors: number; hours: number; contacts: number; reached: number; marginal: number; automated: number; waiting: number };
  sky: Sky;
};

export const landing = data as Landing;
