import { sessionEmail } from "@/edit/auth";
import { deployState } from "@/edit/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Has the commit from a publish reached the live site yet? */
export async function GET(req: Request) {
  if (!(await sessionEmail())) return Response.json({ error: "Sign in again." }, { status: 401 });
  const commit = new URL(req.url).searchParams.get("commit") ?? "";
  if (!/^[0-9a-f]{40}$/.test(commit)) return Response.json({ error: "Bad commit." }, { status: 400 });
  return Response.json({ state: await deployState(commit) }, { headers: { "cache-control": "no-store" } });
}
