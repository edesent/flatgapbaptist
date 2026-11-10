import type { Metadata } from "next";
import { Fragment } from "react";
import PrayerModal from "@/components/PrayerModal";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { paragraphs } from "@/lib/blog";
import pastorFile from "@/content/pastor.json";
import { church, pastor } from "@/lib/site";

const pastorBio = paragraphs(pastorFile.body).filter((p) => p.trim());

export const metadata: Metadata = {
  title: "Our pastor",
  description: `Meet ${pastor.title} ${pastor.name} of ${church.name} in ${church.city}, ${church.state}.`,
  alternates: { canonical: "/pastor" },
};

/** Our Pastor. Pastor Eric writes the text from /edit → Pastor (src/content/pastor.json). */
export default function PastorPage() {
  // The family photo goes after the paragraph ending with "Mamaw" (or the 2nd paragraph if that is reworded).
  const mamaw = pastorBio.findIndex((p) => /mamaw/i.test(p));
  const photoAfter = pastorBio.length ? (mamaw >= 0 ? mamaw : Math.min(1, pastorBio.length - 1)) : -1;
  return (
    <>
      <SiteHeader />
      <section className="wrap pt-12 pb-16 md:pt-16 md:pb-24">
        <p className="kicker">{church.name}</p>
        <h1 className="mt-3 font-display text-[2.6rem] leading-[1.02] md:text-[4rem]">Our pastor</h1>

        <div className="mt-10 grid gap-10 md:grid-cols-[16rem_1fr] md:gap-14">
          <div>
            <img
              src="/photos/pastor-face.jpg"
              alt={`${pastor.title} ${pastor.name}`}
              className="aspect-square w-full max-w-[16rem] rounded-sm border border-rule object-cover"
            />
            {/* Laptops and tablets: the prayer line and button sit under the photo. Phones get the button below the biography. */}
            <div className="mt-5 hidden max-w-[16rem] md:block">
              <p className="text-ink-soft">
                If you need prayer, a visit, or someone to talk to about the Lord, {pastor.first} is glad to hear from you.
              </p>
              <p className="mt-4">
                <PrayerModal />
              </p>
            </div>
          </div>
          <div className="max-w-[40rem]">
            <p className="font-display text-[2rem] leading-tight md:text-[2.4rem]">
              {pastor.title} {pastor.name}
            </p>
            {pastorBio.map((p, i) => (
              <Fragment key={i}>
                <p className={`whitespace-pre-line ${i ? "mt-5" : "mt-5 text-[1.2rem] leading-relaxed md:text-[1.35rem]"}`}>{p}</p>
                {i === photoAfter && (
                  <figure className="mt-6">
                    <img
                      src="/gallery/gallery-49.jpg"
                      alt="Most of our family"
                      className="h-auto w-full rounded-sm border border-rule"
                    />
                    <figcaption className="mt-3 font-sans text-[0.85rem] leading-snug text-ink-soft">Most of our family. God has blessed me in so many ways!</figcaption>
                  </figure>
                )}
              </Fragment>
            ))}
            <p className="mt-4 md:hidden">
              <PrayerModal />
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
