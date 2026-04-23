"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={reduce ? false : { opacity: 0, transform: "translate3d(0px, 14px, 0px)" }}
        animate={{ opacity: 1, transform: "translate3d(0px, 0px, 0px)" }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, transform: "translate3d(0px, -14px, 0px)" }}
        transition={{
          duration: 0.55,
          ease: [0.22, 1, 0.36, 1] as const,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
