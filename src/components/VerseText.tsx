/** God's covenant name (LORD, and GOD or JEHOVAH where they stand for it) is set in slightly smaller capitals, as in a printed KJV. */
const NAMES = /\b(LORD|GOD|JEHOVAH)\b/;

export function withNames(s: string) {
  return s.split(NAMES).map((piece, j) =>
    j % 2 === 1 ? (
      <span key={j} style={{ fontSize: "0.85em", letterSpacing: "0.03em" }}>
        {piece}
      </span>
    ) : (
      piece
    ),
  );
}

/** One verse's words. Words the King James translators added (shown in square brackets in the source) are set in italics, as in a printed KJV. */
export default function VerseText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]*\])/).map((part, i) =>
        part.startsWith("[") && part.endsWith("]") ? <em key={i}>{withNames(part.slice(1, -1))}</em> : <span key={i}>{withNames(part)}</span>,
      )}
    </>
  );
}
