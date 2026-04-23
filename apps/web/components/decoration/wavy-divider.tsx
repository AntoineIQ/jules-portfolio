export function WavyDivider({
  fromColor = "var(--cream)",
  toColor = "var(--yellow)",
  height = 64,
  className = "",
}: {
  fromColor?: string;
  toColor?: string;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full ${className}`}
      style={{ height, background: fromColor }}
      aria-hidden
    >
      <svg
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d="M0,32 C180,0 360,64 540,32 C720,0 900,64 1080,32 C1260,0 1440,64 1440,32 L1440,64 L0,64 Z"
          fill={toColor}
        />
      </svg>
    </div>
  );
}

export function WavyDividerSharp({
  fromColor = "var(--cream)",
  toColor = "var(--ink)",
  height = 36,
  className = "",
}: {
  fromColor?: string;
  toColor?: string;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full ${className}`}
      style={{ height, background: fromColor }}
      aria-hidden
    >
      <svg
        viewBox="0 0 1440 36"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d="M0,18 L60,6 L120,26 L180,10 L240,28 L300,8 L360,24 L420,12 L480,30 L540,10 L600,26 L660,8 L720,24 L780,12 L840,28 L900,6 L960,22 L1020,10 L1080,28 L1140,12 L1200,26 L1260,8 L1320,24 L1380,10 L1440,22 L1440,36 L0,36 Z"
          fill={toColor}
        />
      </svg>
    </div>
  );
}
