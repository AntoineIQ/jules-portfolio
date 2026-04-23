import { ScrollReveal, Stagger, StaggerItem } from "@/components/motion/scroll-reveal";
import { KineticText } from "@/components/motion/kinetic-text";

const PROOF = [
  {
    title: "AI-native workflow",
    body: "I use AI coding tools as leverage for speed and iteration — not as a substitute for judgment. I know when to steer, when to stop, and when to rewrite.",
  },
  {
    title: "Technical storytelling",
    body: "I turn complex technical work into interfaces and narratives that a non-specialist can still understand quickly. Documentation is part of the product.",
  },
  {
    title: "Product thinking",
    body: "I shape the work around what an employer, user, or stakeholder needs to understand first. Craft is the default; shipping is the measure.",
  },
];

export function About() {
  return (
    <section
      id="about"
      className="relative bg-yellow text-ink px-6 md:px-10 py-24 md:py-32 overflow-hidden"
    >
      <div className="mx-auto max-w-wide">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] items-start">
          <div>
            <ScrollReveal>
              <span className="eyebrow text-ink/70">§ 02 · About</span>
              <h2 className="mt-5 font-display uppercase text-hero-md leading-[0.88]">
                <KineticText>The work</KineticText>
                <span className="block">
                  <KineticText delay={0.1}>should explain</KineticText>
                </span>
                <span className="block">
                  <KineticText delay={0.2}>itself.</KineticText>
                </span>
              </h2>
            </ScrollReveal>
          </div>
          <div className="space-y-6">
            <ScrollReveal>
              <p className="text-[18px] md:text-[20px] leading-relaxed max-w-2xl">
                This portfolio is meant to show more than finished visuals. It shows how I frame
                technical problems, build with AI assistance, and package the result so
                another person can understand it fast.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.08}>
              <p className="text-[18px] md:text-[20px] leading-relaxed max-w-2xl">
                I&apos;m most interested in work that sits between product thinking, frontend
                execution, and technical depth — interfaces, prototypes, tooling, and
                machine-learning projects that need to be both useful and legible.
              </p>
            </ScrollReveal>
          </div>
        </div>

        <Stagger className="mt-16 md:mt-20 grid gap-5 md:grid-cols-3" staggerChildren={0.08}>
          {PROOF.map((p, i) => (
            <StaggerItem key={p.title}>
              <article className="h-full rounded-[22px] border-[2.5px] border-ink bg-cream p-6 md:p-8 press-scale transition-transform">
                <span className="eyebrow text-ink/60">0{i + 1}</span>
                <h3 className="mt-5 font-display text-[26px] md:text-[30px] uppercase tracking-tightest leading-[0.95] max-w-[18ch]">
                  {p.title}
                </h3>
                <p className="mt-5 text-[15px] md:text-[16px] leading-relaxed text-ink/85">
                  {p.body}
                </p>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
