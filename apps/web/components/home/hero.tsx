"use client";

import Link from "next/link";
import { KineticText } from "@/components/motion/kinetic-text";
import { Magnetic } from "@/components/motion/magnetic";
import { ArrowGraphic } from "@/components/decoration/arrow";
import { StampBadge } from "@/components/decoration/stamp";
import { motion, useReducedMotion } from "framer-motion";

export function Hero() {
  const reduce = useReducedMotion();
  return (
    <section
      className="relative min-h-dvh flex flex-col justify-between overflow-hidden bg-cobalt text-cream grain-overlay"
    >
      {/* top meta strip */}
      <div className="relative z-10 flex items-center justify-between gap-4 px-6 md:px-10 pt-28 text-cream/80">
        <span className="eyebrow">Portfolio · Rev. 2026.04</span>
        <span className="eyebrow hidden sm:inline">Ghent · Remote</span>
        <span className="eyebrow">AI-native developer</span>
      </div>

      {/* stamp decoration */}
      <motion.div
        initial={reduce ? false : { opacity: 0, transform: "translate3d(20px, -20px, 0px) scale(0.85)" }}
        animate={{ opacity: 1, transform: "translate3d(0px, 0px, 0px) scale(1)" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] as const, delay: 0.9 }}
        className="absolute right-6 md:right-16 top-32 md:top-36 z-20 hidden sm:block"
      >
        <StampBadge text="CRAFTED · WITH · INTENT · " bg="var(--yellow)" color="var(--ink)" size={120} />
      </motion.div>

      {/* headline */}
      <div className="relative z-10 px-6 md:px-10 pb-10 md:pb-14">
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
          initial={reduce ? false : { opacity: 0, transform: "translate3d(0px, 30px, 0px)" }}
          animate={{ opacity: 1, transform: "translate3d(0px, 0px, 0px)" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] as const, delay: 1 }}
          className="mt-12 grid gap-10 md:grid-cols-[1.2fr_0.8fr] items-end"
        >
          <p className="max-w-2xl text-[18px] md:text-[22px] leading-snug text-cream/90">
            I build polished technical products and case studies that show how AI coding tools
            accelerate thinking, execution, and explanation — without replacing judgment.
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

        {/* scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="mt-14 hidden md:flex items-center gap-3 text-cream/70"
        >
          <span className="eyebrow">Scroll</span>
          <span className="block h-[1px] w-12 bg-cream/60" />
          <span className="eyebrow">01 / 07</span>
        </motion.div>
      </div>
    </section>
  );
}
