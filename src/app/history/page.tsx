import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { history, paragraphs } from "@/lib/blog";
import { church } from "@/lib/site";

export const metadata: Metadata = {
  title: "Our history",
  description: `The history of ${church.name} in ${church.city}, ${church.county}, ${church.state}.`,
  alternates: { canonical: "/history" },
};

/** The church's history. Pastor Eric writes it from /edit → History (src/content/history.json). */
export default function HistoryPage() {
  return (
    <>
      <SiteHeader />
      <section className="wrap pt-12 pb-10 md:pt-16">
        <p className="kicker">{church.name}</p>
        <h1 className="mt-3 font-display text-[2.6rem] leading-[1.02] md:text-[4rem]">Our history</h1>
      </section>
      <figure>
        <img
          src="/photos/church-building.jpg"
          alt="Flat Gap Baptist Church, a brick building with a white steeple, on Flat Gap Drive"
          width={1600}
          height={877}
          className="block h-[18rem] w-full object-cover object-[64%_40%] sm:h-[26rem] md:h-[32rem]"
        />
      </figure>
      <article className="wrap max-w-[46rem] py-12 md:py-16">
        {paragraphs(history.body).map((p, i) => (
          <p key={i} className={`whitespace-pre-line ${i ? "mt-6" : "text-[1.25rem] leading-relaxed md:text-[1.45rem]"}`}>
            {p}
          </p>
        ))}
      </article>
      <SiteFooter />
    </>
  );
}
