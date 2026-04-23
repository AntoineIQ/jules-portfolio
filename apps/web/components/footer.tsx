import Link from "next/link";
import { ArrowDiagonal } from "@/components/decoration/arrow";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { Marquee } from "@/components/layout/marquee";
import { SITE } from "@/lib/site-config";

const FOOTER_NOTE = "Frontend systems · AI tooling · ML products";

const CONTACT = [
  { label: "Email", value: SITE.email, href: `mailto:${SITE.email}` },
  { label: "GitHub", value: "github.com/AntoineIQ", href: SITE.links.github },
  { label: "CV", value: "Download PDF", href: SITE.links.cv },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative bg-ink text-cream" id="contact">
      <Marquee
        items={[
          "LET'S TALK",
          `AVAILABLE · ${SITE.availability.toUpperCase()}`,
          SITE.location.toUpperCase(),
          "BUILDING WITH AI",
          "EMPLOYER-READY",
        ]}
        separator="✻"
        speedSeconds={32}
        className="py-6 border-b border-cream/20"
        trackClassName="font-display text-[clamp(28px,5vw,72px)] uppercase tracking-tighter text-yellow"
      />

      <div className="mx-auto max-w-wide px-6 md:px-10 pt-24 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-16 lg:gap-24 items-start">
          <div>
            <ScrollReveal>
              <span className="eyebrow text-cream/60">§ End · Contact</span>
              <h2 className="mt-5 font-display text-[clamp(56px,11vw,180px)] uppercase leading-[0.86] tracking-tightest">
                Looking<br />
                for someone<br />
                who ships?
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.05} className="mt-10 max-w-xl text-[18px] md:text-[20px] leading-relaxed text-cream/85">
              <p>
                Open to full-time and contract work where AI is used with judgment — not
                as a shortcut. If anything here resonates, let&apos;s talk.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <a
                href={`mailto:${SITE.email}`}
                className="group mt-10 inline-flex flex-wrap items-baseline gap-x-4 gap-y-1 font-display uppercase tracking-tightest text-yellow text-[clamp(32px,6vw,72px)] leading-[0.96] press-scale max-w-full"
              >
                <span className="link-underline-grow break-all">{SITE.email}</span>
                <ArrowDiagonal className="h-8 w-8 sm:h-12 sm:w-12 translate-y-1 shrink-0 transition-transform duration-300 group-hover:translate-x-2 group-hover:-translate-y-1" />
              </a>
            </ScrollReveal>
          </div>

          <div className="w-full">
            <ScrollReveal>
              <span className="eyebrow text-cream/60">Channels</span>
              <ul className="mt-5 divide-y divide-cream/20 border-y border-cream/20">
                {CONTACT.map((c) => (
                  <li key={c.label} className="flex items-center justify-between py-4">
                    <span className="eyebrow text-cream/60">{c.label}</span>
                    <Link
                      href={c.href}
                      className="link-underline-grow text-[15px] font-medium text-cream"
                      target={c.href.startsWith("http") ? "_blank" : undefined}
                      rel={c.href.startsWith("http") ? "noreferrer" : undefined}
                    >
                      {c.value}
                    </Link>
                  </li>
                ))}
              </ul>
            </ScrollReveal>

            <div className="mt-10 flex items-center gap-2">
              <span className="dot-pulse" aria-hidden />
              <span className="eyebrow text-cream/60">Available · {SITE.availability}</span>
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col sm:flex-row justify-between gap-4 border-t border-cream/20 pt-6">
          <p className="eyebrow text-cream/55">
            © {year} · Jules Antoine Tack · Built, not templated
          </p>
          <p className="eyebrow text-cream/55">
            {FOOTER_NOTE}
          </p>
        </div>
      </div>
    </footer>
  );
}
