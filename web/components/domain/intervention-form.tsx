"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input, Label, ListBox, Select, TextArea, TextField, toast } from "@heroui/react";
import { ACTION_LABELS, CONTACT_STATUS_LABELS, ISSUE_LABELS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";

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
  const [pending, start] = useTransition();

  function submit(form: FormData) {
    setError(null);
    start(async () => {
      const issue = String(form.get("issue_category") ?? "");
      const { error } = await createClient()
        .from("interventions")
        .insert({
          student_id: studentId,
          code_module: codeModule,
          action_type: String(form.get("action_type")),
          contact_status: String(form.get("contact_status")),
          issue_category: issue && issue !== "unknown" ? issue : null,
          notes: String(form.get("notes") ?? "").trim(),
          follow_up_on: form.get("follow_up_on") ? String(form.get("follow_up_on")) : null,
        });
      if (error) {
        setError("Catatan gagal disimpan. Pastikan mahasiswa ini ada di modul Anda, lalu coba lagi.");
        return;
      }
      toast.success("Catatan intervensi tersimpan");
      router.refresh();
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice name="action_type" label="Intervensi" defaultValue={defaultAction} options={ACTION_LABELS} />
        <Choice name="contact_status" label="Status kontak" defaultValue="contacted" options={CONTACT_STATUS_LABELS} />
        <Choice name="issue_category" label="Kategori masalah" defaultValue="unknown" options={{ unknown: "Belum diketahui", ...ISSUE_LABELS }} />
        <TextField name="follow_up_on" type="date" className="flex flex-col gap-1.5">
          <Label className="text-[13px] font-medium text-ink-2">Tindak lanjut</Label>
          <Input />
        </TextField>
      </div>
      <TextField name="notes" className="flex flex-col gap-1.5">
        <Label className="text-[13px] font-medium text-ink-2">Catatan</Label>
        <TextArea rows={3} maxLength={2000} placeholder="Apa yang disepakati dengan mahasiswa?" />
      </TextField>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" isPending={pending}>
          {pending ? "Menyimpan..." : "Simpan catatan"}
        </Button>
      </div>
    </form>
  );
}

function Choice({ name, label, defaultValue, options }: { name: string; label: string; defaultValue: string; options: Record<string, string> }) {
  return (
    <Select name={name} defaultValue={defaultValue} className="flex flex-col gap-1.5">
      <Label className="text-[13px] font-medium text-ink-2">{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {Object.entries(options).map(([id, text]) => (
            <ListBox.Item key={id} id={id} textValue={text}>
              {text}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
