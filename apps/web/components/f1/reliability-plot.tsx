type ReliabilityBin = {
  bin: number;
  lo: number;
  hi: number;
  n: number;
  mean_pred: number | null;
  frac_pos: number | null;
};

export function ReliabilityPlot({
  bins,
  width = 560,
  height = 360,
}: {
  bins: ReliabilityBin[];
  width?: number;
  height?: number;
}) {
  const margin = { top: 20, right: 22, bottom: 46, left: 52 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const x = (value: number) => margin.left + value * innerW;
  const y = (value: number) => margin.top + (1 - value) * innerH;
  const active = bins.filter((bin) => bin.mean_pred !== null && bin.frac_pos !== null);
  const maxN = Math.max(1, ...bins.map((bin) => bin.n));
  const radius = (n: number) => 4 + 12 * (n / maxN);
  const line = active
    .map((bin, index) => `${index === 0 ? "M" : "L"}${x(bin.mean_pred!).toFixed(1)},${y(bin.frac_pos!).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
      <rect x={margin.left} y={margin.top} width={innerW} height={innerH} fill="#fffcf6" stroke="rgba(10,10,10,0.18)" strokeWidth={1.5} />
      {[0.25, 0.5, 0.75].map((tick) => (
        <g key={tick}>
          <line x1={x(tick)} x2={x(tick)} y1={y(0)} y2={y(1)} stroke="rgba(10,10,10,0.1)" />
          <line x1={x(0)} x2={x(1)} y1={y(tick)} y2={y(tick)} stroke="rgba(10,10,10,0.1)" />
        </g>
      ))}
      <line x1={x(0)} x2={x(1)} y1={y(0)} y2={y(1)} stroke="rgba(10,10,10,0.42)" strokeDasharray="6 4" strokeWidth={1.5} />
      {line ? <path d={line} fill="none" stroke="#d93e2b" strokeWidth={3} /> : null}
      {active.map((bin) => (
        <circle
          key={bin.bin}
          cx={x(bin.mean_pred!)}
          cy={y(bin.frac_pos!)}
          r={radius(bin.n)}
          fill="rgba(127, 227, 185, 0.8)"
          stroke="#0a0a0a"
          strokeWidth={1.3}
        >
          <title>{`${bin.lo.toFixed(1)}-${bin.hi.toFixed(1)} · n=${bin.n}`}</title>
        </circle>
      ))}
      {[0, 0.5, 1].map((value) => (
        <g key={value}>
          <text x={x(value)} y={height - 14} textAnchor="middle" className="fill-ink/70 text-[10px]">
            {value.toFixed(1)}
          </text>
          <text x={margin.left - 10} y={y(value) + 3} textAnchor="end" className="fill-ink/70 text-[10px]">
            {value.toFixed(1)}
          </text>
        </g>
      ))}
      <text x={margin.left + innerW / 2} y={height - 2} textAnchor="middle" className="fill-ink text-[11px] font-semibold uppercase tracking-[0.18em]">
        Mean predicted probability
      </text>
      <text
        x={12}
        y={margin.top + innerH / 2}
        textAnchor="middle"
        transform={`rotate(-90 12 ${margin.top + innerH / 2})`}
        className="fill-ink text-[11px] font-semibold uppercase tracking-[0.18em]"
      >
        Observed rate
      </text>
    </svg>
  );
}
