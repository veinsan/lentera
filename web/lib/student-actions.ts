"use server";

import { getLatestCohort } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

/** Database row id of the student with this DSCO id in the latest cohort; null when absent or outside the user's modules (RLS). */
export async function findStudent(sourceId: number): Promise<number | null> {
  const cohort = await getLatestCohort();
  if (!cohort) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("id").eq("cohort_id", cohort.id).eq("source_id", sourceId).maybeSingle();
  return data?.id ?? null;
}
