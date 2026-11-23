import { fmtNum } from "@/lib/format";

/** The team's final Kaggle F1 as two labelled figures, public and private. */
export function KaggleScores({ pub, priv }: { pub: number; priv: number }) {
  return (
    <dl className="inline-flex gap-8">
      {(
        [
          ["Public", pub],
          ["Private", priv],
        ] as const
      ).map(([split, score]) => (
        <div key={split}>
          <dt className="text-xs font-medium text-ink-3">{split}</dt>
          <dd className="numeral text-[1.6rem] text-ink">{fmtNum(score, 5)}</dd>
        </div>
      ))}
    </dl>
  );
}
