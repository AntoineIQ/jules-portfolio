"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function ScrollReveal({
  children,
  delay = 0,
  y = 40,
  className = "",
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, transform: `translate3d(0px, ${y}px, 0px)` }}
      whileInView={{ opacity: 1, transform: "translate3d(0px, 0px, 0px)" }}
      viewport={{ once, margin: "-10%" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const, delay }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className = "",
  delayChildren = 0.05,
  staggerChildren = 0.08,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delayChildren?: number;
  staggerChildren?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: reduce ? 0 : delayChildren,
            staggerChildren: reduce ? 0 : staggerChildren,
          },
        },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-10%" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
  y = 30,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce
          ? { opacity: 1, transform: "translate3d(0px,0px,0px)" }
          : { opacity: 0, transform: `translate3d(0px, ${y}px, 0px)` },
        visible: {
          opacity: 1,
          transform: "translate3d(0px, 0px, 0px)",
          transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] as const },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
