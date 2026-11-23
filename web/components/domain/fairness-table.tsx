"use client";

import { Tabs } from "@heroui/react";
import { DataTable } from "@/components/ui/data-table";
import type { Binary } from "@/lib/api";
import { fmtInt, fmtNum, fmtPct } from "@/lib/format";

const ATTRIBUTES: Record<string, string> = {
  gender: "Gender",
  disability: "Disabilitas",
  age_band: "Kelompok usia",
  imd_band: "IMD band",
  highest_education: "Pendidikan terakhir",
};

const LEVELS: Record<string, string> = {
  m: "Laki-laki",
  f: "Perempuan",
  y: "Ya",
  n: "Tidak",
  "-": "Tidak tercatat (-)",
  "?": "Tidak tercatat (?)",
};

export function FairnessTable({ fairness }: { fairness: Record<string, Record<string, Binary>> }) {
  const attrs = Object.keys(ATTRIBUTES).filter((a) => a in fairness);
  return (
    <Tabs defaultSelectedKey={attrs[0]}>
      <Tabs.ListContainer>
        <Tabs.List aria-label="Atribut fairness">
          {attrs.map((a) => (
            <Tabs.Tab key={a} id={a}>
              {ATTRIBUTES[a]}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {attrs.map((a) => (
        <Tabs.Panel key={a} id={a} className="pt-4">
          <DataTable
            label={`Fairness menurut ${ATTRIBUTES[a]}`}
            rows={Object.entries(fairness[a]).map(([level, m]) => ({ level, ...m }))}
            rowId={(r) => r.level}
            columns={[
              { id: "level", label: ATTRIBUTES[a], rowHeader: true, cell: (r) => LEVELS[r.level] ?? r.level },
              { id: "n", label: "n", align: "end", cell: (r) => fmtInt(r.n) },
              { id: "base", label: "At-risk aktual", align: "end", cell: (r) => fmtPct(r.base_rate, 1) },
              { id: "flag", label: "Ter-flag", align: "end", cell: (r) => fmtPct(r.flag_rate, 1) },
              { id: "p", label: "Presisi", align: "end", cell: (r) => fmtNum(r.precision, 3) },
              { id: "r", label: "Recall", align: "end", cell: (r) => fmtNum(r.recall, 3) },
              { id: "f1", label: "F1", align: "end", cell: (r) => <span className="font-semibold">{fmtNum(r.f1, 3)}</span> },
            ]}
          />
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
