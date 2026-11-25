import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { excerpt, longDate, postBySlug, posts } from "@/lib/blog";
import { loadBible } from "@/lib/bible";
import { linkBibleReferences } from "@/lib/bible-links";
import { bodyHtml } from "@/lib/rich-text";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = postBySlug((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: excerpt(post.body, 160),
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, ...(post.photo ? { images: [post.photo.src] } : {}) },
  };
}

export default async function PostPage({ params }: Props) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();
  const books = await loadBible();
  // Oldest to newest, so "previous" is the article before this one by date and "next" is the one after it.
  const byDate = [...posts].sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
  const at = byDate.findIndex((p) => p.slug === post.slug);
  const older = at > 0 ? byDate[at - 1] : null;
  const newer = at >= 0 && at < byDate.length - 1 ? byDate[at + 1] : null;
  return (
    <>
      <SiteHeader />
      <article className="wrap max-w-[46rem] pt-12 pb-16 md:pt-16 md:pb-24">
        <Link href="/blog" className="font-sans text-[0.95rem] font-bold text-brick hover:underline">
          ← All articles
        </Link>
        <p className="time mt-8 text-[0.95rem] font-semibold text-ink-soft">{longDate(post.date)}</p>
        <h1 className="mt-2 font-display text-[2.4rem] leading-[1.05] md:text-[3.4rem]">{post.title}</h1>
        {post.photo && (
          <img
            src={post.photo.src}
            alt={post.photo.alt}
            className="mx-auto mt-8 max-h-[80vh] w-auto max-w-full rounded-sm border border-rule shadow-[0_18px_50px_-30px_rgba(29,27,23,0.55)]"
          />
        )}
        {/* Cleaned to the editor's formatting in src/lib/rich-text.ts. */}
        <div className="rich mt-8" dangerouslySetInnerHTML={{ __html: linkBibleReferences(bodyHtml(post.body), books) }} />

        <nav aria-label="Other articles" className="mt-14 grid gap-6 border-t border-rule pt-6 sm:grid-cols-2">
          {older ? (
            <Link href={`/blog/${older.slug}`} className="block font-sans font-semibold hover:text-brick">
              <span className="text-[0.85rem] text-ink-soft">← Previous article</span>
              <span className="mt-1 block text-[1.05rem] leading-snug">{older.title}</span>
              <span className="time mt-1 block text-[0.85rem] font-normal text-ink-soft">{longDate(older.date)}</span>
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link href={`/blog/${newer.slug}`} className="block font-sans font-semibold hover:text-brick sm:text-right">
              <span className="text-[0.85rem] text-ink-soft">Next article →</span>
              <span className="mt-1 block text-[1.05rem] leading-snug">{newer.title}</span>
              <span className="time mt-1 block text-[0.85rem] font-normal text-ink-soft">{longDate(newer.date)}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
        <p className="mt-8 font-sans text-[0.95rem]">
          <Link href="/blog" className="font-bold text-brick hover:underline">
            ← All articles
          </Link>
        </p>
      </article>
      <SiteFooter />
    </>
  );
}
