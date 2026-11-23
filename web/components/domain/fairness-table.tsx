"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Binary } from "@/lib/api";
import { fmtInt, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  const [attr, setAttr] = useState(attrs[0]);
  const rows = Object.entries(fairness[attr]);
  return (
    <div>
      <div role="tablist" aria-label="Atribut" className="mb-3 flex flex-wrap gap-2">
        {attrs.map((a) => (
          <button
            key={a}
            role="tab"
            aria-selected={a === attr}
            onClick={() => setAttr(a)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              a === attr ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {ATTRIBUTES[a]}
          </button>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{ATTRIBUTES[attr]}</TableHead>
            <TableHead className="text-right">n</TableHead>
            <TableHead className="text-right">At-risk aktual</TableHead>
            <TableHead className="text-right">Ter-flag</TableHead>
            <TableHead className="text-right">Presisi</TableHead>
            <TableHead className="text-right">Recall</TableHead>
            <TableHead className="text-right">F1</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="font-mono tabular-nums">
          {rows.map(([level, m]) => (
            <TableRow key={level}>
              <TableCell className="font-sans">{LEVELS[level] ?? level}</TableCell>
              <TableCell className="text-right">{fmtInt(m.n)}</TableCell>
              <TableCell className="text-right">{fmtPct(m.base_rate, 1)}</TableCell>
              <TableCell className="text-right">{fmtPct(m.flag_rate, 1)}</TableCell>
              <TableCell className="text-right">{fmtNum(m.precision, 3)}</TableCell>
              <TableCell className="text-right">{fmtNum(m.recall, 3)}</TableCell>
              <TableCell className="text-right">{fmtNum(m.f1, 3)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
