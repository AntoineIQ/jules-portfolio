export function StampBadge({
  text = "CRAFTED · WITH · INTENT · ",
  color = "var(--ink)",
  bg = "var(--yellow)",
  size = 144,
  className = "",
}: {
  text?: string;
  color?: string;
  bg?: string;
  size?: number;
  className?: string;
}) {
  const chars = text.split("");
  const radius = 52;
  const step = 360 / chars.length;
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center"
        style={{ background: bg, border: `2px solid ${color}` }}
      >
        <div className="stamp-rotate absolute inset-0">
          <svg viewBox="0 0 140 140" className="h-full w-full">
            <defs>
              <path
                id="stampCircle"
                d={`M 70,70 m -${radius},0 a ${radius},${radius} 0 1,1 ${radius * 2},0 a ${radius},${radius} 0 1,1 -${radius * 2},0`}
              />
            </defs>
            <text
              fontFamily="var(--font-display)"
              fontSize="10"
              fontWeight="700"
              letterSpacing="3"
              fill={color}
              textLength={2 * Math.PI * radius}
              lengthAdjust="spacingAndGlyphs"
            >
              <textPath href="#stampCircle" startOffset="0">
                {text}{text}
              </textPath>
            </text>
          </svg>
        </div>
        <div
          className="relative z-10 font-display text-[22px] leading-none"
          style={{ color }}
        >
          ★
        </div>
      </div>
    </div>
  );
}
