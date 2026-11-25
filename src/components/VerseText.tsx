/** One verse's words. Words the King James translators added (shown in square brackets in the source) are set in italics, as in a printed KJV. */
export default function VerseText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]*\])/).map((part, i) =>
        part.startsWith("[") && part.endsWith("]") ? <em key={i}>{part.slice(1, -1)}</em> : <span key={i}>{part}</span>,
      )}
    </>
  );
}
