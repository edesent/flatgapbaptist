"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import VerseText from "@/components/VerseText";
import { dailyIndex, easternDayLabel, easternDayNumber, type DailyVerse } from "@/lib/daily-pick";

/**
 * Today's verse on the home page: the same verse the "A verse to meditate on"
 * page shows, picked the same way, so the two always agree. No picture here;
 * the picture is on the verse page, which the verse itself links to. Hovering
 * over the verse underlines it, and clicking it opens the verse page.
 */
export default function HomeVerse({ verses }: { verses: DailyVerse[] }) {
  const [day, setDay] = useState<number | null>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    const tick = () => {
      setDay(easternDayNumber());
      setLabel(easternDayLabel());
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

  const v = verses[dailyIndex(day, n)];

  return (
    <div className="mx-auto mt-8 max-w-[40rem]">
      <p className="font-sans text-[0.95rem] font-semibold text-ink-soft">{label}</p>
      <blockquote className="mt-4 text-[1.5rem] leading-relaxed md:text-[1.8rem]">
        <VerseText text={v.text} />
      </blockquote>
      <p className="mt-4 font-display text-[1.4rem]">
        <Link href="/verse" className="underline-offset-4 hover:text-brick hover:underline">
          {v.ref}
        </Link>
      </p>
    </div>
  );
}
