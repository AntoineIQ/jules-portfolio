"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: string;
  splitBy?: "word" | "line";
  delay?: number;
  stagger?: number;
  className?: string;
  once?: boolean;
};

// Word-level reveal: y: 110% → 0 inside an overflow:hidden clip.
// Uses margin-right on word spans (instead of whitespace text nodes) so that
// wrapping lines don't get a visible leading space.
export function KineticText({
  children,
  splitBy = "word",
  delay = 0,
  stagger = 0.075,
  className = "",
  once = true,
}: Props) {
  const reduce = useReducedMotion();
  const units = splitBy === "word" ? children.split(" ") : [children];

  return (
    <span className={`kinetic-line ${className}`}>
      {units.map((unit, i) => (
        <motion.span
          key={`${unit}-${i}`}
          className="kinetic-word"
          style={{ marginRight: i < units.length - 1 ? "0.26em" : 0 }}
          initial={reduce ? undefined : { transform: "translate3d(0px, 110%, 0px)" }}
          whileInView={reduce ? undefined : { transform: "translate3d(0px, 0%, 0px)" }}
          animate={reduce ? { transform: "translate3d(0px, 0%, 0px)" } : undefined}
          viewport={{ once, margin: "-10%" }}
          transition={{
            duration: 0.9,
            ease: [0.16, 1, 0.3, 1] as const,
            delay: delay + i * stagger,
          }}
        >
          {unit}
        </motion.span>
      ))}
    </span>
  );
}

export function KineticLines({
  lines,
  delay = 0,
  stagger = 0.08,
  lineOffset = 0.12,
  className = "",
  lineClassName,
}: {
  lines: Array<{ text: string; className?: string }>;
  delay?: number;
  stagger?: number;
  lineOffset?: number;
  className?: string;
  lineClassName?: string;
}) {
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className={`block ${lineClassName ?? ""} ${line.className ?? ""}`}>
          <KineticText delay={delay + i * lineOffset} stagger={stagger}>
            {line.text}
          </KineticText>
        </span>
      ))}
    </span>
  );
}

export function StaticCopy({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={className}>{children}</span>;
}
