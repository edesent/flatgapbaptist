import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS, SESSION_PATH, emailFromLink, sessionToken } from "@/edit/auth";
import { afterSignIn, canSignInFrom, requestOrigin } from "@/edit/hosts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The link from the sign-in email: trade it for a 30-day session cookie, then open /edit (or /analytics). */
export async function GET(req: Request) {
  if (!canSignInFrom(req.headers.get("host"))) return new Response("Not found", { status: 404 });
  const origin = requestOrigin(req);

  const params = new URL(req.url).searchParams;
  const page = afterSignIn(params.get("next"));
  const email = emailFromLink(params.get("t") ?? undefined);
  if (!email) return NextResponse.redirect(`${origin}${page}?signin=expired`, 303);

  const res = NextResponse.redirect(`${origin}${page}`, 303);
  res.cookies.set(SESSION_COOKIE, sessionToken(email), {
    httpOnly: true,
    secure: origin.startsWith("https:"),
    sameSite: "lax",
    path: SESSION_PATH,
    maxAge: SESSION_DAYS * 86_400,
  });
  return res;
}
