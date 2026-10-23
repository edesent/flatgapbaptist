/**
 * Everything a pastor or volunteer is likely to change lives in this file:
 * service times, special events, address and phone.
 *
 * Sources: the Small Church Grant entry Pastor Eric Lauterwasser sent in
 * (October 2026: name, address, attendance, the Fish Fry and Gospel Sing),
 * his email of October 23, 2026, and the church's Google Maps listing (church
 * phone, a review naming the founding pastor). Service times are a guess
 * until the church confirms them; see README "Confirm with the church".
 */

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
  /** From the grant entry: "15 to 50" on a Sunday. */
  attendance: "fifteen to fifty",
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
  /** His own number from the grant entry, base64'd like the church line. */
  phoneB64: "NjA2NzkzNTczNw==",
};

/** From a Google review by his grandson, Edward Crislip. */
export const foundingPastor = "Fredrick Crislip";

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
};

// TODO(confirm) typical times for a country Baptist church; the church has not sent its own yet.
export const services: Service[] = [
  { id: "school", name: "Sunday School", dow: 0, time24: "10:00", rule: "Sundays", note: "Classes for every age." },
  { id: "worship", name: "Morning Worship", dow: 0, time24: "11:00", rule: "Sundays", note: "Hymns, prayer and preaching." },
  { id: "prayer", name: "Prayer Meeting", dow: 3, time24: "19:00", rule: "Wednesdays", note: "Bible study and prayer." },
];

/**
 * Special events. Give each one a start date and an `endsOn` date; it drops
 * off the site by itself the day after it ends (the layout re-renders hourly).
 * Dates are YYYY-MM-DD.
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

// The next Fish Fry, a revival, the Christmas program… add them here.
export const events: SpecialEvent[] = [];

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
