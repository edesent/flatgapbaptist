import FlatGapMap from "@/components/FlatGapMap";
import Phone from "@/components/Phone";
import PrayerModal from "@/components/PrayerModal";
import Ridges from "@/components/Ridges";
import { fmtDay, fmtTime, nextService, nowInChurch, relativeDay, upcoming, type Entry } from "@/lib/schedule";
import { church, nav, notice, pastor, pastorHistory, services } from "@/lib/site";

// The Romans Road, King James text.
const romansRoad = [
  { ref: "Romans 3:23", text: "For all have sinned, and come short of the glory of God;", say: "Every one of us has sinned." },
  {
    ref: "Romans 6:23",
    text: "For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.",
    say: "Sin earns death. Eternal life is a gift.",
  },
  {
    ref: "Romans 5:8",
    text: "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.",
    say: "Jesus died in your place.",
  },
  {
    ref: "Romans 10:9",
    text: "That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.",
    say: "Believe on Him and confess Him.",
  },
  { ref: "Romans 10:13", text: "For whosoever shall call upon the name of the Lord shall be saved.", say: "Whosoever means you." },
];

/** "Saturday, Oct 31 at 6:00 pm", or "Fri, Nov 6 – Sun, Nov 8" for a few days running. */
function whenOf(e: Entry) {
  if (e.when) return e.when;
  if (e.endsOn && e.endsOn > e.date) {
    const short = { weekday: "short", month: "short", day: "numeric" } as const;
    return `${e.date === nowInChurch().date ? "Now" : fmtDay(e.date, short)} – ${fmtDay(e.endsOn, short)}`;
  }
  return `${relativeDay(e.date)}${e.time24 && e.time24 !== "00:00" ? ` at ${fmtTime(e.time24)}` : ""}`;
}

export default function Home() {
  const next = nextService();
  const events = upcoming(12).filter((e) => e.kind === "event");
  const trunkOrTreat = events.find((e) => e.title === "Trunk or Treat");
  const today = nowInChurch().date;
  const showNotice = notice.text.trim() !== "" && (!notice.until || notice.until >= today);

  return (
    <>
      {/* ---------- notice (set from /edit) ---------- */}
      {showNotice && (
        <p className="bg-brick px-4 py-2.5 text-center font-sans text-[1rem] font-semibold leading-snug text-paper">{notice.text}</p>
      )}

      {/* ---------- header ---------- */}
      <header className="border-b border-rule bg-paper">
        <div className="wrap flex items-center justify-between gap-4 py-3">
          <a href="#top" className="font-display text-[1.15rem] leading-tight tracking-wide text-ink sm:text-[1.3rem]">
            Flat Gap Baptist
          </a>
          <nav aria-label="On this page" className="hidden items-center gap-6 font-sans text-[0.95rem] font-semibold md:flex">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-brick">
                {n.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* ---------- hero: their own skyline ---------- */}
      <section id="top" className="relative overflow-hidden">
        <div className="wrap relative z-10 pt-12 pb-44 sm:pt-16 sm:pb-56 md:pb-72">
          <p className="kicker">
            {church.city}, {church.county}, {church.state}
          </p>
          <h1 className="mt-4 font-display text-[2.9rem] leading-[0.98] text-ink sm:text-[4.4rem] md:text-[5.6rem]">
            Flat Gap
            <br />
            Baptist Church
          </h1>
          <p className="mt-6 max-w-[34rem] text-[1.3rem] leading-snug text-ink-soft md:text-[1.6rem]">
            An old-fashioned country church on Flat Gap Drive. We sing the hymns, preach the Bible, and we’d be glad to have you on
            Sunday.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#times" className="btn">
              Service times
            </a>
            <a href="#find" className="btn btn-ghost">
              Directions
            </a>
          </div>
          {next && (
            <p className="mt-8 font-sans text-[1rem] text-ink-soft">
              Next: <strong className="text-ink">{next.title}</strong>,{" "}
              <span className="time">
                {relativeDay(next.date)} at {fmtTime(next.time24)}
              </span>
            </p>
          )}
        </div>
        <Ridges className="absolute inset-x-0 bottom-0 h-[13rem] w-full sm:h-[17rem] md:h-[22rem]" />
      </section>

      {/* ---------- times, bulletin style ---------- */}
      <section id="times" className="bg-hill-4 text-paper">
        <div className="wrap grid gap-10 py-16 md:grid-cols-[1fr_1.35fr] md:gap-16 md:py-24">
          <div data-reveal>
            <p className="kicker !text-hill-1">Every week</p>
            <h2 className="mt-3 font-display text-[2.3rem] leading-tight md:text-[3rem]">Service times</h2>
            <p className="mt-5 max-w-sm text-paper/85">
              Come early and sit where you want. There’s no dress code. Wear what you’ve got.
            </p>
          </div>
          <ul className="space-y-6" data-reveal="1">
            {services.map((s) => (
              <li key={s.id}>
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-[1.35rem] font-semibold md:text-[1.6rem]">{s.name}</span>
                  <span className="leader !border-paper/30" />
                  <span className="time whitespace-nowrap text-[1.35rem] font-bold md:text-[1.6rem]">{fmtTime(s.time24)}</span>
                </div>
                <p className="time mt-0.5 text-[0.95rem] text-paper/75">
                  {s.rule}
                  {s.note && ` · ${s.note}`}
                </p>
              </li>
            ))}
          </ul>
          {events.length > 0 && (
            <div id="coming-up" className="md:col-start-2" data-reveal="2">
              <p className="kicker !text-hill-1">Coming up</p>
              <ul className="mt-4 space-y-5 border-t border-paper/25 pt-5">
                {events.map((e) => (
                  <li key={e.title + e.date}>
                    <p className="font-serif text-[1.35rem] font-semibold md:text-[1.5rem]">{e.title}</p>
                    <p className="time mt-0.5 text-[1rem] font-bold text-paper/90">{whenOf(e)}</p>
                    {e.note && <p className="mt-1 text-[1rem] text-paper/80">{e.note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ---------- church building photo: full width, fading into the welcome below ---------- */}
      <figure className="relative">
        <img
          src="/photos/church-building.jpg"
          alt="Flat Gap Baptist Church, a brick building with a white steeple, on Flat Gap Drive"
          width={1600}
          height={877}
          className="block h-[22rem] w-full object-cover object-[64%_40%] sm:h-[30rem] md:h-auto md:max-h-[85vh]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
          style={{ background: "linear-gradient(to bottom, rgba(245,239,225,0) 0%, rgba(245,239,225,0.55) 45%, var(--paper) 100%)" }}
        />
      </figure>

      {/* ---------- welcome ---------- */}
      <section className="wrap relative grid gap-10 pt-2 pb-16 md:-mt-24 md:grid-cols-[1.4fr_1fr] md:gap-16 md:pb-24">
        <div data-reveal>
          <p className="kicker">If it’s your first Sunday</p>
          <h2 className="mt-3 font-display text-[2.1rem] leading-tight md:text-[2.7rem]">A small church, with room to grow</h2>
          <div className="mt-6 space-y-5">
            <p>
              Most Sundays there are somewhere around {church.attendance} of us. Plenty of folks have been coming here for most of
              their lives, and they’ll want to know your name and who your people are.
            </p>
            <p>
              The service is plain: congregational singing out of the hymnbook, prayer, and preaching from the Bible. Nobody will put
              you on the spot. If you have children, bring them along.
            </p>
          </div>
        </div>
        <aside data-reveal="1" className="self-start border-l-4 border-brick pl-6 md:mt-14">
          <img
            src="/photos/pastor-eric.jpg"
            alt="Pastor Eric Lauterwasser preaching"
            width={750}
            height={1000}
            className="mb-5 aspect-[3/4] w-full max-w-[14rem] rounded-sm border border-rule object-cover"
          />
          <p className="kicker">Our pastor</p>
          <p className="mt-2 font-display text-[1.6rem] leading-tight">{pastor.name}</p>
          <p className="mt-3 text-ink-soft">
            If you need prayer, a visit, or someone to talk to about the Lord, {pastor.first} is glad to hear from you.
          </p>
          <p className="mt-4">
            <PrayerModal />
          </p>
        </aside>
      </section>

      {/* ---------- the gospel, tract style ---------- */}
      <section id="saved" className="border-y border-rule bg-paper-deep">
        <div className="wrap py-16 md:py-24">
          <div className="max-w-2xl" data-reveal>
            <p className="kicker">The most important thing on this page</p>
            <h2 className="mt-3 font-display text-[2.1rem] leading-tight md:text-[2.9rem]">How can I be saved?</h2>
            <p className="mt-5 text-ink-soft">The Bible answers it plainly, in five verses from the book of Romans.</p>
          </div>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {romansRoad.map((v, i) => (
              <li
                key={v.ref}
                data-reveal={String(i)}
                className="relative flex flex-col rounded-sm bg-paper p-5 shadow-[0_1px_0_var(--rule),0_10px_24px_-18px_rgba(29,27,23,0.45)]"
              >
                <span className="time text-[0.8rem] font-bold tracking-[0.14em] text-brick">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-2 font-sans text-[1.05rem] font-bold leading-snug">{v.say}</p>
                <blockquote className="mt-3 flex-1 text-[1.02rem] italic leading-relaxed text-ink-soft">“{v.text}”</blockquote>
                <p className="time mt-4 text-[0.9rem] font-semibold">{v.ref}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 max-w-2xl" data-reveal>
            If you want to talk it over, call Brother {pastor.first} at{" "}
            <Phone b64={pastor.phoneB64} className="time link font-sans font-bold" fallback="his number" />, or come by on Sunday and
            ask for him.
          </p>
        </div>
      </section>

      {/* ---------- fish fry & gospel sing ---------- */}
      <section className="wrap grid items-center gap-10 py-16 md:grid-cols-[1fr_1fr] md:gap-16 md:py-24">
        <div
          data-reveal
          className="border-[6px] border-double border-ink bg-paper px-6 py-8 text-center sm:px-10 md:-rotate-1"
          aria-label="Fish Fry and Gospel Sing"
        >
          <p className="time text-[0.8rem] font-bold tracking-[0.3em]">FLAT GAP BAPTIST CHURCH</p>
          <p className="mt-3 font-display text-[3.2rem] leading-[0.9] text-brick sm:text-[4.2rem]">FISH FRY</p>
          <p className="my-2 font-serif text-[1.6rem] italic">and</p>
          <p className="font-display text-[2.3rem] leading-[0.95] sm:text-[3rem]">GOSPEL SING</p>
          <div className="mx-auto mt-5 h-[3px] w-24 bg-ink" />
          <p className="time mt-4 text-[0.95rem] font-semibold tracking-[0.12em]">EVERYBODY WELCOME</p>
        </div>
        <div data-reveal="1">
          <p className="kicker">Out in the community</p>
          <h2 className="mt-3 font-display text-[2.1rem] leading-tight md:text-[2.7rem]">Supper, singing and the Gospel</h2>
          <p className="mt-6">
            This September the church put on a big Fish Fry and Gospel Sing for the whole community: fried fish, gospel singing,
            and a good evening together.
          </p>
          <p className="mt-5">
            We aim to do this the 3rd Saturday of September every year, Lord willing! When the next one is set, you’ll find it right
            here.
          </p>
        </div>
      </section>

      {/* ---------- seasonal Trunk or Treat feature ---------- */}
      {trunkOrTreat && (
        <section className="border-b border-rule bg-paper-deep">
          <div className="wrap grid items-center gap-10 py-16 md:grid-cols-[0.8fr_1.2fr] md:gap-16 md:py-24">
            <img
              src="/photos/trunk-or-treat-2026.jpg"
              alt="Trunk or Treat at Flat Gap Baptist Church, October 31st from 6pm to 8pm"
              width={1294}
              height={2000}
              className="mx-auto w-full max-w-[28rem] rounded-sm border border-rule shadow-[0_18px_50px_-30px_rgba(29,27,23,0.55)]"
            />
            <div data-reveal>
              <p className="kicker">This past October</p>
              <h2 className="mt-3 font-display text-[2.4rem] leading-tight text-brick md:text-[3.2rem]">{trunkOrTreat.title}</h2>
              <p className="time mt-4 font-sans text-[1.05rem] font-bold text-ink">{whenOf(trunkOrTreat)}</p>
              <p className="mt-6 text-[1.2rem] leading-relaxed text-ink-soft">
                A great evening was had by everyone who came by the church for our Trunk or Treat event this past October. We had 80+ children visit and they all left happy with plenty of candy and treats! We also gave out 100 New Testaments and over 100 Gospel tracts to the children and adults. Thank you to our many volunteers, and to the community, who made this possible!
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ---------- find us ---------- */}
      <section id="find" className="border-t border-rule">
        <div className="wrap grid gap-10 py-16 md:grid-cols-[1fr_1.15fr] md:gap-14 md:py-24">
          <div data-reveal>
            <p className="kicker">Finding us</p>
            <h2 className="mt-3 font-display text-[2.1rem] leading-tight md:text-[2.7rem]">
              In the gap, next to Wildcat Grocery, behind the firehouse
            </h2>
            <address className="mt-6 not-italic">
              <span className="block font-semibold">{church.name}</span>
              {church.streetNumber} {church.street}
              <br />
              {church.city}, {church.stateCode} {church.zip}
            </address>
            <h3 className="mt-8 font-sans text-[1rem] font-bold tracking-wide">From Paintsville (about 22 minutes)</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-6 marker:font-sans marker:font-bold marker:text-brick">
              <li>Take KY 40 west out of town.</li>
              <li>Bear right onto KY 172 toward West Liberty and go about 7 miles.</li>
              <li>Turn right on KY 689 and go about a mile into Flat Gap.</li>
              <li>At the end of the road, turn left onto KY 1092, then take the first right onto Flat Gap Drive. The church is on your left.</li>
            </ol>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={church.mapsUrl} className="btn" target="_blank" rel="noopener">
                Open in Google Maps
              </a>
            </div>
          </div>
          <figure data-reveal="1" className="self-start">
            <div className="overflow-hidden rounded-sm border border-rule bg-paper">
              <FlatGapMap />
            </div>
            <figcaption className="mt-3 font-sans text-[0.85rem] leading-snug text-ink-soft">
              The hills are drawn to scale from elevation data; the brown lines are every 10 meters of rise. Flat Gap is named for
              the low, level saddle here between Lower Laurel Creek and Mudlick Creek.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="bg-ink text-paper">
        <div className="wrap grid gap-8 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-display text-[1.5rem] leading-tight">Flat Gap Baptist Church</p>
            <p className="mt-3 text-[1rem] text-paper/75">
              {pastorHistory} {pastor.title} {pastor.name} serves here today.
            </p>
          </div>
          <div className="font-sans text-[0.98rem]">
            <p className="font-bold">Visit</p>
            <p className="mt-2 text-paper/80">
              {church.streetNumber} {church.street}
              <br />
              {church.city}, {church.stateCode} {church.zip}
            </p>
          </div>
          <div className="font-sans text-[0.98rem]">
            <p className="font-bold">Church phone</p>
            <p className="mt-2">
              <Phone className="time text-paper/90 underline decoration-paper/40 underline-offset-4 hover:text-paper" />
            </p>
          </div>
        </div>
        <p className="wrap border-t border-paper/15 py-5 text-center font-sans text-[0.85rem] text-paper/65">
          <a
            href="https://www.elijahdesent.com/churches"
            target="_blank"
            rel="noopener"
            className="underline decoration-paper/35 underline-offset-4 hover:text-paper"
          >
            Church website development
          </a>{" "}
          by Elijah Desent
        </p>
      </footer>
    </>
  );
}
