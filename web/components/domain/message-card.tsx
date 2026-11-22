"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MessageCard({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <p className="whitespace-pre-line rounded-md bg-muted p-4 text-sm leading-relaxed">{message}</p>
      <Button
        variant="outline"
        className="self-end"
        onClick={async () => {
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
