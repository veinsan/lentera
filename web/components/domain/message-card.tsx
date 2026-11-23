"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Check, Copy } from "lucide-react";

export function MessageCard({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-2xl bg-surface-secondary p-4 text-[15px] leading-relaxed whitespace-pre-line text-ink">{message}</p>
      <Button
        variant="secondary"
        className="self-end"
        onPress={async () => {
          await navigator.clipboard.writeText(message);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? "Tersalin" : "Salin pesan"}
      </Button>
    </div>
  );
}
