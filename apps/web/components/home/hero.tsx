"use client";

import Link from "next/link";
import { KineticText } from "@/components/motion/kinetic-text";
import { Magnetic } from "@/components/motion/magnetic";
import { ArrowGraphic } from "@/components/decoration/arrow";
import { motion, useReducedMotion } from "framer-motion";
import { useHasVisitedCurrentPath } from "@/components/motion/route-visit";

export function Hero() {
  const reduce = useReducedMotion();
  const hasVisited = useHasVisitedCurrentPath();
  const shouldAnimate = !reduce && !hasVisited;

  return (
    <section
      className="relative min-h-dvh flex flex-col justify-between overflow-hidden bg-cobalt text-cream grain-overlay"
    >
      {/* headline */}
      <div className="relative z-10 px-6 pb-10 pt-36 md:px-10 md:pb-14 md:pt-40">
        <h1 className="font-display uppercase text-hero-xl">
          <span className="block">
            <KineticText>Jules Tack.</KineticText>
          </span>
          <span className="block text-yellow">
            <KineticText delay={0.25}>Builds with AI.</KineticText>
          </span>
          <span className="block text-cream/85">
            <KineticText delay={0.5}>Ships seriously.</KineticText>
          </span>
        </h1>

        {/* sub block */}
        <motion.div
          initial={
            shouldAnimate ? { opacity: 0, transform: "translate3d(0px, 30px, 0px)" } : false
          }
          animate={{ opacity: 1, transform: "translate3d(0px, 0px, 0px)" }}
          transition={{
            duration: shouldAnimate ? 0.7 : 0.01,
            ease: [0.16, 1, 0.3, 1] as const,
            delay: shouldAnimate ? 0.15 : 0,
          }}
          className="mt-12 grid gap-10 md:grid-cols-[1.2fr_0.8fr] items-end"
        >
          <p className="max-w-[52ch] text-[18px] md:text-[22px] leading-snug text-cream/90">
            I build polished technical products and projects that show how AI coding tools
            accelerate thinking, execution, and explanation without replacing judgment.
          </p>

          <div className="flex flex-wrap gap-4">
            <Magnetic>
              <Link
                href="/projects"
                className="group inline-flex items-center gap-4 rounded-md bg-cream px-7 py-4 text-ink press-scale"
              >
                <span className="eyebrow">View projects</span>
                <ArrowGraphic className="h-[14px] w-[44px] transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <Magnetic strength={0.25}>
              <Link
                href="#contact"
                className="inline-flex items-center gap-4 rounded-md border-2 border-cream px-7 py-4 text-cream press-scale"
              >
                <span className="eyebrow">Get in touch</span>
              </Link>
            </Magnetic>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
