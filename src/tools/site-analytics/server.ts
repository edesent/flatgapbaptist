import { analyticsConfig } from "./config";
import { ANALYTICS_KEY } from "./key";

const API = "https://www.elijahdesent.com/api/site-stats";

/**
 * Sign-in mode: the site's own route answers the page, only for a signed-in
 * editor, and fetches the numbers with the server-side key. Mount it at
 * src/app/api/edit/analytics/route.ts (under /api/edit, where the editor's
 * session cookie is sent):
 *
 *   import { sessionEmail } from "@/edit/auth";
 *   import { analyticsResponse } from "@/tools/site-analytics/server";
 *   export const dynamic = "force-dynamic";
 *   export const GET = (req: Request) => analyticsResponse(req, sessionEmail);
 */
export async function analyticsResponse(req: Request, signedInEmail: () => Promise<string | null>) {
  if (!(await signedInEmail())) return Response.json({ error: "signin" }, { status: 401, headers: { "cache-control": "no-store" } });
  const u = new URL(req.url);
  const q = new URLSearchParams({
    key: ANALYTICS_KEY,
    from: u.searchParams.get("from") ?? "",
    to: u.searchParams.get("to") ?? "",
    tz: analyticsConfig.timeZone,
  });
  try {
    const r = await fetch(`${API}?${q}`, { cache: "no-store" });
    return new Response(await r.text(), {
      status: r.status,
      headers: { "content-type": "application/json", "cache-control": "private, no-store" },
    });
  } catch {
    return Response.json({ error: "Couldn’t load the numbers. Try again in a minute." }, { status: 502 });
  }
}
