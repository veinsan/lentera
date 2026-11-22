// Typed client for the FastAPI service. Server components call it; the browser never sees API_URL.
import { unstable_rethrow } from "next/navigation";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export type Binary = {
  n: number;
  base_rate: number;
  flag_rate: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number | null;
};

export type SegmentMetrics = {
  f1: number;
  precision: number;
  recall: number;
  auc: number | null;
  n: number;
  positive_rate: number;
};

export type Tier = "critical" | "high" | "watch" | "low";

export type ModelCard = {
  model: {
    model_version: string;
    threshold: number;
    n_features: number;
    n_train: number;
    model_sha256: string;
    input_sha256: Record<string, string>;
    versions: Record<string, string>;
    params: Record<string, number | string | boolean>;
  };
  protocol: { outer: string; inner: string; seeds: number[]; early_stopping: string; inference: string };
  nested: {
    per_seed: { seed: number; f1: number; precision: number; recall: number; auc: number }[];
    mean_f1: number;
    sd_f1: number;
  };
  segments_seed42: Record<"all" | "active" | "hard" | "m07" | "no_activity", SegmentMetrics>;
  comparison: {
    method: string;
    seeds: number;
    f1: number;
    f1_sd: number;
    auc: number;
    hard_f1: number;
    m07_f1: number;
    decision: "dipilih" | "ditolak" | "pembanding";
    reason: string | null;
  }[];
  ablation: { name: string; label: string; f1_seed42: number; f1_seed137: number }[];
  leaderboard: {
    public_f1: number;
    private_f1: number | null;
    submission_ref: number;
    submission_sha256: string;
    submitted_utc: string;
  };
  presentation_stress: {
    note: string;
    per_presentation: (SegmentMetrics & { presentation: string; threshold: number })[];
  };
  calibration: {
    bins: { lower: number; upper: number; n: number; predicted: number; observed: number }[];
    ece: number;
    brier: number;
  };
  capacity_curve: { share: number; n: number; precision: number; recall: number; expected_at_risk: number }[];
  per_module: Record<string, Binary>;
  fairness: Record<string, Record<string, Binary>>;
  tiers: Record<Tier, { n: number; at_risk_rate: number; share_of_at_risk: number }>;
  archetypes: Record<string, { n: number; at_risk_rate: number; mean_probability: number }>;
  importance: {
    by_signal: Record<string, { label: string; group: "actionable" | "context"; value: number }>;
    top_features: Record<string, number>;
  };
  evaluation_notes: Record<string, string>;
};

export type ModuleInsight = {
  n: number;
  at_risk_rate: number;
  auc: number;
  f1: number;
  uncertain_share: number;
  graded_share: number;
  assessments_due_mean: number;
  placeholder_share: number;
  no_submission_share: number;
  constant_submission_data: boolean;
  weekly_median_interactions: { at_risk: number[]; not_at_risk: number[] };
  presentations: Record<string, { n: number; at_risk_rate: number }>;
  recommendations: { code: string; text: string }[];
};

export type Insights = {
  source: string;
  overall: { at_risk_rate: number; uncertain_share: number };
  cutoffs: { low_auc: number; high_uncertain: number; high_base_risk: number };
  modules: Record<string, ModuleInsight>;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

// Expected failures (API down, non-2xx) come back as values so pages can render an error state.
async function get<T>(path: string): Promise<Result<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) return { ok: false, error: `API ${path} returned ${res.status}` };
    return { ok: true, data: (await res.json()) as T };
  } catch (err) {
    unstable_rethrow(err); // let Next.js internal prerender signals through
    return { ok: false, error: String(err) };
  }
}

export const getModelCard = () => get<ModelCard>("/model");
export const getInsights = () => get<Insights>("/insights");
