import { Scale } from "lucide-react";
import { Section } from "@/components/domain/section";
import { Stat } from "@/components/domain/stat";
import { TierBadge } from "@/components/domain/tier-badge";
import { DataTable } from "@/components/ui/data-table";
import type { ImpactGroup, OutcomeImpact, Tier } from "@/lib/api";
import { fmtInt, fmtNum, fmtPct } from "@/lib/format";

const TIERS = ["critical", "high", "watch"] as const satisfies readonly Tier[];
const points = (v: number) => `${fmtNum(Math.abs(v) * 100, 1)} poin`;

/** Did contacting flagged students lower failure? Observed against expected, contacted against not contacted. */
export function ImpactPanel({ impact }: { impact: OutcomeImpact }) {
  const { contacted: c, not_contacted: n } = impact;
  if (c.n === 0) {
    return (
      <Section title="Dampak intervensi" description="Apakah mahasiswa yang dihubungi konselor lebih jarang gagal daripada perkiraan model?">
        <p className="text-sm leading-relaxed text-ink-2">
          Belum ada mahasiswa ter-flag dengan kontak berstatus dihubungi di kohort ini. Catat setiap kontak di profil mahasiswa selama semester, lalu
          unggah ulang hasil akhir agar dampaknya bisa diukur.
        </p>
      </Section>
    );
  }
  return (
    <Section
      title="Dampak intervensi"
      description="Probabilitas terkalibrasi adalah perkiraan hasil tanpa bantuan. Selisih hasil sebenarnya dengan perkiraan itu dibandingkan antara mahasiswa ter-flag yang dihubungi dan yang tidak."
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <GroupStat title="Dihubungi konselor" g={c} tone="blue" />
          <GroupStat title="Ter-flag, tidak dihubungi" g={n} />
        </div>

        <div className="rounded-2xl border border-dashed border-uncertain bg-surface-secondary p-5 text-sm">
          <p className="flex items-center gap-2 text-xs font-semibold text-ink-2">
            <Scale className="size-4" aria-hidden />
            Perkiraan dari data observasi, bukan uji acak
          </p>
          <p className="mt-2 leading-relaxed text-ink">{verdict(impact)}</p>
          <p className="mt-2 text-xs leading-relaxed text-ink-3">
            Konselor memilih sendiri siapa yang dihubungi, jadi kedua kelompok bisa berbeda dalam hal yang tidak terlihat oleh model. Perbandingan per
            tier di bawah menjaga tingkat risiko kedua kelompok tetap setara.
          </p>
        </div>

        <DataTable
          label="Dampak intervensi per tier"
          rows={TIERS.map((t) => ({ t, ...impact.by_tier[t] }))}
          rowId={(r) => r.t}
          columns={[
            { id: "t", label: "Tier", rowHeader: true, cell: (r) => <TierBadge tier={r.t} /> },
            { id: "cn", label: "Dihubungi", align: "end", cell: (r) => fmtInt(r.contacted.n) },
            { id: "cr", label: "Gagal / perkiraan", align: "end", cell: (r) => rates(r.contacted) },
            { id: "nn", label: "Tidak dihubungi", align: "end", cell: (r) => fmtInt(r.not_contacted.n) },
            { id: "nr", label: "Gagal / perkiraan", align: "end", cell: (r) => rates(r.not_contacted) },
          ]}
        />
      </div>
    </Section>
  );
}

function GroupStat({ title, g, tone = "ink" }: { title: string; g: ImpactGroup; tone?: "ink" | "blue" }) {
  return (
    <Stat
      label={`${title}, selisih dari perkiraan`}
      value={g.gap}
      format="pct1"
      tone={tone}
      note={`${fmtPct(g.at_risk_rate, 1)} gagal dari ${fmtInt(g.n)} mahasiswa, perkiraan tanpa bantuan ${fmtPct(g.expected_rate, 1)}`}
    />
  );
}

function rates(g: ImpactGroup) {
  if (g.n === 0) return <span className="text-ink-3">tidak ada</span>;
  return (
    <span>
      <span className="font-semibold">{fmtPct(g.at_risk_rate, 1)}</span>
      <span className="text-ink-3"> / {fmtPct(g.expected_rate, 1)}</span>
    </span>
  );
}

function verdict(i: OutcomeImpact): string {
  if (!i.enough || i.effect == null || i.ci_low == null || i.ci_high == null) {
    return `Data belum cukup untuk dibaca. Perlu minimal ${i.min_group} mahasiswa ter-flag di tiap kelompok, saat ini ${fmtInt(i.contacted.n)} dihubungi dan ${fmtInt(i.not_contacted.n)} tidak.`;
  }
  const range = `rentang 95% dari ${i.ci_low < 0 ? "turun" : "naik"} ${points(i.ci_low)} sampai ${i.ci_high < 0 ? "turun" : "naik"} ${points(i.ci_high)}`;
  if (i.clear && i.effect < 0) {
    return `Mahasiswa yang dihubungi gagal ${points(i.effect)} lebih jarang dari perkiraan dibanding yang tidak dihubungi (${range}). Kontak konselor kemungkinan besar membantu.`;
  }
  if (i.clear && i.effect > 0) {
    return `Mahasiswa yang dihubungi justru gagal ${points(i.effect)} lebih sering dari perkiraan (${range}). Periksa apakah konselor lebih dulu menghubungi kasus yang paling berat.`;
  }
  return `Belum terlihat perbedaan yang jelas. Selisihnya ${i.effect < 0 ? "turun" : "naik"} ${points(i.effect)}, dengan ${range}.`;
}
