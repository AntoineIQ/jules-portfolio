import type { Metadata } from "next";
import { About } from "@/components/home/about";
import { ScrollReveal, Stagger, StaggerItem } from "@/components/motion/scroll-reveal";
import { KineticText } from "@/components/motion/kinetic-text";
import { WavyDivider } from "@/components/decoration/wavy-divider";

export const metadata: Metadata = {
  title: "About · Jules Antoine Tack",
  description: "Background, working style, and the kind of technical product work Jules likes to build.",
};

const SNAPSHOT = [
  {
    label: "Focus",
    value: "frontend systems, AI-native tooling, technical storytelling",
  },
  {
    label: "Working style",
    value: "prototype quickly, explain clearly, keep the hard parts honest",
  },
  {
    label: "Best fit",
    value: "teams that want product taste and technical depth in the same person",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative bg-cream text-ink px-6 md:px-10 pt-36 pb-20 md:pt-40 md:pb-24">
        <div className="mx-auto max-w-wide grid gap-10 md:grid-cols-[0.95fr_1.05fr]">
          <div>
            <ScrollReveal>
              <span className="eyebrow text-ink/55">§ About</span>
              <h1 className="mt-5 font-display uppercase text-hero-md">
                <KineticText>Technical work</KineticText>
                <span className="block text-pink">
                  <KineticText delay={0.12}>should be legible.</KineticText>
                </span>
              </h1>
            </ScrollReveal>
          </div>
          <div className="space-y-6">
            <ScrollReveal>
              <p className="text-[18px] md:text-[21px] leading-relaxed text-ink/85">
                I like building products where the surface has to be polished but the underlying
                system still has to stand up technically. That usually pulls me toward interfaces,
                AI-native tooling, data-heavy experiences, and machine-learning work that has to be
                explained to another human being, not just executed.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.08}>
              <p className="text-[16px] md:text-[18px] leading-relaxed text-ink/72">
                The portfolio is intentionally short. I’d rather show a few projects that reveal how
                I think than stack up many thin summaries. The F1 lab is the clearest example of the
                shape I enjoy most: product, frontend, ML, automation, and narrative all tied together.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <WavyDivider fromColor="var(--cream)" toColor="var(--yellow)" height={68} />

      <About />

      <section className="relative bg-ink text-cream px-6 md:px-10 py-20 md:py-24">
        <div className="mx-auto max-w-wide">
          <ScrollReveal>
            <span className="eyebrow text-cream/55">Snapshot</span>
          </ScrollReveal>
          <Stagger className="mt-8 grid gap-5 md:grid-cols-3" staggerChildren={0.08}>
            {SNAPSHOT.map((item) => (
              <StaggerItem key={item.label}>
                <div className="h-full rounded-[22px] border-[2.5px] border-cream/20 bg-cream/5 p-6">
                  <p className="eyebrow text-cream/45">{item.label}</p>
                  <p className="mt-4 text-[16px] leading-relaxed text-cream/85">{item.value}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
}
