import { loadBible } from "@/lib/bible";

// Built once while the site is built, then served as a plain file. The search box on /bible downloads it the first time someone searches.
export const dynamic = "force-static";

export async function GET() {
  const books = await loadBible();
  const payload = {
    // n = name, s = web-address name, v = every verse as [chapter, verse, text]
    books: books.map((b) => ({
      n: b.name,
      s: b.slug,
      v: b.chapters.flatMap((c) => c.verses.map((v) => [c.number, v.number, v.text] as [number, number, string])),
    })),
  };
  return Response.json(payload);
}
