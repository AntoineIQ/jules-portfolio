"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion";
import { useRef, type ReactNode, type MouseEvent } from "react";

// Magnetic pull effect — subtle, spring-based.
// Uses useMotionTemplate so the rendered `transform: translate3d(...)` is
// hardware-accelerated AND readable from computed styles for verification.
export function Magnetic({
  children,
  strength = 0.35,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
  as?: "div" | "span";
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 150, damping: 12, mass: 0.4 });
  const sy = useSpring(my, { stiffness: 150, damping: 12, mass: 0.4 });
  const transform = useMotionTemplate`translate3d(${sx}px, ${sy}px, 0px)`;

  function onMove(e: MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * strength;
    const dy = (e.clientY - cy) * strength;
    const clamp = 14;
    mx.set(Math.max(-clamp, Math.min(clamp, dx)));
    my.set(Math.max(-clamp, Math.min(clamp, dy)));
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  const Tag = as === "span" ? motion.span : motion.div;
  return (
    <Tag
      ref={ref as never}
      data-magnetic="true"
      className={`${as === "span" ? "inline-block" : "inline-block"} ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={reduce ? undefined : { transform, willChange: "transform" }}
    >
      {children}
    </Tag>
  );
}
