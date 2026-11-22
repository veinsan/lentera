import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { StudentWeeklyChart } from "@/components/charts/student-weekly-chart";
import { ArchetypeChip } from "@/components/domain/archetype-chip";
import { InterventionForm } from "@/components/domain/intervention-form";
import { MessageCard } from "@/components/domain/message-card";
import { ReasonList } from "@/components/domain/reason-list";
import { ScenarioPanel } from "@/components/domain/scenario-panel";
import { Section } from "@/components/domain/section";
import { TierBadge } from "@/components/domain/tier-badge";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getCounterfactual, getInsights } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStudentProfile, type Intervention } from "@/lib/data";
import { fmtInt, fmtModule, fmtPct } from "@/lib/format";
import { ACTION_LABELS, CONTACT_STATUS_LABELS, ISSUE_LABELS, NOT_CONTACTED } from "@/lib/labels";

export const metadata: Metadata = { title: "Profil Mahasiswa" };

const WEEKS = ["week1_interactions", "week2_interactions", "week3_interactions", "week4_interactions"];

export default function Page({ params }: PageProps<"/mahasiswa/[id]">) {
  return (
    // params resolve at request time; the profile streams in after the static shell.
    <Suspense fallback={<PageHeader title="Profil Mahasiswa" description="Memuat..." />}>
      <StudentProfilePage params={params} />
    </Suspense>
  );
}

async function StudentProfilePage({ params }: Pick<PageProps<"/mahasiswa/[id]">, "params">) {
  const { id } = await params;
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

  return (
    <>
      <PageHeader
        title={`Mahasiswa ${student.source_id}`}
        description={`${fmtModule(student.code_module)} ${fmtModule(student.code_presentation)} · ${student.cohort.name}`}
        actions={
          <Link href={`/prioritas?module=${student.code_module}`} className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft aria-hidden />
            Daftar prioritas
          </Link>
        }
      />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-l-4 border-l-brand-accent bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">Probabilitas berisiko</p>
            <p className="mt-1 flex items-center gap-3">
              {/* One decimal so 0.996 does not read as a certain 100%. */}
              <span className="font-mono text-[1.75rem] font-semibold leading-tight">{fmtPct(pred.probability, 1)}</span>
              <TierBadge tier={pred.tier} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {pred.flagged ? "Ter-flag (threshold 0,375)" : "Di bawah threshold 0,375"}
              {pred.uncertain && " · zona tidak pasti, tinjau dengan percakapan"}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">Archetype dan tindakan</p>
            <div className="mt-2">
              <ArchetypeChip archetype={pred.archetype} />
            </div>
            <p className="mt-2 text-sm font-semibold">{ACTION_LABELS[pred.recommended_action]}</p>
            {cfRes.ok && (
              <p className="text-xs text-muted-foreground">
                {cfRes.data.playbook.description}
                {cfRes.data.playbook.minutes > 0 ? ` Sekitar ${cfRes.data.playbook.minutes} menit konselor.` : " Tanpa waktu konselor."}
              </p>
            )}
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">Kontak terakhir</p>
            <p className="mt-2 text-sm font-semibold">{last ? CONTACT_STATUS_LABELS[last.contact_status] : NOT_CONTACTED}</p>
            <p className="text-xs text-muted-foreground">
              {last
                ? `${formatDate(last.created_at)} · ${ACTION_LABELS[last.action_type] ?? last.action_type}`
                : `${fmtInt(interventions.length)} catatan intervensi`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[3fr_2fr] gap-6">
          <Section title="Mengapa mahasiswa ini ter-flag" description="Kontribusi SHAP per sinyal: merah menaikkan risiko, biru menurunkannya.">
            <div className="flex flex-col gap-6">
              <ReasonList title="Sinyal yang bisa ditindaklanjuti" items={pred.reasons.actionable} maxAbs={maxAbs} />
              <ReasonList
                title="Konteks"
                note="Konteks tidak pernah menjadi alasan intervensi tanpa sinyal perilaku di atas."
                items={pred.reasons.context}
                maxAbs={maxAbs}
              />
            </div>
          </Section>
          <div className="flex flex-col gap-6">
            <Section title="Apa yang bisa mengubah prediksi" description="Lever perilaku di minggu ke-4 dan efeknya pada probabilitas model.">
              {cfRes.ok ? (
                <ScenarioPanel studentId={studentId} cf={cfRes.data} />
              ) : (
                <p className="text-sm text-muted-foreground">API model tidak dapat dihubungi; skenario tidak tersedia.</p>
              )}
            </Section>
            <Section title="Template pesan" description="Diisi dari data mahasiswa sesuai archetype; sesuaikan sebelum dikirim.">
              {cfRes.ok ? <MessageCard message={cfRes.data.message} /> : <p className="text-sm text-muted-foreground">Tidak tersedia.</p>}
            </Section>
          </div>
        </div>

        <Section
          title="Aktivitas mingguan"
          description={`Interaksi LMS minggu 1 sampai 4 dibanding median mahasiswa ${fmtModule(student.code_module)} di data train.`}
        >
          {placeholder ? (
            <p className="text-sm text-muted-foreground">
              Data aktivitas mahasiswa ini berupa placeholder (volume tidak sama dengan jumlah mingguan), jadi tidak dibandingkan.
            </p>
          ) : moduleInsight ? (
            <StudentWeeklyChart
              student={weeks}
              atRisk={moduleInsight.weekly_median_interactions.at_risk}
              notAtRisk={moduleInsight.weekly_median_interactions.not_at_risk}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Median modul tidak tersedia.</p>
          )}
        </Section>

        <div className="grid grid-cols-2 gap-6">
          <Section title="Catat intervensi">
            <InterventionForm studentId={student.id} codeModule={student.code_module} defaultAction={pred.recommended_action} />
          </Section>
          <Section title="Riwayat intervensi">
            <History items={interventions} userId={user.id} />
          </Section>
        </div>
      </div>
    </>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
}

function History({ items, userId }: { items: Intervention[]; userId: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Belum ada catatan intervensi.</p>;
  return (
    <ol className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={i.id} className="rounded-md border p-3 text-sm">
          <p className="flex flex-wrap items-center gap-x-2 font-semibold">
            {ACTION_LABELS[i.action_type] ?? i.action_type}
            <span className="text-xs font-normal text-muted-foreground">· {CONTACT_STATUS_LABELS[i.contact_status]}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(i.created_at)} · {i.advisor_id === userId ? "Anda" : "Konselor lain"}
            {i.issue_category && ` · ${ISSUE_LABELS[i.issue_category]}`}
            {i.follow_up_on && ` · tindak lanjut ${new Date(i.follow_up_on).toLocaleDateString("id-ID", { dateStyle: "medium" })}`}
          </p>
          {i.notes && <p className="mt-1 whitespace-pre-line">{i.notes}</p>}
        </li>
      ))}
    </ol>
  );
}
