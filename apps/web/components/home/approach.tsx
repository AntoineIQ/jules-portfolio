import { ScrollReveal, Stagger, StaggerItem } from "@/components/motion/scroll-reveal";
import { KineticText } from "@/components/motion/kinetic-text";

const STEPS = [
  {
    title: "Prototype quickly",
    body: "Use AI coding tools to collapse the first draft and get to something testable early. Learning happens inside the loop, not before it.",
  },
  {
    title: "Own the structure",
    body: "Keep the architecture, naming, and tradeoffs intentional. AI can write the code — the decisions about what's worth writing stay with me.",
  },
  {
    title: "Explain the decisions",
    body: "Treat documentation, narrative, and visual clarity as part of the product, not an afterthought. If nobody can read it, it didn't ship.",
  },
];

export function Approach() {
  return (
    <section className="relative bg-cream text-ink px-6 md:px-10 py-24 md:py-32 overflow-hidden">
      <div className="mx-auto max-w-wide">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <ScrollReveal>
            <span className="eyebrow text-ink/60">§ 03 · How I build</span>
            <h2 className="mt-5 font-display uppercase text-hero-md">
              <KineticText>Fast, critical,</KineticText>
              <span className="block">
                <KineticText delay={0.1}>reproducible.</KineticText>
              </span>
            </h2>
          </ScrollReveal>
          <Stagger className="grid gap-5 md:grid-cols-3 self-end" staggerChildren={0.08}>
            {STEPS.map((s, i) => (
              <StaggerItem key={s.title}>
                <article className="h-full rounded-[22px] border-[2.5px] border-ink bg-white-warm p-6 press-scale transition-transform">
                  <span className="eyebrow text-ink/60">0{i + 1}</span>
                  <h3 className="mt-4 font-display text-[22px] md:text-[26px] uppercase tracking-tightest leading-[0.98]">
                    {s.title}
                  </h3>
                  <p className="mt-4 text-[14.5px] md:text-[15px] leading-relaxed text-ink/85">
                    {s.body}
                  </p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
