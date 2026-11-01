/**
 * Everything a pastor or volunteer is likely to change lives in this file:
 * service times, special events, address and phone.
 *
 * Sources: the Small Church Grant entry Pastor Eric Lauterwasser sent in
 * (October 2026: name, address, the Fish Fry and Gospel Sing), his emails of
 * October 23 and October 25, 2026 (service times, attendance, phone, pastor
 * history), and the church's Google Maps listing (church phone).
 */

import eventsFile from "@/content/events.json";
import noticeFile from "@/content/notice.json";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://flatgapbaptist.elijahdesent.com";

/**
 * Preview hosts stay out of search. Once NEXT_PUBLIC_SITE_URL is set to the
 * church's real domain this turns off by itself.
 */
export const isDemo = /(\.dfd\.llc|\.vercel\.app|\.elijahdesent\.com)$/.test(new URL(siteUrl).hostname);

/** The church's own time zone. Every "today" and "next service" is worked out here. */
export const TZ = "America/New_York";

export const church = {
  name: "Flat Gap Baptist Church",
  short: "Flat Gap Baptist",
  street: "Flat Gap Drive",
  streetNumber: "75",
  city: "Flat Gap",
  stateCode: "KY",
  state: "Kentucky",
  zip: "41219",
  county: "Johnson County",
  /** Per Pastor Eric's email, October 25, 2026. */
  attendance: "50",
  /**
   * The church phone from its Google listing, base64'd so it never sits in
   * the HTML for scrapers: `printf 6062654800 | base64`. Rendered by
   * components/Phone.tsx. Never type the digits into a page.
   */
  phoneB64: "NjA2MjY1NDgwMA==",
  mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=Flat+Gap+Baptist+Church,+75+Flatgap+Dr,+Flatgap,+KY+41219",
  facebook: "",
  youtube: "",
};

export const pastor = {
  name: "Eric Lauterwasser",
  first: "Eric",
  title: "Pastor",
  /** His home number, from his email of October 25, 2026: `printf 6062973878 | base64`. */
  phoneB64: "NjA2Mjk3Mzg3OA==",
};

/** Per Pastor Eric's email, October 29, 2026 (dropped "today" — the next sentence already has one). */
export const pastorHistory = "Brother Harold Salyer was the pastor from 1964 through 1991 and still faithfully attends.";

/**
 * The regular week. `nth` limits a service to certain weeks of the month
 * (e.g. worship on the first and third Sundays only).
 */
export type Service = {
  id: string;
  name: string;
  /** 0 = Sunday … 6 = Saturday */
  dow: number;
  time24: string;
  nth?: number[];
  rule: string;
  note: string;
  /** Still shown in the full service-times list, just left out of the homepage "Next:" banner. */
  excludeFromNext?: boolean;
};

// Confirmed by Pastor Eric's email, October 25, 2026.
export const services: Service[] = [
  { id: "school", name: "Sunday School", dow: 0, time24: "09:30", rule: "Sundays", note: "Meet in the fellowship hall." },
  { id: "worship", name: "Morning Worship", dow: 0, time24: "11:00", rule: "Sundays", note: "Hymns, prayer and preaching." },
  {
    id: "prayer",
    name: "Prayer Meeting",
    dow: 3,
    time24: "19:00",
    rule: "Wednesdays",
    note: "Bible study and prayer, March through October.",
    /** Pastor Eric's email, Nov 1, 2026: leave it out of the automatic "next" rotation. */
    excludeFromNext: true,
  },
];

/**
 * Special events. They live in src/content/events.json, which Pastor Eric
 * adds to, changes and clears from the editor at /edit. Each has a start date
 * and an `endsOn` date; it drops off the site by itself the day after it ends
 * (the layout re-renders hourly). Dates are YYYY-MM-DD.
 */
export type SpecialEvent = {
  id: string;
  title: string;
  start: string;
  endsOn: string;
  /** Shown instead of a time. Leave out when `time24` is set. */
  when?: string;
  time24?: string;
  summary: string;
  href?: string;
};

export const events = eventsFile as SpecialEvent[];

/**
 * One line across the top of the page ("Trunk or Treat this Saturday at 6!").
 * Lives in src/content/notice.json and is set from /edit. Empty text means no
 * notice; `until` (YYYY-MM-DD, optional) takes it down after that day.
 */
export type Notice = { text: string; until: string };
export const notice = noticeFile as Notice;

/** Online giving: none yet. Leave `url` empty and the site never shows a Give button. */
export const giving = {
  provider: "",
  url: "",
  label: "Give online",
};

/** One page; these jump to its sections. Keep labels short. */
export const nav: { href: string; label: string; short: string }[] = [
  { href: "#times", label: "Service times", short: "Times" },
  { href: "#saved", label: "How to be saved", short: "Saved" },
  { href: "#find", label: "Directions", short: "Directions" },
];
