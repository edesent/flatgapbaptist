import { sessionEmail } from "@/edit/auth";
import { analyticsResponse } from "@/tools/site-analytics/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The visitor numbers for /analytics — only for someone signed in with the editor's emailed link. */
export const GET = (req: Request) => analyticsResponse(req, sessionEmail);
