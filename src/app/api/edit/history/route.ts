import { sameOrigin, sessionEmail } from "@/edit/auth";
import { snapshot } from "@/edit/github";
import { json, readJson, save, tidyText } from "@/edit/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The history page's text (src/content/history.json), read and saved by the editor's History panel. */
const FILE = "src/content/history.json";
type History = { body: string };

export async function GET() {
  if (!(await sessionEmail())) return Response.json({ error: "Sign in again." }, { status: 401 });
  try {
    const snap = await snapshot({ withFiles: false });
    return Response.json(await readJson<History>(FILE, snap, { body: "" }), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("history read", e);
    return Response.json({ error: "Couldn’t read the history page. Try again in a minute." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const email = await sessionEmail();
  if (!email) return Response.json({ error: "Your sign-in ran out. Sign in again to save." }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: "Bad origin." }, { status: 403 });
  const b = ((await req.json().catch(() => null)) ?? {}) as { body?: unknown };
  const body = tidyText(b.body, 30000);
  if (!body) return Response.json({ error: "The history page can’t be empty." }, { status: 400 });
  try {
    return await save(async () => ({
      changes: [{ path: FILE, content: json({ body }) }],
      message: `Update the history page\n\nBy ${email} on ${req.headers.get("host")}.`,
    }));
  } catch (e) {
    console.error("history save", e);
    return Response.json({ error: "Saving failed. Nothing was changed. Try again in a minute." }, { status: 502 });
  }
}
