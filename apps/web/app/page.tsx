import { Hero } from "@/components/home/hero";
import { HorizontalWork } from "@/components/home/horizontal-work";
import { About } from "@/components/home/about";
import { Approach } from "@/components/home/approach";
import { Marquee } from "@/components/layout/marquee";
import { WavyDivider } from "@/components/decoration/wavy-divider";

export default function HomePage() {
  return (
    <>
      <Hero />

      <Marquee
        items={[
          "AI-NATIVE WORKFLOW",
          "FRONTEND SYSTEMS",
          "ML STORYTELLING",
          "DECISION-READY DEMOS",
          "SHIPPED FROM GHENT",
        ]}
        separator="●"
        speedSeconds={36}
        className="bg-ink text-cream py-5 border-y-2 border-ink"
        trackClassName="font-display uppercase text-[clamp(28px,5vw,56px)] tracking-tighter"
      />

      <HorizontalWork />

      <WavyDivider fromColor="var(--cream)" toColor="var(--yellow)" height={72} />

      <About />

      <Marquee
        items={[
          "PROTOTYPE",
          "OWN THE STRUCTURE",
          "EXPLAIN THE DECISIONS",
          "REPEAT",
          "SHIP",
        ]}
        separator="→"
        speedSeconds={32}
        reverse
        className="bg-pink text-ink py-5 border-y-[3px] border-ink"
        trackClassName="font-display uppercase text-[clamp(28px,5vw,56px)] tracking-tighter"
      />

      <Approach />

      <WavyDivider fromColor="var(--cream)" toColor="var(--ink)" height={72} />
    </>
  );
}
