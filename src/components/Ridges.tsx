import { ridges, ridgeViewBox } from "@/lib/art/ridges";

const fills = ["var(--hill-1)", "var(--hill-2)", "var(--hill-3)", "var(--hill-4)"];

/** The real skyline around the church, far hills pale and the near ones dark. */
export default function Ridges({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={ridgeViewBox}
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {ridges.map((d, i) => (
        <path key={i} d={d} fill={fills[i]} />
      ))}
    </svg>
  );
}
