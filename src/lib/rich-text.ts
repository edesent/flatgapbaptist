import sanitizeHtml from "sanitize-html";
import { isHtml, textToHtml } from "./text-html";

/**
 * Article HTML is cleaned to the formatting the blog editor can make (headings,
 * bold/italic/underline, lists, indents, quotes, centering, links) whenever it
 * is saved and again when it is shown.
 */
const INDENTS = ["1", "2", "3", "4", "5", "6"];

export function cleanHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "hr", "a"],
    allowedAttributes: {
      a: ["href"],
      p: [{ name: "data-indent", multiple: false, values: INDENTS }, "style"],
      h2: [{ name: "data-indent", multiple: false, values: INDENTS }, "style"],
      h3: [{ name: "data-indent", multiple: false, values: INDENTS }, "style"],
    },
    allowedStyles: { "*": { "text-align": [/^(left|center|right|justify)$/] } },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      b: "strong",
      i: "em",
      a: (tagName, attribs) => {
        const external = /^https?:/i.test(attribs.href ?? "");
        return { tagName, attribs: external ? { ...attribs, target: "_blank", rel: "noopener" } : attribs };
      },
    },
    exclusiveFilter: (frame) => frame.tag === "a" && !frame.attribs.href,
  });
}

/** An article's body, plain text or HTML, as safe HTML for the page. */
export const bodyHtml = (body: string) => cleanHtml(isHtml(body) ? body : textToHtml(body));
