import { sameOrigin, sessionEmail } from "@/edit/auth";
import { recentSnapshot } from "@/edit/github";
import { describe, locate, routeFiles } from "@/edit/textmatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = { text?: unknown; context?: unknown };

/**
 * Which of the texts on a page can be traced to exactly one place in the
 * source. The editor only outlines those, so nothing it offers can fail to
 * save. Each answer is where the text lives ("Home page") or null.
 */
export async function POST(req: Request) {
  if (!(await sessionEmail())) return Response.json({ error: "Sign in again." }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: "Bad origin." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { path?: unknown; items?: Item[] } | null;
  const path = typeof body?.path === "string" ? body.path : "/";
  const items = Array.isArray(body?.items) ? body.items.slice(0, 800) : [];
  try {
    const snap = await recentSnapshot();
    const local = routeFiles(path, snap.files.keys());
    const results = items.map((it) => {
      if (typeof it?.text !== "string" || it.text.length > 2000) return null;
      const context = Array.isArray(it.context) ? it.context.filter((c): c is string => typeof c === "string").slice(0, 8) : [];
      const found = locate(snap.files, it.text, local, context);
      return found.ok ? describe(found.spot.file) : null;
    });
    return Response.json({ results }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("edit locate", e);
    return Response.json({ error: "Couldn’t read the site’s files. Try again in a minute." }, { status: 502 });
  }
}
