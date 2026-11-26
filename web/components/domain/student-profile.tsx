import { notFound } from "next/navigation";
import { StudentWeeklyChart } from "@/components/charts/student-weekly-chart";
import { ArchetypeChip } from "@/components/domain/archetype-chip";
import { ContactMark } from "@/components/domain/contact-mark";
import { InterventionForm } from "@/components/domain/intervention-form";
import { MessageCard } from "@/components/domain/message-card";
import { ReasonList } from "@/components/domain/reason-list";
import { ScenarioPanel } from "@/components/domain/scenario-panel";
import { Section } from "@/components/domain/section";
import { RememberStudent } from "@/components/domain/stopped-flag";
import { TierBadge } from "@/components/domain/tier-badge";
import { getCounterfactual, getInsights } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStudentProfile, type Intervention } from "@/lib/data";
import { fmtInt, fmtModule, fmtPct, fmtProbPct } from "@/lib/format";
import { ACTION_LABELS, CONTACT_STATUS_LABELS, ISSUE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const WEEKS = ["week1_interactions", "week2_interactions", "week3_interactions", "week4_interactions"];

/**
 * One student: why they are flagged, what to do, what could change the prediction, and the contact log.
 * `panel` lays it out in one column for the side sheet over the worklist; the page uses two columns.
 */
export async function StudentProfileView({ id, panel = false }: { id: string; panel?: boolean }) {
  const studentId = Number(id);
  if (!Number.isSafeInteger(studentId) || studentId <= 0) notFound();
  const [user, profile] = await Promise.all([getCurrentUser(), getStudentProfile(studentId)]);
  if (!profile?.student.prediction) notFound(); // also when RLS hides the student from this user
  const { student, interventions } = profile;
  const pred = student.prediction!;
  const [cfRes, insightsRes] = await Promise.all([getCounterfactual(studentId, user.accessToken), getInsights(user.accessToken)]);

  const weeks = WEEKS.map((w) => Number(student.raw[w] ?? 0));
  const placeholder = Math.abs(Number(student.raw.interaction_volume) - weeks.reduce((a, b) => a + b, 0)) > 1e-6;
  const moduleInsight = insightsRes.ok ? insightsRes.data.modules[student.code_module] : undefined;
  const maxAbs = Math.max(...[...pred.reasons.actionable, ...pred.reasons.context].map((r) => Math.abs(r.shap)));
  const last = interventions[0];
  const threshold = cfRes.ok ? cfRes.data.threshold : null;

  return (
    <div className="flex flex-col gap-5">
      <RememberStudent id={student.id} />
      <header className={cn("plate p-5 sm:p-6", panel && "shadow-none")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="display text-[2rem] text-ink sm:text-[2.4rem]">
              Mahasiswa <span className="font-mono tracking-normal">{student.source_id}</span>
            </h1>
            <p className="mt-1.5 text-sm text-ink-3">
              {fmtModule(student.code_module)}, {fmtModule(student.code_presentation)}, {student.cohort.name}
            </p>
          </div>
          <div className="text-right">
            <p className="numeral text-[2.6rem] text-ink">{fmtProbPct(pred.probability)}</p>
            <p className="mt-1 text-xs text-ink-3">probabilitas berisiko</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-separator pt-4 text-sm">
          <TierBadge tier={pred.tier} />
          <ArchetypeChip archetype={pred.archetype} />
          <span className="text-ink-2">
            {pred.flagged ? "Ter-flag" : "Di bawah ambang"}
            {threshold != null && ` (ambang ${fmtPct(threshold, 1)})`}
          </span>
          {pred.uncertain && (
            <span className="inline-flex h-7 items-center rounded-full border border-dashed border-uncertain px-2.5 text-xs font-medium text-ink-2">
              Zona tidak pasti, tinjau dengan percakapan
            </span>
          )}
        </div>
      </header>

      <div className={cn("grid gap-5", !panel && "md:grid-cols-2")}>
        <div className="plate p-5">
          <p className="text-[13px] font-medium text-ink-3">Tindakan yang disarankan</p>
          <p className="mt-1.5 text-lg font-semibold tracking-[-0.01em] text-ink">{ACTION_LABELS[pred.recommended_action]}</p>
          {cfRes.ok && (
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              {cfRes.data.playbook.description}
              {cfRes.data.playbook.minutes > 0 ? ` Sekitar ${cfRes.data.playbook.minutes} menit konselor.` : " Tanpa waktu konselor."}
            </p>
          )}
        </div>
        <div className="plate p-5">
          <p className="text-[13px] font-medium text-ink-3">Kontak terakhir</p>
          <p className="mt-2">
            <ContactMark status={last?.contact_status} />
          </p>
          <p className="mt-1.5 text-sm text-ink-2">
            {last
              ? `${formatDate(last.created_at)}, ${ACTION_LABELS[last.action_type] ?? last.action_type}`
              : `${fmtInt(interventions.length)} catatan intervensi`}
          </p>
        </div>
      </div>

      <div className={cn("grid gap-5", !panel && "lg:grid-cols-[3fr_2fr]")}>
        <Section title="Mengapa mahasiswa ini ter-flag" description="Kontribusi SHAP per sinyal. Merah menaikkan risiko, biru menurunkannya.">
          <div className="flex flex-col gap-7">
            <ReasonList title="Sinyal yang bisa ditindaklanjuti" items={pred.reasons.actionable} maxAbs={maxAbs} />
            <ReasonList
              title="Konteks"
              note="Konteks tidak pernah menjadi alasan intervensi tanpa sinyal perilaku di atas."
              items={pred.reasons.context}
              maxAbs={maxAbs}
            />
          </div>
        </Section>
        <div className="flex flex-col gap-5">
          <Section title="Apa yang bisa mengubah prediksi" description="Lever perilaku di minggu ke-4 dan efeknya pada probabilitas model.">
            {cfRes.ok ? (
              <ScenarioPanel studentId={studentId} cf={cfRes.data} />
            ) : (
              <p className="text-sm text-ink-3">API model belum menjawab. Skenario akan muncul setelah API aktif.</p>
            )}
          </Section>
          <Section title="Template pesan" description="Diisi dari data mahasiswa sesuai archetype. Sesuaikan sebelum dikirim.">
            {cfRes.ok ? <MessageCard message={cfRes.data.message} /> : <p className="text-sm text-ink-3">Belum tersedia.</p>}
          </Section>
        </div>
      </div>

      <Section
        title="Aktivitas mingguan"
        description={`Interaksi LMS minggu 1 sampai 4 dibanding median mahasiswa ${fmtModule(student.code_module)} di data train.`}
      >
        {placeholder ? (
          <p className="text-sm text-ink-3">
            Data aktivitas mahasiswa ini berupa placeholder (volume tidak sama dengan jumlah mingguan), jadi tidak dibandingkan.
          </p>
        ) : moduleInsight ? (
          <StudentWeeklyChart
            student={weeks}
            atRisk={moduleInsight.weekly_median_interactions.at_risk}
            notAtRisk={moduleInsight.weekly_median_interactions.not_at_risk}
          />
        ) : (
          <p className="text-sm text-ink-3">Median modul belum tersedia.</p>
        )}
      </Section>

      <div className={cn("grid gap-5", !panel && "lg:grid-cols-2")}>
        <Section title="Catat intervensi">
          <InterventionForm studentId={student.id} codeModule={student.code_module} defaultAction={pred.recommended_action} />
        </Section>
        <Section title="Riwayat intervensi">
          <History items={interventions} userId={user.id} />
        </Section>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
}

function History({ items, userId }: { items: Intervention[]; userId: string }) {
  if (!items.length) return <p className="text-sm text-ink-3">Belum ada catatan intervensi untuk mahasiswa ini.</p>;
  return (
    <ol className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={i.id} className="rounded-2xl bg-surface-secondary p-4 text-sm">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold text-ink">
            {ACTION_LABELS[i.action_type] ?? i.action_type}
            <ContactMark status={i.contact_status} />
          </p>
          <p className="mt-1 text-xs text-ink-3">
            {formatDate(i.created_at)}, {i.advisor_id === userId ? "Anda" : "Konselor lain"}
            {i.issue_category && `, ${ISSUE_LABELS[i.issue_category]}`}
            {i.follow_up_on && `, tindak lanjut ${new Date(i.follow_up_on).toLocaleDateString("id-ID", { dateStyle: "medium" })}`}
          </p>
          {i.notes && <p className="mt-2 leading-relaxed whitespace-pre-line text-ink">{i.notes}</p>}
          <span className="sr-only">{CONTACT_STATUS_LABELS[i.contact_status]}</span>
        </li>
      ))}
    </ol>
  );
}
