import { sameOrigin, sessionEmail } from "@/edit/auth";
import { createBlob } from "@/edit/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The editor shrinks every photo to a JPEG well under this before sending it. */
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * One photo, as JPEG bytes. It is stored on GitHub straight away and its id
 * comes back; the article save then commits the photo with the article, so an
 * article is never half posted.
 */
export async function POST(req: Request) {
  if (!(await sessionEmail())) return Response.json({ error: "Your sign-in ran out. Sign in again." }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: "Bad origin." }, { status: 403 });
  const bytes = Buffer.from(await req.arrayBuffer());
  if (!bytes.length) return Response.json({ error: "That photo was empty." }, { status: 400 });
  if (bytes.length > MAX_BYTES) return Response.json({ error: "That photo is too large." }, { status: 413 });
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return Response.json({ error: "That file isn’t a picture we can use." }, { status: 415 });
  }
  try {
    return Response.json({ sha: await createBlob(bytes) });
  } catch (e) {
    console.error("photo upload", e);
    return Response.json({ error: "Uploading the photo failed. Try again in a minute." }, { status: 502 });
  }
}
