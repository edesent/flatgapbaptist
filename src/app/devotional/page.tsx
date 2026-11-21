import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Daily devotional",
  description: "Today’s Days of Praise devotional from the Institute for Creation Research, with a link to read the whole reading.",
  alternates: { canonical: "/devotional" },
};

// Check ICR's feed about every half hour, so a new day's reading shows up on its own.
export const revalidate = 1800;

const FEED = "https://www.icr.org/rss/daysofpraise_podcast.xml";
const ICR_DOP = "https://www.icr.org/articles/type/6";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Devo = {
  title: string;
  link: string;
  /** "Nov 21, 2026", used to find today's reading */
  key: string;
  /** "Saturday, November 21" */
  label: string;
  /** The verse first, then the opening of the reading. ICR's feed only gives this much. */
  paragraphs: string[];
};

/** Turns the few HTML entities ICR's feed uses back into plain characters. */
function decode(s: string): string {
  return s
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rsquo;/g, "’")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

/** Reads ICR's Days of Praise feed: each item is the verse and the opening of the reading, plus a link to the full reading on ICR.org. */
function parse(xml: string): Devo[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.flatMap((raw): Devo[] => {
    const get = (tag: string) => {
      const m = raw.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
    };
    const title = decode(get("title"));
    const link = get("link");
    const dm = get("pubDate").match(/(\d{1,2}) (\w{3}) (\d{4})/);
    if (!title || !dm || !link.startsWith("https://www.icr.org/")) return [];
    const day = Number(dm[1]);
    const month = MONTHS.indexOf(dm[2]);
    const year = Number(dm[3]);
    if (month < 0) return [];
    const paragraphs = get("description")
      .replace(/<audio[\s\S]*?<\/audio>/g, "")
      .split(/(?:<br\s*\/?>\s*){2,}/)
      .map((p) => decode(p.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .map((p) => p.replace(/\s*(?:\.\.\.|…)?\s*More\.\.\.$/, "…"));
    const label = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(
      new Date(Date.UTC(year, month, day)),
    );
    return [{ title, link, key: `${dm[2]} ${day}, ${year}`, label, paragraphs }];
  });
}

async function load(): Promise<Devo[]> {
  try {
    const res = await fetch(FEED, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    return parse(await res.text());
  } catch {
    return [];
  }
}

export default async function DevotionalPage() {
  const all = await load();
  // Today's date in the church's time zone (Eastern); otherwise the newest reading.
  const todayKey = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" }).format(
    new Date(),
  );
  const today = all.find((d) => d.key === todayKey) ?? all[0];
  const earlier = all.filter((d) => d !== today).slice(0, 6);

  return (
    <>
      <SiteHeader />
      <section className="wrap pt-12 pb-16 md:pt-16 md:pb-24">
        <p className="kicker">Days of Praise</p>
        <h1 className="mt-3 font-display text-[2.6rem] leading-[1.02] md:text-[4rem]">Daily devotional</h1>

        {today ? (
          <div className="mt-10 max-w-[40rem]">
            <p className="font-sans text-[0.95rem] font-semibold text-ink-soft">{today.label}</p>
            <h2 className="mt-2 font-display text-[2rem] leading-tight md:text-[2.4rem]">{today.title}</h2>
            {today.paragraphs.map((p, i) =>
              i === 0 ? (
                <blockquote key={i} className="mt-6 border-l-4 border-brick pl-5 text-[1.2rem] italic leading-relaxed md:text-[1.3rem]">
                  {p}
                </blockquote>
              ) : (
                <p key={i} className="mt-5 text-[1.1rem] leading-relaxed">
                  {p}
                </p>
              ),
            )}
            <p className="mt-6 font-sans font-semibold">
              <a href={today.link} target="_blank" rel="noopener" className="link">
                Read the whole devotional at ICR.org →
              </a>
            </p>
          </div>
        ) : (
          <div className="mt-10 max-w-[40rem]">
            <p className="text-[1.1rem] leading-relaxed">Today’s devotional couldn’t load just now. You can read it on the Institute for Creation Research website.</p>
            <p className="mt-4 font-sans font-semibold">
              <a href={ICR_DOP} target="_blank" rel="noopener" className="link">
                Open Days of Praise at ICR.org →
              </a>
            </p>
          </div>
        )}

        {earlier.length > 0 && (
          <div className="mt-14 max-w-[40rem] border-t border-rule pt-8">
            <h2 className="font-display text-[1.5rem]">Recent devotionals</h2>
            <ul className="mt-4 space-y-2">
              {earlier.map((d) => (
                <li key={d.link}>
                  <a href={d.link} target="_blank" rel="noopener" className="link font-sans font-semibold">
                    {d.title}
                  </a>
                  <span className="ml-2 font-sans text-[0.9rem] text-ink-soft">{d.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-14 max-w-[40rem] font-sans text-[0.85rem] leading-snug text-ink-soft">
          <em>Days of Praise</em> is a devotional of the{" "}
          <a href="https://www.icr.org" target="_blank" rel="noopener" className="link">
            Institute for Creation Research
          </a>
          . Following ICR’s use policy, we show the verse and the opening of each reading and link to the full devotional on their website. © Institute
          for Creation Research.
        </p>
      </section>
      <SiteFooter />
    </>
  );
}
