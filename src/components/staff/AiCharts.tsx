import type { AiChart } from "@/lib/ai-compare.functions";

const COLORS = ["var(--primary)", "var(--accent)", "var(--muted-foreground)", "var(--warning)"];
const fmt = (v: number) => (Math.round(v * 10) / 10).toString();

export function AiCharts({ charts }: { charts: AiChart[] }) {
  if (!charts.length) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {charts.map((c, i) => (
        <figure key={i} className="rounded-md border border-border bg-card p-3">
          <figcaption className="mb-2">
            <div className="font-display text-sm font-semibold uppercase">{c.title}</div>
            <p className="text-xs text-muted-foreground">{c.insight}</p>
          </figcaption>
          <ChartBody chart={c} />
          {c.series.length > 1 && c.type !== "dona" && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {c.series.map((s, j) => (
                <span key={j} className="flex items-center gap-1">
                  <svg width="10" height="10"><rect width="10" height="10" rx="2" fill={COLORS[j % 4]} /></svg>{s.name}
                </span>
              ))}
            </div>
          )}
        </figure>
      ))}
    </div>
  );
}

function ChartBody({ chart }: { chart: AiChart }) {
  switch (chart.type) {
    case "radar": return <Radar c={chart} />;
    case "lineas": return <Lines c={chart} />;
    case "dona": return <Donut c={chart} />;
    case "barras_horizontales": return <HBars c={chart} />;
    default: return <Bars c={chart} />;
  }
}

const maxOf = (c: AiChart) => Math.max(1, ...c.series.flatMap((s) => s.values));

function Bars({ c }: { c: AiChart }) {
  const W = 320, H = 180, pad = 24, max = maxOf(c);
  const gw = (W - pad) / c.labels.length, bw = Math.max(4, (gw - 8) / c.series.length);
  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full">
      <line x1={pad} y1={H} x2={W} y2={H} stroke="var(--border)" />
      {c.labels.map((l, i) => (
        <g key={i}>
          {c.series.map((s, j) => {
            const h = (s.values[i] / max) * (H - 20), x = pad + i * gw + 4 + j * bw;
            return <g key={j}><rect x={x} y={H - h} width={bw - 2} height={h} rx="2" fill={COLORS[j % 4]} />
              <text x={x + bw / 2 - 1} y={H - h - 3} fontSize="9" textAnchor="middle" fill="var(--foreground)">{fmt(s.values[i])}</text></g>;
          })}
          <text x={pad + i * gw + gw / 2} y={H + 14} fontSize="9" textAnchor="middle" fill="var(--muted-foreground)">{l.slice(0, 12)}</text>
        </g>
      ))}
    </svg>
  );
}

function HBars({ c }: { c: AiChart }) {
  const s = c.series[0], max = maxOf(c), row = 22, W = 320;
  return (
    <svg viewBox={`0 0 ${W} ${c.labels.length * row}`} className="w-full">
      {c.labels.map((l, i) => {
        const w = (s.values[i] / max) * 170;
        return <g key={i} transform={`translate(0 ${i * row})`}>
          <text x="0" y="14" fontSize="10" fill="var(--foreground)">{l.slice(0, 18)}</text>
          <rect x="110" y="4" width="170" height="12" rx="3" fill="var(--muted)" />
          <rect x="110" y="4" width={w} height="12" rx="3" fill="var(--primary)" />
          <text x={W - 4} y="14" fontSize="10" textAnchor="end" fill="var(--foreground)">{fmt(s.values[i])}</text>
        </g>;
      })}
    </svg>
  );
}

function Lines({ c }: { c: AiChart }) {
  const W = 320, H = 170, pad = 28, max = maxOf(c), n = Math.max(1, c.labels.length - 1);
  const x = (i: number) => pad + (i / n) * (W - pad * 2), y = (v: number) => H - (v / max) * (H - 20);
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full">
      <line x1={pad} y1={H} x2={W - pad} y2={H} stroke="var(--border)" />
      {c.series.map((s, j) => (
        <g key={j}>
          <polyline fill="none" stroke={COLORS[j % 4]} strokeWidth="2.5" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
          {s.values.map((v, i) => <g key={i}><circle cx={x(i)} cy={y(v)} r="3.5" fill={COLORS[j % 4]} />
            <text x={x(i)} y={y(v) - 6} fontSize="9" textAnchor="middle" fill="var(--foreground)">{fmt(v)}</text></g>)}
        </g>
      ))}
      {c.labels.map((l, i) => <text key={i} x={x(i)} y={H + 14} fontSize="9" textAnchor="middle" fill="var(--muted-foreground)">{l.slice(0, 12)}</text>)}
    </svg>
  );
}

function Radar({ c }: { c: AiChart }) {
  const S = 240, cx = S / 2, cy = S / 2, R = 80, n = c.labels.length, max = Math.max(5, maxOf(c));
  const pt = (i: number, r: number) => [cx + r * Math.sin((2 * Math.PI * i) / n), cy - r * Math.cos((2 * Math.PI * i) / n)];
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto w-full max-w-xs">
      {[0.25, 0.5, 0.75, 1].map((k) => <polygon key={k} fill="none" stroke="var(--border)" points={c.labels.map((_, i) => pt(i, R * k).join(",")).join(" ")} />)}
      {c.series.map((s, j) => <polygon key={j} fill={COLORS[j % 4]} fillOpacity="0.2" stroke={COLORS[j % 4]} strokeWidth="2"
        points={s.values.map((v, i) => pt(i, (v / max) * R).join(",")).join(" ")} />)}
      {c.labels.map((l, i) => { const [x, y] = pt(i, R + 18); return <text key={i} x={x} y={y} fontSize="9" textAnchor="middle" fill="var(--foreground)">{l.slice(0, 12)}</text>; })}
    </svg>
  );
}

function Donut({ c }: { c: AiChart }) {
  const vals = c.series[0].values, total = vals.reduce((a, b) => a + b, 0) || 1, R = 60, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 160 160" className="w-36 shrink-0">
        <circle cx="80" cy="80" r={R} fill="none" stroke="var(--muted)" strokeWidth="22" />
        {vals.map((v, i) => { const len = (v / total) * C, off = acc; acc += len;
          return <circle key={i} cx="80" cy="80" r={R} fill="none" stroke={COLORS[i % 4]} strokeWidth="22"
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 80 80)" />; })}
        <text x="80" y="85" fontSize="16" fontWeight="700" textAnchor="middle" fill="var(--foreground)">{fmt(total)}</text>
      </svg>
      <ul className="space-y-1 text-xs">
        {c.labels.map((l, i) => <li key={i} className="flex items-center gap-1.5">
          <svg width="10" height="10"><rect width="10" height="10" rx="2" fill={COLORS[i % 4]} /></svg>
          {l}: <b>{fmt(vals[i])}</b> ({Math.round((vals[i] / total) * 100)}%)</li>)}
      </ul>
    </div>
  );
}
