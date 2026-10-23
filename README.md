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
- **Forms:** none on the page. `/api/form` is still there (posts to `FORM_WEBHOOK_URL`) if a prayer-request form is wanted later.

## Confirm with the church

- **Service times are a guess** (Sunday School 10, worship 11, Sunday evening 6, Wednesday 7). Nobody has given them yet.
- **Phone:** the church line (606) 265-4800 is from the Google listing and may be out of date. Pastor Eric's own number (606) 793-5737 is from the grant entry and shows in the pastor box and the Gospel section.
- **Founding pastor Fredrick Crislip** comes from a single Google review by his grandson. The footer names him.
- **The Fish Fry and Gospel Sing** was in September 2026 (from the grant entry). Whether it was free, and when the next one is, isn't known.
- The welcome copy assumes hymnbook singing and no dress code.
- No photos exist online (no website, no Facebook, no photos on the Maps listing). If the church sends a photo of the building, it can go above the "A small church" section.

## Rules that keep the site honest

- Real church photos only. No stock photos and no AI images.
- No “Watch live” button unless they really stream.
- Phone numbers are stored base64 (`phoneB64`) and assembled in the browser by `src/components/Phone.tsx`. Never type the digits into a page.
- No raw email addresses on the site.

## Going live

Set `NEXT_PUBLIC_SITE_URL` to the real domain in Vercel. That turns off the noindex robots rule and fixes canonicals and JSON-LD in one move. **Delete the two demo-tracking lines in `src/app/layout.tsx`** (the comment and the `demo.js` script) when the church pays or goes live.
