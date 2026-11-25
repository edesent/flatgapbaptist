import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { loadBible } from "@/lib/bible";

// Only the 66 real books exist; anything else is a "not found" page.
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await loadBible()).map((b) => ({ book: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ book: string }> }): Promise<Metadata> {
  const { book } = await params;
  const b = (await loadBible()).find((x) => x.slug === book);
  if (!b) return {};
  return {
    title: `${b.name}, King James Bible`,
    description: `Read the book of ${b.name} in the King James Bible, chapter by chapter.`,
    alternates: { canonical: `/bible/${b.slug}` },
  };
}

/** One book of the Bible: its list of chapters. */
export default async function BookPage({ params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  const b = (await loadBible()).find((x) => x.slug === book);
  if (!b) notFound();

  return (
    <>
      <SiteHeader />
      <section className="wrap pt-12 pb-16 md:pt-16 md:pb-24">
        <p className="kicker">
          <Link href="/bible" className="hover:text-brick">
            King James Bible
          </Link>
        </p>
        <h1 className="mt-3 font-display text-[2.6rem] leading-[1.02] md:text-[4rem]">{b.name}</h1>
        <p className="mt-6 font-sans text-[1rem] text-ink-soft">
          {b.chapters.length} {b.chapters.length === 1 ? "chapter" : "chapters"}
        </p>
        <ul className="mt-6 grid max-w-[44rem] grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
          {b.chapters.map((c) => (
            <li key={c.number}>
              <Link
                href={`/bible/${b.slug}/${c.number}`}
                className="flex h-12 items-center justify-center rounded-sm border border-rule font-sans font-semibold hover:border-brick hover:text-brick"
              >
                {c.number}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <SiteFooter />
    </>
  );
}
