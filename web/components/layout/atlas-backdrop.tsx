"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * The day atlas plate behind every working screen (generated, public/atlas/day-atlas.webp).
 * One depth clock: the plate drifts at a fraction of the scroll while the reading plane holds still.
 */
export function AtlasBackdrop() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 4000], [0, reduce ? 0 : -160]);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      <motion.div
        style={{ y, backgroundImage: "url(/atlas/day-atlas.webp)" }}
        className="absolute inset-x-0 -top-10 h-[calc(100%+200px)] bg-cover bg-center"
      />
      {/* A soft paper wash keeps the chart a texture, not a competitor, behind white plates. */}
      <div className="absolute inset-0 bg-paper/35" />
    </div>
  );
}
