import { getCurrentUser } from "@/lib/auth";
import { getLatestCohort, getWorklist, topReasons, type WorklistRow } from "@/lib/data";
import { ACTION_LABELS, ARCHETYPE_LABELS, CONTACT_STATUS_LABELS, NOT_CONTACTED } from "@/lib/labels";
import { parseWorklistParams } from "@/lib/worklist-params";

const PAGE = 1000;

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV export of the filtered worklist; RLS limits it to the user's modules like the page itself. */
export async function GET(request: Request) {
  await getCurrentUser(); // redirects to /login without a session
  const cohort = await getLatestCohort();
  if (!cohort) return new Response("Belum ada kohort.", { status: 404 });
  const { filters } = parseWorklistParams(Object.fromEntries(new URL(request.url).searchParams));

  const rows: WorklistRow[] = [];
  let status = new Map<number, string>();
  for (let page = 0; ; page++) {
    const res = await getWorklist(cohort.id, filters, page, PAGE);
    rows.push(...res.rows);
    status = res.status;
    if (rows.length >= res.total || res.rows.length === 0) break;
  }

  const header = ["peringkat", "id_mahasiswa", "modul", "presentation", "probabilitas", "tier", "archetype", "tindakan", "alasan_1", "alasan_2", "status"];
  const lines = rows.map((r, i) => {
    const [a, b] = topReasons(r.actionable);
    const contact = status.get(r.student_id);
    return [
      i + 1,
      r.students.source_id,
      r.code_module.toUpperCase(),
      r.students.code_presentation.toUpperCase(),
      r.probability.toFixed(4),
      r.tier,
      ARCHETYPE_LABELS[r.archetype] ?? r.archetype,
      ACTION_LABELS[r.recommended_action] ?? r.recommended_action,
      a?.text ?? "",
      b?.text ?? "",
      contact ? CONTACT_STATUS_LABELS[contact] ?? contact : NOT_CONTACTED,
    ].map(csvCell).join(",");
  });
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return new Response([header.join(","), ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lentera-prioritas-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
