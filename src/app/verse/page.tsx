import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Verse of the day",
  description: "A new King James Bible verse each day, from King James Bible Online.",
  alternates: { canonical: "/verse" },
};

/** The verse of the day: a free widget from kingjamesbibleonline.org that shows a new well-known verse each day. */
export default function VersePage() {
  return (
    <>
      <SiteHeader />
      <section className="wrap pt-12 pb-16 md:pt-16 md:pb-24">
        <p className="kicker">God’s Word</p>
        <h1 className="mt-3 font-display text-[2.6rem] leading-[1.02] md:text-[4rem]">A verse to meditate on</h1>
        <p className="mt-6 max-w-[40rem] text-[1.1rem] leading-relaxed">A new verse from the King James Bible each day, chosen from some of the best-known verses in Scripture.</p>

        {/* The widget lays itself out for 200 x 240, so we show it at that size and scale it up (the letters grow with it). */}
        <div className="relative mt-8 h-[335px] w-[310px] overflow-hidden sm:h-[305px] sm:w-[480px]">
          <iframe
            src="https://www.kingjamesbibleonline.org/popular-bible-verses-widget.php"
            title="Verse of the day, from King James Bible Online"
            width={200}
            height={240}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            className="absolute left-0 top-0 block h-[240px] w-[200px] origin-top-left scale-[1.55] border-0 sm:h-[210px] sm:w-[300px] sm:scale-[1.6]"
          />
        </div>
        <p className="mt-1 font-sans text-[0.85rem] text-ink-soft">
          From{" "}
          <a href="https://www.kingjamesbibleonline.org" target="_blank" rel="noopener" className="link">
            King James Bible Online
          </a>
          .
        </p>
      </section>
      <SiteFooter />
    </>
  );
}
