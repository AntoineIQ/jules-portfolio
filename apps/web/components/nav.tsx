"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Magnetic } from "@/components/motion/magnetic";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/#contact", label: "Contact" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const isOnDarkHero = pathname === "/" && !scrolled;
  const chromeFg = isOnDarkHero ? "text-cream" : "text-ink";
  const chromeBg = scrolled
    ? "bg-cream/90 backdrop-blur-md border-b border-ink/15"
    : "bg-transparent";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${chromeBg} ${chromeFg}`}
    >
      <div className="mx-auto grid max-w-wide grid-cols-[1fr_auto_1fr] items-center px-6 md:px-10 py-4">
        {/* left — logo */}
        <div className="justify-self-start">
          <Magnetic strength={0.25}>
            <Link href="/" className="inline-flex items-center press-scale" aria-label="Home">
              <span
                className="font-display text-[22px] leading-none tracking-tightest"
                style={{ fontFeatureSettings: '"ss01"' }}
              >
                JULES TACK.
              </span>
            </Link>
          </Magnetic>
        </div>

        {/* center — links */}
        <nav className="hidden md:block">
          <ul className="flex items-center gap-8">
            {LINKS.map((l) => {
              const active =
                l.href === "/"
                  ? pathname === "/"
                  : l.href.startsWith("/#")
                  ? false
                  : pathname.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`link-underline-grow text-[14px] font-medium ${
                      active ? "opacity-100" : "opacity-90"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* right — mobile toggle only */}
        <div className="justify-self-end">
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden relative h-11 w-11 -mr-2 press-scale"
          >
            <span
              className={`absolute left-2 right-2 top-[18px] h-[2px] bg-current transition-transform duration-300 ${
                open ? "translate-y-[4px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-2 right-2 top-[24px] h-[2px] bg-current transition-transform duration-300 ${
                open ? "-translate-y-[2px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, transform: "translate3d(0px,-12px,0px)" }}
            animate={{ opacity: 1, transform: "translate3d(0px,0px,0px)" }}
            exit={{ opacity: 0, transform: "translate3d(0px,-12px,0px)" }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }}
            className="md:hidden border-t border-ink/20 bg-cream text-ink"
          >
            <ul className="flex flex-col px-6 py-6 gap-5">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="font-display text-[40px] leading-none tracking-tightest">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
