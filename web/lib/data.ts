// Server-side reads from Supabase as the signed-in user, so RLS limits every query to the user's modules.
import type { DriftReport, Tier } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import type { WorklistFilters } from "@/lib/worklist-params";

export { ARCHETYPE_VALUES, TIER_VALUES } from "@/lib/worklist-params";

const PAGE = 1000; // PostgREST max rows per request on this project

export type Cohort = { id: string; name: string; uploaded_at: string; n_rows: number; model_version: string };

export type PredictionLite = {
  student_id: number;
  code_module: string;
  probability: number;
  flagged: boolean;
  tier: Tier;
  uncertain: boolean;
  archetype: string;
  recommended_action: string;
  students: { code_presentation: string; source_id: number };
};

export type Reason = { signal: string; label: string; shap: number; text: string };

export type WorklistRow = PredictionLite & {
  students: { code_presentation: string; source_id: number };
  actionable: Reason[];
};

export const WORKLIST_PAGE = 50;

export async function getLatestCohort(): Promise<Cohort | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cohorts")
    .select("id, name, uploaded_at, n_rows, model_version")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/** Drift report of the latest cohort; null until a cohort has been scored with drift reporting. */
export async function getLatestDrift(): Promise<{ name: string; uploaded_at: string; drift: DriftReport | null } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cohorts")
    .select("name, uploaded_at, drift_report")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data && { name: data.name, uploaded_at: data.uploaded_at, drift: data.drift_report as DriftReport | null };
}

/** Every prediction the user may see in the cohort, fetched in parallel pages of 1,000. */
export async function getCohortPredictions(cohortId: string): Promise<PredictionLite[]> {
  const supabase = await createClient();
  const columns = "student_id, code_module, probability, flagged, tier, uncertain, archetype, recommended_action, students(code_presentation, source_id)";
  const { count } = await supabase.from("predictions").select("student_id", { count: "exact", head: true }).eq("cohort_id", cohortId);
  const pages = Math.ceil((count ?? 0) / PAGE);
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      supabase.from("predictions").select(columns).eq("cohort_id", cohortId).order("student_id").range(i * PAGE, (i + 1) * PAGE - 1),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
  return results.flatMap((r) => (r.data ?? []) as unknown as PredictionLite[]);
}


/** Student ids with at least one intervention in the cohort (small table; used for status and filters). */
async function contactedStatus(cohortId: string): Promise<Map<number, string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interventions")
    .select("student_id, contact_status, created_at, students!inner(cohort_id)")
    .eq("students.cohort_id", cohortId)
    .order("created_at", { ascending: false });
  const latest = new Map<number, string>();
  for (const row of data ?? []) if (!latest.has(row.student_id)) latest.set(row.student_id, row.contact_status);
  return latest;
}

export async function getWorklist(cohortId: string, filters: WorklistFilters, page: number, pageSize = WORKLIST_PAGE) {
  const supabase = await createClient();
  const status = await contactedStatus(cohortId);
  let query = supabase
    .from("predictions")
    .select(
      "student_id, code_module, probability, flagged, tier, uncertain, archetype, recommended_action, students(code_presentation, source_id), actionable:reasons->actionable",
      { count: "exact" },
    )
    .eq("cohort_id", cohortId)
    .eq("flagged", true);
  if (filters.module) query = query.eq("code_module", filters.module);
  if (filters.tier) query = query.eq("tier", filters.tier);
  if (filters.archetype) query = query.eq("archetype", filters.archetype);
  const contacted = [...status.keys()];
  if (filters.status === "sudah") query = query.in("student_id", contacted.length ? contacted : [-1]);
  if (filters.status === "belum" && contacted.length) query = query.not("student_id", "in", `(${contacted.join(",")})`);
  const { data, count, error } = await query
    .order("probability", { ascending: false })
    .order("student_id")
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as unknown as WorklistRow[], total: count ?? 0, status };
}

/** Top risk-raising actionable reasons, for the worklist (PRD: the top two). */
export function topReasons(actionable: Reason[] | null, n = 2): Reason[] {
  return (actionable ?? []).filter((r) => r.shap > 0).slice(0, n);
}

export type StudentProfile = {
  id: number;
  source_id: number;
  code_module: string;
  code_presentation: string;
  cohort: { name: string };
  raw: Record<string, number | string | null>;
  prediction: {
    probability: number;
    flagged: boolean;
    tier: Tier;
    uncertain: boolean;
    archetype: string;
    recommended_action: string;
    reasons: { actionable: Reason[]; context: Reason[] };
  } | null;
};

export type Intervention = {
  id: number;
  advisor_id: string;
  action_type: string;
  contact_status: string;
  issue_category: string | null;
  notes: string;
  follow_up_on: string | null;
  created_at: string;
};

/** One student with prediction and intervention history; null when absent or outside the user's modules (RLS). */
export async function getStudentProfile(id: number): Promise<{ student: StudentProfile; interventions: Intervention[] } | null> {
  const supabase = await createClient();
  const [{ data: student }, { data: interventions }] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, source_id, code_module, code_presentation, raw, cohort:cohorts(name), prediction:predictions(probability, flagged, tier, uncertain, archetype, recommended_action, reasons)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("interventions")
      .select("id, advisor_id, action_type, contact_status, issue_category, notes, follow_up_on, created_at")
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!student) return null;
  // PostgREST may return a one-to-one embed as an object or a one-element array.
  const s = student as unknown as StudentProfile & { prediction: unknown };
  const prediction = Array.isArray(s.prediction) ? (s.prediction[0] ?? null) : s.prediction;
  return { student: { ...s, prediction } as StudentProfile, interventions: (interventions ?? []) as Intervention[] };
}
