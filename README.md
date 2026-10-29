# Flat Gap Baptist Church, Flat Gap, Kentucky

Website concept for Flat Gap Baptist Church, 75 Flat Gap Drive, Flat Gap, KY 41219 (Johnson County). Pastor Eric Lauterwasser.
Came through the Small Church Grant (October 2026). In his words: “a very simple one as we don’t have Facebook, YouTube, or any Livestream of any kind. Maybe something like the one you did for Truth Baptist, Dubois Wyoming?”

Preview: https://flatgapbaptist.elijahdesent.com (hidden from search engines; see "Going live").

## Read this before editing (for people and AI assistants)

- **Next.js 16.2 (App Router) + React 19 + Tailwind CSS v4.** This is NOT Next 13/14:
  - Page `params` and `searchParams` are **Promises**. Write `({ params }: { params: Promise<{ slug: string }> })` and `await` it.
  - Never name a component prop `ref`; it is reserved in React 19.
  - Tailwind v4 has no `tailwind.config.js`. Colours and fonts live in `src/app/globals.css` under `:root` and `@theme inline`. Custom classes go inside `@layer components`.
- **Type curly quotes and apostrophes as the characters themselves (’ “ ”), not as `&rsquo;` / `&ldquo;`.**
- **Deploys:** every push to `main` auto-deploys on Vercel. Run `npm run build` first. If the type-check fails, the live site does not update.
- **Commit email** must be `Elimark1611@gmail.com`, or Vercel blocks the deploy.
- **Fonts are self-hosted** in `src/fonts/` (`bash scripts/get-font.sh "<Family>" <weight>`). Don’t switch to `next/font/google`.
- **Times are set in the sans** (`.time` class), never in a display serif.

## Where things live

| To change… | Edit |
| --- | --- |
| Service times | `services` in `src/lib/site.ts` |
| A special event (drops off by itself after `endsOn`) | `events` in `src/lib/site.ts` |
| Online giving | `giving.url` in `src/lib/site.ts` |
| Address, phone, Facebook | `church` in `src/lib/site.ts` |
| Pastor | `pastor` in `src/lib/site.ts` |
| Navigation | `nav` in `src/lib/site.ts` |
| Photos | `public/photos/`. Alt text sits beside each image where it is used |
| The map's route, pins and labels | `src/components/FlatGapMap.tsx` |
| Page wording | `src/app/page.tsx` (one page; each section is marked with a comment) |

## How it works

- **One page, kept simple on purpose.** No Facebook, no livestream, no giving page. Times, a welcome, the Gospel, the Fish Fry, directions.
- **The hills in the header are the real skyline around the church.** `src/lib/art/ridges.ts` holds the horizon as seen from the church lot (north-east round through south), worked out from elevation tiles in four distance bands. `components/Ridges.tsx` draws them. Regenerate rather than hand-edit.
- **The map is drawn, not embedded.** `public/map/flat-gap.svg` holds contour lines every 10 m (from elevation tiles) plus creeks and roads (Census TIGER 2024, Johnson County). `components/FlatGapMap.tsx` draws the route in on KY 689, the pins and the labels on top.
- **Large type throughout** (19–21px body). Many of the members are in their 70s and 80s. Don't shrink it.
- **Events expire by themselves.** Each event has `endsOn`; the page re-renders hourly (`revalidate = 3600` in `layout.tsx`). Keep that line. With no events listed, the Fish Fry section just says the next one will be posted.
- **Prayer request form:** `PrayerModal` in the pastor box opens a short form that posts to `/api/prayer`, which emails `lauterw@foothills.net` via Resend (`src/lib/email.ts`), sent from Resend's shared `onboarding@resend.dev` so no domain verification is needed. Needs `RESEND_API_KEY` set in Vercel, or submissions fail with "the form isn't configured yet." Delivery is by email on purpose — Pastor Eric asked for that, not a text (his email of October 29, 2026), since his listed church phone has no answering machine.

## Confirmed by the church (2026-10-25, 2026-10-29)

- **Service times:** Sunday School 9:30 (meets in the fellowship hall), worship 11, Wednesday prayer 7pm, March through October only (winter hours dismissed). No Sunday evening service.
- **Phone:** the church line (606) 265-4800 (from the Google listing) is unchanged. Pastor Eric's own number is now his home phone, (606) 297-3878, shown in the pastor box and the Gospel section.
- **Pastor history:** Brother Harold Salyer was pastor from 1964–1991 and still attends. (The earlier "founding pastor Fredrick Crislip," from a single Google review, was superseded by this.)
- **The Fish Fry and Gospel Sing** happens the 3rd Saturday of September every year.
- Attendance is "around 50," not a range.
- **Photos:** the church building (`public/photos/church-building.jpg`) and Pastor Eric preaching (`public/photos/pastor-eric.jpg`), both from his October 25 email.
- **The post office pin was removed from the hand-drawn map** — Eric said its location was wrong and offered either moving or deleting it; without a confirmed real location, it was deleted. The "Finding us" copy now says "next to Wildcat Grocery, behind the firehouse" instead.
- **Pastor history wording:** dropped the trailing "today" from `pastorHistory` in `src/lib/site.ts` — the footer sentence right after it ("Pastor Eric Lauterwasser serves here today.") already ends with "today," and Eric flagged the repeat as not sounding right.

## Rules that keep the site honest

- Real church photos only. No stock photos and no AI images.
- No “Watch live” button unless they really stream.
- Phone numbers are stored base64 (`phoneB64`) and assembled in the browser by `src/components/Phone.tsx`. Never type the digits into a page.
- No raw email addresses on the site.

## Going live

Set `NEXT_PUBLIC_SITE_URL` to the real domain in Vercel. That turns off the noindex robots rule and fixes canonicals and JSON-LD in one move. **Delete the two demo-tracking lines in `src/app/layout.tsx`** (the comment and the `demo.js` script) when the church pays or goes live.
