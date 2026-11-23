"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTION_LABELS, CONTACT_STATUS_LABELS, ISSUE_LABELS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";

const SELECT = "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring";

/** Logs one contact. RLS allows the insert only for students in the user's modules; advisor_id defaults to auth.uid(). */
export function InterventionForm({
  studentId,
  codeModule,
  defaultAction,
}: {
  studentId: number;
  codeModule: string;
  defaultAction: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit(form: FormData) {
    setError(null);
    setSaved(false);
    start(async () => {
      const { error } = await createClient()
        .from("interventions")
        .insert({
          student_id: studentId,
          code_module: codeModule,
          action_type: String(form.get("action_type")),
          contact_status: String(form.get("contact_status")),
          issue_category: form.get("issue_category") ? String(form.get("issue_category")) : null,
          notes: String(form.get("notes") ?? "").trim(),
          follow_up_on: form.get("follow_up_on") ? String(form.get("follow_up_on")) : null,
        });
      if (error) {
        setError("Catatan gagal disimpan. Pastikan mahasiswa ini ada di modul Anda.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="action_type">Intervensi</Label>
          <select id="action_type" name="action_type" defaultValue={defaultAction} className={SELECT}>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact_status">Status kontak</Label>
          <select id="contact_status" name="contact_status" defaultValue="contacted" className={SELECT}>
            {Object.entries(CONTACT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="issue_category">Kategori masalah</Label>
          <select id="issue_category" name="issue_category" defaultValue="" className={SELECT}>
            <option value="">Belum diketahui</option>
            {Object.entries(ISSUE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="follow_up_on">Tindak lanjut</Label>
          <Input id="follow_up_on" name="follow_up_on" type="date" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Catatan</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          className="rounded-xl border border-input bg-card px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
        />
      </div>
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <p role="status" className="text-sm text-success">
            Catatan tersimpan.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="hover:bg-primary-hover">
          {pending ? "Menyimpan..." : "Simpan catatan"}
        </Button>
      </div>
    </form>
  );
}
