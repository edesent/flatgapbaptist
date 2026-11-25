"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import VerseText from "@/components/VerseText";

export type DailyVerse = { ref: string; href: string; chapterHref: string; chapterLabel: string; text: string };

/** Today's date in the church's time zone (Eastern) as a whole number of days. It rolls over at midnight Eastern. */
function easternDay(): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Math.floor(Date.UTC(get("year"), get("month") - 1, get("day")) / 86400000);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** "Wednesday, November 25" for the Eastern-time day. */
function easternLabel(): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" }).format(new Date());
}

/**
 * Shows one verse per day, changing at midnight Eastern time. The verses are
 * stepped through in a scattered (but fixed) order so neighboring days aren't
 * from the same part of the Bible, and the cycle repeats once all have been shown.
 */
export default function VerseOfTheDay({ verses }: { verses: DailyVerse[] }) {
  const [day, setDay] = useState<number | null>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    const tick = () => {
      setDay(easternDay());
      setLabel(easternLabel());
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const n = verses.length;
  if (!n) return null;

  if (day === null) {
    // Shown only for an instant before the page works out today's verse.
    return <p className="mt-8 font-sans text-ink-soft">Loading today’s verse…</p>;
  }

  let stride = 7;
  while (gcd(stride, n) !== 1) stride++;
  const v = verses[(((day * stride) % n) + n) % n];

  return (
    <div className="mt-8 max-w-[40rem]">
      <p className="font-sans text-[0.95rem] font-semibold text-ink-soft">{label}</p>
      <blockquote className="mt-4 border-l-4 border-brick pl-5 text-[1.5rem] leading-relaxed md:text-[1.8rem]">
        <VerseText text={v.text} />
      </blockquote>
      <p className="mt-4 font-display text-[1.4rem]">{v.ref}</p>
      <p className="mt-5 font-sans font-semibold">
        <Link href={v.href} className="link">
          Read this verse in our King James Bible →
        </Link>
      </p>
      <p className="mt-2 font-sans font-semibold">
        <Link href={v.chapterHref} className="link">
          Read all of {v.chapterLabel} →
        </Link>
      </p>
    </div>
  );
}
