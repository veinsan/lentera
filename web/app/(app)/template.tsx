"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";

// The first paint after a hard load is never hidden; only in-app navigations animate their content in.
let navigated = false;

/** A template remounts on every navigation, so each route's content arrives with one short rise. */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const animate = navigated && !reduce;
  useEffect(() => {
    navigated = true;
  }, []);
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 12, filter: "blur(4px)" } : false}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
