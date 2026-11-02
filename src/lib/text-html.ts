/**
 * Articles used to be plain text (a blank line between paragraphs); the blog
 * editor now saves HTML. These read either. No dependencies, so the editor
 * can use them in the browser too.
 */

export const isHtml = (body: string) => /^\s*</.test(body);

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Plain text → <p> per paragraph, single line breaks kept as <br>. */
export const textToHtml = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escape(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

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
