import { sameOrigin, sessionEmail } from "@/edit/auth";
import { snapshot } from "@/edit/github";
import { json, readJson, save, tidyText } from "@/edit/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The Our Pastor page's text (src/content/pastor.json), read and saved by the editor's Pastor panel. */
const FILE = "src/content/pastor.json";
type Pastor = { body: string };

export async function GET() {
  if (!(await sessionEmail())) return Response.json({ error: "Sign in again." }, { status: 401 });
  try {
    const snap = await snapshot({ withFiles: false });
    return Response.json(await readJson<Pastor>(FILE, snap, { body: "" }), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("pastor read", e);
    return Response.json({ error: "Couldn’t read the pastor page. Try again in a minute." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const email = await sessionEmail();
  if (!email) return Response.json({ error: "Your sign-in ran out. Sign in again to save." }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: "Bad origin." }, { status: 403 });
  const b = ((await req.json().catch(() => null)) ?? {}) as { body?: unknown };
  // Emptying it is allowed: the page then shows just the photo, name and welcome line.
  const body = tidyText(b.body, 30000) ?? "";
  try {
    return await save(async () => ({
      changes: [{ path: FILE, content: json({ body }) }],
      message: `Update the Our Pastor page\n\nBy ${email} on ${req.headers.get("host")}.`,
    }));
  } catch (e) {
    console.error("pastor save", e);
    return Response.json({ error: "Saving failed. Nothing was changed. Try again in a minute." }, { status: 502 });
  }
}
