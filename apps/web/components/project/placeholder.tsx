import type { ReactNode } from "react";

export function VizPlaceholder({
  label,
  hint,
  aspect = "aspect-[16/9]",
  tone = "cream",
  children,
}: {
  label: string;
  hint: string;
  aspect?: string;
  tone?: "cream" | "white" | "mint";
  children?: ReactNode;
}) {
  const toneBg =
    tone === "mint" ? "bg-mint" : tone === "white" ? "bg-white-warm" : "bg-cream";
  return (
    <div className="relative group">
      <div
        className={`relative ${aspect} w-full border-[2.5px] border-dashed border-ink/55 rounded-[18px] ${toneBg} overflow-hidden`}
      >
        {/* engineering-drawing cross-hatch */}
        <svg
          className="absolute inset-0 h-full w-full opacity-35"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <pattern
              id="hatch-slot"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(10,10,10,0.5)" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hatch-slot)" />
        </svg>
        <RegMark className="top-3 left-3" />
        <RegMark className="top-3 right-3 rotate-90" />
        <RegMark className="bottom-3 right-3 rotate-180" />
        <RegMark className="bottom-3 left-3 -rotate-90" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-pink px-3 py-1">
            <span className="h-[6px] w-[6px] rounded-full bg-ink" />
            <span className="eyebrow">{label}</span>
          </span>
          <p className="mt-4 font-display uppercase text-[clamp(22px,3.4vw,34px)] leading-[0.95] tracking-tightest text-ink max-w-[28ch]">
            Live component mounts here
          </p>
          <p className="mt-3 eyebrow text-ink/60 max-w-[44ch]">{hint}</p>
          {children}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between eyebrow text-ink/55">
        <span>Fig. — reserved slot</span>
        <span>Status · placeholder</span>
      </div>
    </div>
  );
}

function RegMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`absolute h-4 w-4 text-ink/60 ${className}`}
      aria-hidden
    >
      <path d="M0 0 H8 V1 H1 V8 H0 Z" fill="currentColor" />
    </svg>
  );
}
