/**
 * The blog and the history page. Both live in src/content/*.json, which
 * Pastor Eric writes from the editor at /edit (Blog and History buttons, saved
 * through /api/edit/blog and /api/edit/history). Text is plain: a blank line
 * starts a new paragraph.
 */

import blogFile from "@/content/blog.json";
import historyFile from "@/content/history.json";

export type Photo = { src: string; alt: string };
export type Post = {
  slug: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  body: string;
  photo?: Photo;
};

/** Newest first. */
export const posts = [...(blogFile as Post[])].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

export const postBySlug = (slug: string) => posts.find((p) => p.slug === slug);

export const history = historyFile as { body: string };

/** Plain text → paragraphs, split on blank lines. */
export const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** The first paragraph, cut to about two lines, for the blog list. */
export function excerpt(text: string, max = 220) {
  const first = paragraphs(text)[0] ?? "";
  if (first.length <= max) return first;
  return `${first.slice(0, first.lastIndexOf(" ", max)).replace(/[,;:.!?-]+$/, "")}…`;
}

export const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
