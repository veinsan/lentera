import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-[1.5px] border-dashed border-input bg-card/60 px-6 py-16 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && (
        <Link href={action.href} className={buttonVariants({ className: "mt-6 hover:bg-primary-hover" })}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
