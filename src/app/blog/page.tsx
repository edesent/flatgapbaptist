import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { excerpt, longDate, posts } from "@/lib/blog";
import { church } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog",
  description: `News and articles from ${church.name} in ${church.city}, ${church.state}.`,
  alternates: { canonical: "/blog" },
};

/** Every article, newest first. Pastor Eric writes them from /edit → Blog (src/content/blog.json). */
export default function BlogPage() {
  return (
    <>
      <SiteHeader />
      <section className="wrap pt-12 pb-16 md:pt-16 md:pb-24">
        <p className="kicker">From the Pastor's Pen</p>
        <h1 className="mt-3 font-display text-[2.6rem] leading-[1.02] md:text-[4rem]">Blog</h1>

        {posts.length ? (
          <ul className="mt-10 divide-y divide-rule border-y border-rule md:mt-14">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="group grid gap-5 py-8 sm:grid-cols-[11rem_1fr] sm:gap-8 md:py-10">
                  {p.photo ? (
                    <img
                      src={p.photo.src}
                      alt={p.photo.alt}
                      className="aspect-[4/3] w-full rounded-sm border border-rule object-cover sm:w-[11rem]"
                    />
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                  <div>
                    <p className="time text-[0.95rem] font-semibold text-ink-soft">{longDate(p.date)}</p>
                    <h2 className="mt-1 font-display text-[1.7rem] leading-tight group-hover:text-brick md:text-[2rem]">{p.title}</h2>
                    <p className="mt-3 text-ink-soft">{excerpt(p.body)}</p>
                    <p className="mt-3 font-sans text-[0.95rem] font-bold text-brick">Read it →</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 text-ink-soft">Coming soon.</p>
        )}
      </section>
      <SiteFooter />
    </>
  );
}
