import { map } from "@/lib/art/map";

/**
 * The drive into Flat Gap. The hills, creeks and roads are a static image
 * (public/map/flat-gap.svg); the route, pins and labels are drawn here on the
 * same coordinates so they use the site's fonts. The viewBox crops to the
 * middle of the drawing so the labels stay readable on a phone.
 */
const VIEW = { x: 250, y: 300, w: 760, h: 860 };

function Shield({ x, y, n }: { x: number; y: number; n: string }) {
  const w = n.length * 19 + 26;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-21} width={w} height={42} rx={9} fill="#fff" stroke="var(--ink)" strokeWidth={3} />
      <text textAnchor="middle" dy="0.36em" fontSize={28} fontWeight={800} fill="var(--ink)" fontFamily="var(--font-sans)">
        {n}
      </text>
    </g>
  );
}

function Label({ x, y, children, size = 22, anchor = "start", weight = 600, color = "var(--ink-soft)", italic = false, rotate = 0 }: {
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  anchor?: "start" | "middle" | "end";
  weight?: number;
  color?: string;
  italic?: boolean;
  rotate?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={size}
      fontWeight={weight}
      fill={color}
      fontStyle={italic ? "italic" : undefined}
      fontFamily={italic ? "var(--font-serif)" : "var(--font-sans)"}
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
      paintOrder="stroke"
      stroke="var(--paper)"
      strokeWidth={6}
      strokeLinejoin="round"
    >
      {children}
    </text>
  );
}

export default function FlatGapMap() {
  const [cx, cy] = map.church;
  const [sx, sy] = map.school;
  const [px, py] = map.po;
  return (
    <svg
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      className="block h-auto w-full"
      role="img"
      aria-label="Map of Flat Gap: KY 689 comes up from the south and ends at KY 1092; turn left, then right onto Flat Gap Drive, and the church is on the left near the post office and Flat Gap Elementary."
    >
      <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill="var(--paper)" />
      <image href="/map/flat-gap.svg" x={0} y={0} width={map.VW} height={map.VH} />

      <path d={map.route} fill="none" stroke="var(--brick)" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 14" />

      <Label x={730} y={850} rotate={33} italic size={28} color="var(--creek)" weight={500}>
        Lower Laurel Creek
      </Label>
      <Shield x={604} y={896} n="689" />
      <Shield x={553} y={340} n="689" />
      <Shield x={930} y={884} n="1092" />
      <Shield x={330} y={573} n="1092" />

      <circle cx={sx} cy={sy} r={9} fill="var(--ink-soft)" />
      <Label x={sx - 16} y={sy - 4} size={26} anchor="end">Flat Gap</Label>
      <Label x={sx - 16} y={sy + 24} size={26} anchor="end">Elementary</Label>

      <circle cx={px} cy={py} r={8} fill="var(--ink-soft)" />
      <Label x={px + 18} y={py + 30} size={26}>Post office</Label>

      <g transform={`translate(${cx} ${cy})`}>
        <circle r={30} fill="var(--brick)" opacity={0.18} />
        <circle r={15} fill="var(--brick)" stroke="var(--paper)" strokeWidth={4} />
      </g>
      <Label x={cx + 34} y={cy - 22} size={36} weight={800} color="var(--ink)">
        Flat Gap Baptist
      </Label>
      <Label x={cx + 34} y={cy + 12} size={26} color="var(--ink-soft)">
        75 Flat Gap Drive
      </Label>

      <Label x={515} y={1140} size={27} color="var(--brick)" weight={700}>
        {"From Paintsville and KY 172 ↓"}
      </Label>
    </svg>
  );
}
