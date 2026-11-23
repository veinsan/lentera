import { cn } from "@/lib/utils";

/** The Lentera mark, from the Figma AI generation (file 5grnLi0Eu7TYOFSLohKFEh, node 1:48), cropped to its ink. */
export function LanternMark({ className, star = "currentColor" }: { className?: string; star?: string }) {
  return (
    <svg viewBox="136 44 240 380" fill="none" aria-hidden className={cn("h-6 w-auto", className)}>
      <g stroke="currentColor" strokeWidth={22}>
        <circle cx={256} cy={80} r={27} />
        <rect x={145} y={157} width={222} height={238} rx={38} />
        <path d="M190 165V387M322 165V387" strokeLinecap="round" />
        <path d="M192 116H320L367 157H145Z" fill="currentColor" strokeLinejoin="round" />
        <path d="M148 395H364V415H148Z" fill="currentColor" strokeLinejoin="round" />
      </g>
      <path d="M256 224L267 262L302 276L267 290L256 328L245 290L210 276L245 262Z" fill={star} />
    </svg>
  );
}

export function Wordmark({ className, star }: { className?: string; star?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LanternMark className="h-7" star={star} />
      <span className="display text-[1.35rem] leading-none tracking-[-0.03em]">Lentera</span>
    </span>
  );
}
