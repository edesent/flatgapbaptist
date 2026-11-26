"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import VerseText from "@/components/VerseText";
import { naturePhotos } from "@/content/nature-photos";
import { dailyIndex, easternDayLabel, easternDayNumber, type DailyVerse } from "@/lib/daily-pick";

// The verse page imports this type from here.
export type { DailyVerse } from "@/lib/daily-pick";

/**
 * Shows one verse per day, changing at midnight Eastern time. The verses are
 * stepped through in a scattered (but fixed) order so neighboring days aren't
 * from the same part of the Bible, and the cycle repeats once all have been shown.
 * A nature photo shows below the verse, changing on the same day. The home page
 * picks its verse the same way, so the two pages always agree.
 */
export default function VerseOfTheDay({ verses }: { verses: DailyVerse[] }) {
  const [day, setDay] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [photoFailed, setPhotoFailed] = useState(false);

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
  const photo = naturePhotos.length > 0 ? naturePhotos[dailyIndex(day, naturePhotos.length)] : null;

  return (
    <div className="mt-8 max-w-[40rem]">
      <p className="font-sans text-[0.95rem] font-semibold text-ink-soft">{label}</p>
      <blockquote className="mt-4 border-l-4 border-brick pl-5 text-[1.5rem] leading-relaxed md:text-[1.8rem]">
        <VerseText text={v.text} />
      </blockquote>
      <p className="mt-4 font-display text-[1.4rem]">{v.ref}</p>
      <p className="mt-3 font-sans font-semibold">
        <Link href={v.href} className="link">
          Read this verse in our King James Bible →
        </Link>
      </p>
      {photo && !photoFailed && (
        <figure className="mt-6">
          {/* Shown whole, never cropped, as the photographers' licences expect. If the photo can't load, it is hidden. */}
          <img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            loading="lazy"
            onError={() => setPhotoFailed(true)}
            className="h-auto w-full rounded-sm border border-rule"
          />
          <figcaption className="mt-2 font-sans text-[0.85rem] leading-snug text-ink-soft">
            “{photo.title}” by{" "}
            <a href={photo.creditUrl} target="_blank" rel="noopener" className="link">
              {photo.credit}
            </a>
            , used under{" "}
            <a href={photo.licenseUrl} target="_blank" rel="noopener" className="link">
              {photo.license}
            </a>
            .
          </figcaption>
        </figure>
      )}
    </div>
  );
}
