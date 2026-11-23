import Image from "next/image";
import { LinkButton } from "@/components/ui/link-button";

/** Empty or unreachable content: the generated atlas illustration, what is missing, and the way forward. */
export function EmptyState({
  title,
  description,
  action,
  art = "empty",
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
  art?: "empty" | "missing";
}) {
  return (
    <div className="plate flex flex-col items-center px-6 py-14 text-center">
      <Image
        src={art === "empty" ? "/illustrations/empty-atlas.svg" : "/illustrations/missing-star.svg"}
        alt=""
        width={280}
        height={175}
        className="h-auto w-[240px] sm:w-[280px]"
      />
      <h2 className="mt-6 text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-3">{description}</p>
      {action && (
        <LinkButton href={action.href} className="mt-6">
          {action.label}
        </LinkButton>
      )}
    </div>
  );
}
