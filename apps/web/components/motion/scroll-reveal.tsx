"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useHasVisitedCurrentPath } from "@/components/motion/route-visit";

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
  const hasVisited = useHasVisitedCurrentPath();
  const shouldAnimate = !reduce && !hasVisited;
  return (
    <motion.div
      className={className}
      initial={
        shouldAnimate
          ? { opacity: 0, transform: `translate3d(0px, ${y}px, 0px)` }
          : { opacity: 1, transform: "translate3d(0px, 0px, 0px)" }
      }
      animate={{ opacity: 1, transform: "translate3d(0px, 0px, 0px)" }}
      transition={{
        duration: shouldAnimate ? 0.7 : 0.01,
        ease: [0.16, 1, 0.3, 1] as const,
        delay: shouldAnimate ? delay : 0,
      }}
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
  const hasVisited = useHasVisitedCurrentPath();
  const shouldAnimate = !reduce && !hasVisited;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: shouldAnimate ? delayChildren : 0,
            staggerChildren: shouldAnimate ? staggerChildren : 0,
          },
        },
      }}
      initial="hidden"
      animate="visible"
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
  const hasVisited = useHasVisitedCurrentPath();
  const shouldAnimate = !reduce && !hasVisited;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: !shouldAnimate
          ? { opacity: 1, transform: "translate3d(0px,0px,0px)" }
          : { opacity: 0, transform: `translate3d(0px, ${y}px, 0px)` },
        visible: {
          opacity: 1,
          transform: "translate3d(0px, 0px, 0px)",
          transition: {
            duration: shouldAnimate ? 0.7 : 0.01,
            ease: [0.16, 1, 0.3, 1] as const,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
