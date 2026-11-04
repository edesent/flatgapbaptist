import { events, services, TZ, type SpecialEvent } from "./site";

/**
 * Turns the weekly rules and special events in site.ts into dated entries.
 * Everything works on plain YYYY-MM-DD strings, so there are no time-zone
 * surprises; only "right now" is read in the church's own time zone.
 */

export type Entry = {
  date: string;
  time24: string;
  title: string;
  /** A service id from site.ts, or "event" for a special event. */
  kind: string;
  note: string;
  href?: string;
  when?: string;
  /** Set on special events that run several days. */
  endsOn?: string;
};

export function nowInChurch() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

const utc = (iso: string) => new Date(`${iso}T12:00:00Z`);
export const addDays = (iso: string, n: number) => {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const weekday = (iso: string) => utc(iso).getUTCDay();
const nthOfMonth = (iso: string) => Math.ceil(Number(iso.slice(8, 10)) / 7);
export const monthOf = (iso: string) => iso.slice(0, 7);

export function addMonths(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1, 12));
  return d.toISOString().slice(0, 7);
}

export function daysInMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0, 12)).getUTCDate();
}

export function fmtTime(time24: string) {
  const [h, m] = time24.split(":").map(Number);
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export function fmtDay(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }) {
  return utc(iso).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
}

export function servicesOn(iso: string): Entry[] {
  const dow = weekday(iso);
  const nth = nthOfMonth(iso);
  return services
    .filter((s) => s.dow === dow && (!s.nth || s.nth.includes(nth)))
    .map((s) => ({ date: iso, time24: s.time24, title: s.name, kind: s.id, note: s.note }));
}

export function eventsOn(iso: string): SpecialEvent[] {
  return events.filter((e) => e.start <= iso && iso <= e.endsOn);
}

const eventEntry = (e: SpecialEvent): Entry => ({
  date: e.start,
  time24: e.time24 ?? "00:00",
  title: e.title,
  kind: "event",
  note: e.summary,
  href: e.href,
  when: e.when,
  endsOn: e.endsOn,
});

/** Everything that starts on a day in [start, end], services and events together. */
export function entriesBetween(start: string, end: string): Entry[] {
  const out: Entry[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    out.push(...servicesOn(d));
    for (const e of events) if (e.start === d) out.push(eventEntry(e));
  }
  return out.sort((a, b) => (a.date + a.time24).localeCompare(b.date + b.time24));
}

/** What is coming up from this moment on. Events still running count as "now". */
export function upcoming(limit: number, horizonDays = 120): Entry[] {
  const now = nowInChurch();
  const list: Entry[] = [];
  for (const e of events) {
    if (e.endsOn < now.date) continue;
    if (e.start <= now.date) list.push({ ...eventEntry(e), date: now.date });
  }
  const dated = entriesBetween(now.date, addDays(now.date, horizonDays)).filter((x) => {
    if (x.date !== now.date) return true;
    const [h, m] = x.time24.split(":").map(Number);
    return h * 60 + m >= now.minutes - 90 || x.kind === "event";
  });
  const seen = new Set(list.map((x) => x.title + x.date));
  for (const x of dated) if (!seen.has(x.title + x.date)) list.push(x);
  return list.sort((a, b) => (a.date + a.time24).localeCompare(b.date + b.time24)).slice(0, limit);
}

const excludedFromNext = new Set(services.filter((s) => s.excludeFromNext).map((s) => s.id));

export function nextService(): Entry | null {
  return upcoming(40).find((x) => x.kind !== "event" && !excludedFromNext.has(x.kind)) ?? null;
}

/** The next service plus any others on that same day (e.g. Sunday School and Worship), in time order. */
export function nextServices(): Entry[] {
  const first = nextService();
  if (!first) return [];
  return upcoming(40).filter((x) => x.kind !== "event" && !excludedFromNext.has(x.kind) && x.date === first.date);
}

export function relativeDay(iso: string) {
  const today = nowInChurch().date;
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  return fmtDay(iso, { weekday: "long", month: "short", day: "numeric" });
}
