import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { church } from "@/lib/site";

/**
 * One endpoint for every form on the site: prayer requests and contact.
 * Add a kind (e.g. "pantry", "ride") by writing another *Message() function
 * below and a branch in POST.
 *
 * Messages go to FORM_WEBHOOK_URL — a Slack (or Teams) incoming webhook — so
 * they reach the pastor's phone in seconds. Until that is set the endpoint
 * answers 503 and the form honestly tells people to call the church.
 *
 * Spam defences: a signed load-time token (GET) that must be at least 3
 * seconds old, a honeypot field, a per-IP rate limit, an allowlist of fields,
 * and a rule that free-text answers may not contain links. Anything that
 * trips a defence gets a fake success and is dropped.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.FORM_SECRET || process.env.FORM_WEBHOOK_URL || "";
const MIN_FILL_MS = 3000;
const MAX_AGE_MS = 1000 * 60 * 60 * 6;

function sign(ts: string) {
  return createHmac("sha256", SECRET).update(ts).digest("hex");
}

function tokenOk(token: unknown) {
  if (!SECRET) return true; // nothing to sign with yet; the webhook is unset too
  if (typeof token !== "string") return false;
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return false;
  const expected = Buffer.from(sign(ts));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given))
    return false;
  const age = Date.now() - Number(ts);
  return age >= MIN_FILL_MS && age <= MAX_AGE_MS;
}

export async function GET() {
  const ts = String(Date.now());
  return NextResponse.json(
    { token: SECRET ? `${ts}.${sign(ts)}` : `${ts}.${randomBytes(8).toString("hex")}` },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// Best-effort, per serverless instance.
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

const clean = (v: unknown, max = 2000) =>
  typeof v === "string"
    ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max)
    : "";

const hasLink = (s: string) => /(https?:\/\/|www\.|\.(com|net|ru|xyz|top)\b)/i.test(s);
// A "phone or email" answer: an email address is fine, a URL is not.
const badContact = (s: string) => /(https?:\/\/|www\.)/i.test(s) || (/\.(com|net|ru|xyz|top)\b/i.test(s) && !s.includes("@"));
const okEmail = (s: string) => !s || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
const fake = () => NextResponse.json({ ok: true });

type Body = Record<string, unknown>;

function prayerMessage(b: Body) {
  const request = clean(b.request, 3000);
  const name = clean(b.name, 80);
  const contact = clean(b.contact, 120);
  const confidential = b.confidential === true || b.confidential === "on";
  const wantsCall = b.wantsCall === true || b.wantsCall === "on";
  if (!request) return { error: "Please tell us what we can pray about." };
  if ([request, name].some(hasLink) || badContact(contact)) return { spam: true };
  if (wantsCall && !contact) return { error: "Leave a phone number or email so we can reach you." };
  return {
    text: [
      `*🙏 Prayer request — ${church.short} website*`,
      confidential && "_Pastor only — please keep confidential_",
      `>${request.replace(/\n/g, "\n>")}`,
      name && `*Name:* ${name}`,
      contact && `*Contact:* ${contact}`,
      wantsCall && "📞 *Would like someone to call*",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function contactMessage(b: Body) {
  const name = clean(b.name, 80);
  const email = clean(b.email, 120);
  const phone = clean(b.phone, 40);
  const topic = clean(b.topic, 60);
  const message = clean(b.message, 4000);
  if (name.split(/\s+/).filter(Boolean).length < 2)
    return { error: "Please give your first and last name." };
  if (!message) return { error: "Please write a message." };
  if (!email && !phone) return { error: "Leave an email or phone so we can reply." };
  if (!okEmail(email)) return { error: "That email address does not look right." };
  if ([name, message, topic].some(hasLink)) return { spam: true };
  return {
    text: [
      `*New message — ${church.short} website*`,
      `*Name:* ${name}`,
      email && `*Email:* ${email}`,
      phone && `*Phone:* ${phone}`,
      topic && `*About:* ${topic}`,
    ]
      .filter(Boolean)
      .concat("", message)
      .join("\n"),
  };
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 12_000) return NextResponse.json({ error: "Too long." }, { status: 413 });

  let body: Body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.website || body.company) return fake();
  if (!tokenOk(body.token)) return fake();

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(`${body.kind}:${ip}`)) return fake();

  const built =
    body.kind === "prayer"
      ? prayerMessage(body)
      : body.kind === "contact"
        ? contactMessage(body)
        : null;
  if (!built) return NextResponse.json({ error: "Unknown form." }, { status: 400 });
  if ("spam" in built) return fake();
  if ("error" in built) return NextResponse.json({ error: built.error }, { status: 400 });

  const webhook = process.env.FORM_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json(
      {
        error:
          "Our online form isn’t connected yet. Please call the church — we’d love to hear from you.",
      },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: built.text }),
    });
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    return NextResponse.json(
      { error: "We couldn’t send that just now. Please call the church instead." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
