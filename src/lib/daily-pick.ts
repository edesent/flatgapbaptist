/**
 * Picking today's verse (and photo). These small helpers are shared by the home
 * page and the "A verse to meditate on" page, so both always show the same verse.
 * They hold no Bible text, so they are safe to use in the visitor's browser.
 */

export type DailyVerse = { ref: string; href: string; chapterHref: string; chapterLabel: string; text: string };

/** Today's date in the church's time zone (Eastern) as a whole number of days. It rolls over at midnight Eastern. */
export function easternDayNumber(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Math.floor(Date.UTC(get("year"), get("month") - 1, get("day")) / 86400000);
}

/** "Wednesday, November 25" for the Eastern-time day. */
export function easternDayLabel(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" }).format(now);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Steps through a list in a scattered (but fixed) order so neighboring days
 * aren't next to each other in the list, and the cycle repeats once all have
 * been shown. The verse and the photo each use this with their own list length.
 */
export function dailyIndex(day: number, count: number): number {
  if (count <= 0) return 0;
  let stride = 7;
  while (gcd(stride, count) !== 1) stride++;
  return (((day * stride) % count) + count) % count;
}
