import { sameOrigin, sessionEmail } from "@/edit/auth";
import { snapshot, type FileChange, type Snapshot } from "@/edit/github";
import { isRealDate, json, readJson, save, tidy, tidyText } from "@/edit/content";
import type { Post } from "@/lib/blog";
import { church } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The editor's Blog panel (src/content/blog.json).
 *
 *   GET                                         → { posts }
 *   POST { slug?, title, date, body, photo }    → add, or change the article `slug`
 *        photo: { keep: true } | { sha } (from /api/edit/photo) | null (none)
 *   DELETE { slug }                             → remove it (and a photo the editor uploaded for it)
 */

const FILE = "src/content/blog.json";
const DIR = "public/blog";

const newestFirst = (list: Post[]) => [...list].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60)
      .replace(/-$/, "") || "article"
  );
}

/** A photo file this editor uploaded (kept under public/blog), so removing the article can clean it up. */
const ownPhoto = (post: Post | undefined, snap: Snapshot) => {
  const path = post?.photo ? `public${post.photo.src}` : "";
  return path.startsWith(`${DIR}/`) && snap.paths.has(path) ? path : null;
};

export async function GET() {
  if (!(await sessionEmail())) return Response.json({ error: "Sign in again." }, { status: 401 });
  try {
    const snap = await snapshot({ withFiles: false });
    return Response.json({ posts: newestFirst(await readJson<Post[]>(FILE, snap, [])) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("blog read", e);
    return Response.json({ error: "Couldn’t read the articles. Try again in a minute." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const email = await sessionEmail();
  if (!email) return Response.json({ error: "Your sign-in ran out. Sign in again to save." }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: "Bad origin." }, { status: 403 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;

  const title = tidy(b.title, 140);
  if (!title) return Response.json({ error: "Give the article a title." }, { status: 400 });
  if (!isRealDate(b.date)) return Response.json({ error: "Pick the article’s date." }, { status: 400 });
  const date = b.date;
  const body = tidyText(b.body, 30000);
  if (!body) return Response.json({ error: "Write the article before saving it." }, { status: 400 });
  const slug = typeof b.slug === "string" ? b.slug : undefined;
  const photoIn = b.photo as { keep?: unknown; sha?: unknown } | null | undefined;
  const newSha = typeof photoIn?.sha === "string" && /^[0-9a-f]{40}$/.test(photoIn.sha) ? photoIn.sha : null;
  const keep = photoIn?.keep === true;

  try {
    return await save(async (snap) => {
      const list = await readJson<Post[]>(FILE, snap, []);
      const existing = slug ? list.find((p) => p.slug === slug) : undefined;
      if (slug && !existing) return Response.json({ error: "That article is no longer on the site. Close this and open Blog again." }, { status: 409 });

      let id = existing?.slug ?? slugify(title);
      for (let n = 2; !existing && list.some((p) => p.slug === id); n++) id = `${slugify(title)}-${n}`;

      const changes: FileChange[] = [];
      let photo: Post["photo"];
      const alt = `${title}, ${church.name}`;
      if (newSha) {
        const name = `${id}-${Date.now().toString(36)}.jpg`;
        changes.push({ path: `${DIR}/${name}`, sha: newSha });
        photo = { src: `/blog/${name}`, alt };
      } else if (keep && existing?.photo) {
        photo = existing.photo;
      }
      const old = ownPhoto(existing, snap);
      if (old && photo?.src !== existing?.photo?.src) changes.push({ path: old, remove: true });

      const post: Post = { slug: id, title, date, body, ...(photo ? { photo } : {}) };
      changes.push({ path: FILE, content: json(newestFirst([...list.filter((p) => p.slug !== id), post])) });
      return { changes, message: `${existing ? "Change" : "Add"} article: ${title}\n\nBy ${email} on ${req.headers.get("host")}.` };
    });
  } catch (e) {
    console.error("blog save", e);
    return Response.json({ error: "Saving failed. Nothing was changed. Try again in a minute." }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  const email = await sessionEmail();
  if (!email) return Response.json({ error: "Your sign-in ran out. Sign in again." }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: "Bad origin." }, { status: 403 });
  const b = (await req.json().catch(() => null)) as { slug?: unknown } | null;
  const slug = typeof b?.slug === "string" ? b.slug : "";
  if (!slug) return Response.json({ error: "Which article?" }, { status: 400 });
  try {
    return await save(async (snap) => {
      const list = await readJson<Post[]>(FILE, snap, []);
      const existing = list.find((p) => p.slug === slug);
      if (!existing) return Response.json({ error: "That article is already gone." }, { status: 409 });
      const old = ownPhoto(existing, snap);
      return {
        changes: [...(old ? [{ path: old, remove: true as const }] : []), { path: FILE, content: json(list.filter((p) => p.slug !== slug)) }],
        message: `Remove article: ${existing.title}\n\nBy ${email} on ${req.headers.get("host")}.`,
      };
    });
  } catch (e) {
    console.error("blog remove", e);
    return Response.json({ error: "Removing failed. Nothing was changed. Try again in a minute." }, { status: 502 });
  }
}
