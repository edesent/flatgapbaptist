import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import VerseOfTheDay from "@/components/VerseOfTheDay";
import { loadDailyVerses } from "@/lib/daily-verse";

export const metadata: Metadata = {
  title: "A verse to meditate on",
  description: "A new King James Bible verse each day to read and think about, from Flat Gap Baptist Church.",
  alternates: { canonical: "/verse" },
};

/** A new verse and photo each day. The verse comes from our own King James text and is chosen in the visitor's browser by Eastern-time date, so it changes at midnight Eastern. The home page picks its verse the same way, so the two always agree. */
export default async function VersePage() {
  const verses = await loadDailyVerses();
  return (
    <>
      <SiteHeader />
      <section className="wrap pt-12 pb-16 md:pt-16 md:pb-24">
        <p className="kicker">God’s Word</p>
        <h1 className="mt-3 font-display text-[2.6rem] leading-[1.02] md:text-[4rem]">A verse to meditate on</h1>
        <p className="mt-6 max-w-[40rem] text-[1.1rem] leading-relaxed">
          A new verse each day. Read it slowly, and think about it through the day.
        </p>
        <VerseOfTheDay verses={verses} />
        <noscript>
          <p className="mt-8 max-w-[40rem] text-[1.1rem] leading-relaxed">
            Today’s verse needs JavaScript to appear. You can read the whole Bible on our{" "}
            <Link href="/bible" className="link">
              King James Bible
            </Link>{" "}
            pages.
          </p>
        </noscript>
      </section>
      <SiteFooter />
    </>
  );
}
