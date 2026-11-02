/**
 * Articles used to be plain text (a blank line between paragraphs); the blog
 * editor now saves HTML. These read either. No dependencies, so the editor
 * can use them in the browser too.
 */

export const isHtml = (body: string) => /^\s*</.test(body);

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Plain text → HTML. A blank line starts a paragraph; single line breaks stay
 * <br>. A block where lines are pushed in with spaces or tabs (the way an
 * outline is typed) becomes one <p> per line, every 4–5 spaces one indent step.
 */
export function textToHtml(text: string) {
  const out: string[] = [];
  for (const block of text.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const lines = block.split("\n").filter((l) => l.trim());
    if (!lines.length) continue;
    const depth = (l: string) => {
      const lead = l.match(/^[ \t]*/)![0].replace(/\t/g, "     ").length;
      return Math.min(6, Math.round(lead / 5) || (lead ? 1 : 0));
    };
    if (lines.some((l) => depth(l) > 0)) {
      for (const l of lines) out.push(`<p${depth(l) ? ` data-indent="${depth(l)}"` : ""}>${escape(l.trim())}</p>`);
    } else {
      out.push(`<p>${lines.map((l) => escape(l.trim())).join("<br>")}</p>`);
    }
  }
  return out.join("");
}

/** The words alone, for excerpts and "is it empty?" checks. */
export const htmlToText = (html: string) =>
  html
    .replace(/<(br|\/p|\/h[1-6]|\/li|\/blockquote)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
