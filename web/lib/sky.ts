// Shared shape of the cohort sky: one star per student, no IDs. Built by api/scripts/build_landing.py for the
// landing page and from the stored predictions for the X-Ray (lib/data.ts).
export type Sky = {
  archetypes: string[]; // order of clusters, api/app/rules.py ARCHETYPES
  tiers: string[]; // low, watch, high, critical
  a: number[]; // archetype index per student
  t: number[]; // tier index per student
  p: number[]; // probability x 1000 per student
};

export const SKY_TIERS = ["low", "watch", "high", "critical"] as const;

// Star colours on the night plate, Rendah to Kritis (dataviz validator on #081634: CVD 15.6, normal 16.9, contrast >= 3:1).
export const NIGHT_TIER_COLORS = ["#86a4ea", "#fac96c", "#ef7834", "#c62e29"];

/** The X-Ray sky from stored predictions (the order of ARCHETYPE_VALUES matches the API's ARCHETYPES). */
export function skyFrom(preds: { archetype: string; tier: string; probability: number }[], archetypes: string[]): Sky {
  return {
    archetypes,
    tiers: [...SKY_TIERS],
    a: preds.map((p) => archetypes.indexOf(p.archetype)),
    t: preds.map((p) => SKY_TIERS.indexOf(p.tier as (typeof SKY_TIERS)[number])),
    p: preds.map((p) => Math.round(p.probability * 1000)),
  };
}

export function skyCounts(sky: Sky) {
  return sky.archetypes.map((key, i) => {
    let n = 0;
    let flagged = 0;
    for (let k = 0; k < sky.a.length; k++) {
      if (sky.a[k] !== i) continue;
      n++;
      if (sky.t[k] > 0) flagged++;
    }
    return { key, n, flagged };
  });
}
