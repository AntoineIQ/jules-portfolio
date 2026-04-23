import type { CSSProperties } from "react";

export function Marquee({
  items,
  separator = "●",
  speedSeconds = 36,
  reverse = false,
  className = "",
  trackClassName = "",
}: {
  items: string[];
  separator?: string;
  speedSeconds?: number;
  reverse?: boolean;
  className?: string;
  trackClassName?: string;
}) {
  const loop = [...items, ...items];
  const style: CSSProperties = {
    ["--marquee-duration" as string]: `${speedSeconds}s`,
  };
  return (
    <div className={`marquee relative ${className}`} style={style} aria-hidden>
      <div className={`marquee-track ${reverse ? "reverse" : ""} ${trackClassName}`}>
        {loop.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-12 shrink-0">
            <span>{item}</span>
            <span className="opacity-70">{separator}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
