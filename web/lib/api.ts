// Typed client for the FastAPI service. Server components call it; the browser never sees API_URL.
import { unstable_rethrow } from "next/navigation";

// 127.0.0.1, not localhost: on Windows localhost tries IPv6 first and adds about 2 s per call.
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export type PlaybookRow = { archetype: string; action: string; label: string; minutes: number; effectiveness: number };

export type PlanResult = {
  summary: {
    capacity_minutes: number;
    minutes_used: number;
    flagged: number;
    advisor_contacts: number;
    automated_contacts: number;
    unassigned: number;
    expected_at_risk_cohort: number;
    expected_at_risk_reached_advisor: number;
    expected_at_risk_reached_automated: number;
    advisor_coverage: number;
    advisor_mean_probability: number | null;
    estimated_retained_scenario: number | null;
    is_scenario: boolean;
    marginal_per_advisor: number;
    per_action: { action: string; channel: "advisor" | "automated" | "unassigned"; students: number; expected_at_risk: number; minutes: number }[];
  };
  curve: { hours: number; advisor_contacts: number; expected_at_risk_reached: number; value: number }[];
  playbook: PlaybookRow[];
  board: {
    columns: {
      advisor: number;
      capacity_minutes: number;
      minutes_used: number;
      students: number;
      tiers: Record<Tier, number>;
      actions: { action: string; students: number }[];
      top: { id: number; source_id: number | null; code_module: string | null; probability: number; tier: Tier; archetype: string; action: string; minutes: number }[];
    }[];
    unplaced: number;
  };
  rules: { threshold: number; tiers: { tier: Tier; min_probability: number }[] };
};

export type DriftStatus = "stable" | "moderate" | "shift";

export type DriftReport = {
  n: number;
  reference_n: number;
  thresholds: { moderate: number; shift: number };
  features: {
    feature: string;
    label: string;
    kind: "numeric" | "categorical";
    psi: number;
    status: DriftStatus;
    missing_reference?: number;
    missing_current?: number;
  }[];
  probability: { psi: number; status: DriftStatus; bins: { lower: number; upper: number; reference: number; current: number }[] };
};

type Latency = { p50: number; p95: number };

export type RequestStats = {
  days: number;
  total: number;
  server_errors: number;
  client_errors: number;
  error_rate: number | null;
  latency_ms: Latency | null;
  endpoints: ({ endpoint: string; requests: number; server_errors: number; client_errors: number } & Latency)[];
  daily: { day: string; requests: number; server_errors: number }[];
};

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
    /** The submission the team selected for the final leaderboard; not the model deployed in Lentera. */
    selected?: { ref: number; file: string; submitted_utc: string; public_f1: number; private_f1: number };
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

export type QualityCheck = {
  code: string;
  level: "error" | "warning" | "info";
  message: string;
  count: number | null;
  details: string[] | Record<string, unknown> | null;
};

export type QualityReport = {
  status: "ok" | "warning" | "error";
  can_score: boolean;
  rows: number;
  checks: QualityCheck[];
  repairs: { code: string; message: string; count: number }[];
  shares: Record<string, number> | null;
};

export type CohortSummary = {
  rows: number;
  flagged: number;
  expected_at_risk: number;
  uncertain: number;
  tiers: Record<Tier, number>;
  archetypes: Record<string, number>;
  modules: Record<string, number>;
};

export type Combo = { levers: string[]; labels: string[]; probability: number };

export type Counterfactual = {
  applicable: boolean;
  base: number;
  reason: "placeholder_activity" | "not_flagged" | "no_combination_below_threshold" | null;
  best: Combo | null;
  closest: Combo | null;
  single: { lever: string; label: string; probability: number }[];
  threshold: number;
  archetype: string;
  playbook: { action: string; label: string; description: string; minutes: number };
  message: string;
  levers: { key: string; label: string }[];
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

// Expected failures (API down, non-2xx) come back as values so pages can render an error state.
async function get<T>(path: string, token: string): Promise<Result<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { ok: false, error: `API ${path} returned ${res.status}` };
    return { ok: true, data: (await res.json()) as T };
  } catch (err) {
    unstable_rethrow(err); // let Next.js internal prerender signals through
    return { ok: false, error: String(err) };
  }
}

// token: the signed-in user's Supabase access token (getCurrentUser().accessToken); the API verifies it.
export const getModelCard = (token: string) => get<ModelCard>("/model", token);
export const getInsights = (token: string) => get<Insights>("/insights", token);
export const getRequestStats = (days: number, token: string) => get<RequestStats>(`/monitoring/requests?days=${days}`, token);
export const getCounterfactual = (studentId: number, token: string) =>
  get<Counterfactual>(`/students/${studentId}/counterfactual`, token);
