"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { analyticsConfig as cfg } from "./config";
import "./styles.css";

// A small visitors dashboard for one church site: unique visitors, page views,
// a visitors chart, top pages, where people came from, and what they used.
// Put it on a private, unlinked, noindex page (see the README):
//   <SiteAnalytics />

type Day = { date: string; visitors: number; pageviews: number };
type Stats = {
  visitors: number;
  pageviews: number;
  days: Day[];
  pages: { path: string; pageviews: number; visitors: number }[];
  referrers: { source: string; visitors: number }[];
  devices: { device: string; visitors: number }[];
};
type Bucket = Day & { to: string };

const PRESETS = [
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "365", label: "Last 12 months", days: 365 },
] as const;

const DEVICE_NAMES: Record<string, string> = { mobile: "Phones", desktop: "Computers", tablet: "Tablets" };
const PUBLIC_API = "https://www.elijahdesent.com/api/site-stats";

const nf = new Intl.NumberFormat("en-US");

function todayIn(tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmtDay(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
}
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Daily bars up to three months; weekly past that, so the bars stay readable. */
function bucketize(days: Day[]): { unit: "day" | "week"; list: Bucket[] } {
  if (days.length <= 92) return { unit: "day", list: days.map((d) => ({ ...d, to: d.date })) };
  const list: Bucket[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const week = days.slice(i, i + 7);
    list.push({
      date: week[0].date,
      to: week[week.length - 1].date,
      visitors: week.reduce((s, d) => s + d.visitors, 0),
      pageviews: week.reduce((s, d) => s + d.pageviews, 0),
    });
  }
  return { unit: "week", list };
}

/** Round gridline values: 0, 5, 10, 15 … */
function ticksFor(max: number) {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const out = [];
  for (let v = 0; v <= Math.ceil(max / step) * step + 1e-9; v += step) out.push(Math.round(v));
  return out;
}

const bucketLabel = (b: Bucket, unit: "day" | "week") =>
  unit === "day" ? fmtDay(b.date, { weekday: "short", month: "short", day: "numeric" }) : `Week of ${fmtDay(b.date)}`;

function Chart({ buckets, unit }: { buckets: Bucket[]; unit: "day" | "week" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 220;
  const pad = { top: 12, right: 6, bottom: 26, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const ticks = ticksFor(Math.max(0, ...buckets.map((b) => b.visitors)));
  const top = ticks[ticks.length - 1] || 1;
  const slot = plotW / Math.max(1, buckets.length);
  const barW = Math.max(2, Math.min(24, slot - 2));
  const y = (v: number) => pad.top + plotH - (v / top) * plotH;
  const labelAt = [0, Math.floor((buckets.length - 1) / 2), buckets.length - 1].filter((v, i, a) => a.indexOf(v) === i);
  const h = hover !== null ? buckets[hover] : null;

  return (
    <div ref={wrap} className="ct-sa-chart" onMouseLeave={() => setHover(null)}>
      <svg width={width} height={H} role="img" aria-label={`Visitors per ${unit}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className="ct-sa-grid" />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="ct-sa-axis">
              {nf.format(t)}
            </text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const x = pad.left + i * slot + (slot - barW) / 2;
          const bh = (b.visitors / top) * plotH;
          const r = Math.min(4, barW / 2, bh);
          const base = pad.top + plotH;
          return (
            <g key={b.date}>
              {bh > 0 && (
                <path
                  d={`M${x},${base} V${base - bh + r} Q${x},${base - bh} ${x + r},${base - bh} H${x + barW - r} Q${x + barW},${base - bh} ${x + barW},${base - bh + r} V${base} Z`}
                  className={`ct-sa-bar${hover === i ? " is-hover" : ""}`}
                />
              )}
              <rect
                x={pad.left + i * slot}
                y={pad.top}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onClick={() => setHover(i)}
              />
            </g>
          );
        })}
        {labelAt.map((i) => (
          <text
            key={i}
            x={pad.left + i * slot + slot / 2}
            y={H - 6}
            textAnchor={i === 0 && buckets.length > 1 ? "start" : i === buckets.length - 1 && buckets.length > 1 ? "end" : "middle"}
            className="ct-sa-axis"
          >
            {fmtDay(buckets[i].date)}
          </text>
        ))}
      </svg>
      {h && hover !== null && (
        <div
          className="ct-sa-tip"
          style={{
            left: Math.min(Math.max(pad.left + hover * slot + slot / 2, 80), width - 80),
            top: Math.max(0, y(h.visitors) - 8),
          }}
        >
          <strong>{bucketLabel(h, unit)}</strong>
          <span>
            {nf.format(h.visitors)} {h.visitors === 1 ? "visitor" : "visitors"} · {nf.format(h.pageviews)} page{" "}
            {h.pageviews === 1 ? "view" : "views"}
          </span>
        </div>
      )}
    </div>
  );
}

function ListCard({ title, rows, empty }: { title: string; rows: { label: string; value: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="ct-sa-card">
      <h3>{title}</h3>
      {rows.length ? (
        <ul className="ct-sa-list">
          {rows.map((r) => (
            <li key={r.label}>
              <span className="ct-sa-list-fill" style={{ width: `${(r.value / max) * 100}%` }} aria-hidden="true" />
              <span className="ct-sa-list-label">{r.label}</span>
              <span className="ct-sa-list-value">{nf.format(r.value)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ct-sa-muted">{empty}</p>
      )}
    </section>
  );
}

/** Sign-in mode: the same emailed link as the site editor, landing back on this page. */
function SignIn() {
  const [addr, setAddr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expired] = useState(() => {
    if (typeof window === "undefined") return false;
    const url = new URL(location.href);
    if (url.searchParams.get("signin") !== "expired") return false;
    url.searchParams.delete("signin");
    history.replaceState(history.state, "", url);
    return true;
  });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/edit/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: addr, next: "/analytics" }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (r.ok) setSent(addr.trim());
      else setErr(j.error ?? "Couldn’t send the link. Try again.");
    } catch {
      setErr("Couldn’t reach the website. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <section className="ct-sa-card ct-sa-signin">
        <h3>Check your email</h3>
        <p>
          We sent a sign-in link to <strong>{sent}</strong>. It works for 20 minutes and brings you straight back here.
        </p>
        <p className="ct-sa-muted">Not there after a minute? Look in Spam and mark it “Not spam.”</p>
        <button type="button" className="ct-sa-link" onClick={() => setSent(null)}>
          Use a different email
        </button>
      </section>
    );

  return (
    <form className="ct-sa-card ct-sa-signin" onSubmit={send}>
      <h3>Sign in to see the numbers</h3>
      <p>Use the same email you use to edit the website. We’ll email you a link to sign in.</p>
      {expired && <p className="ct-sa-error">That sign-in link has expired. Send yourself a new one.</p>}
      <label htmlFor="ct-sa-email">Email</label>
      <input
        id="ct-sa-email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
      />
      <button type="submit" disabled={busy} className="ct-sa-chip is-on">
        {busy ? "Sending…" : "Email me a sign-in link"}
      </button>
      {err && <p className="ct-sa-error">{err}</p>}
    </form>
  );
}

export function SiteAnalytics() {
  const [today] = useState(() => todayIn(cfg.timeZone));
  const [preset, setPreset] = useState<string>("30");
  const [from, setFrom] = useState(() => addDays(todayIn(cfg.timeZone), -29));
  const [to, setTo] = useState(() => todayIn(cfg.timeZone));
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needSignIn, setNeedSignIn] = useState(false);

  const valid = isDate(from) && isDate(to) && from <= to;

  useEffect(() => {
    if (!valid) return;
    const ctl = new AbortController();
    setLoading(true);
    setError(null);
    // Sign-in mode asks the site's own route (it holds the key); otherwise the browser asks elijahdesent.com.
    const url = cfg.signIn
      ? `/api/edit/analytics?${new URLSearchParams({ from, to })}`
      : `${PUBLIC_API}?${new URLSearchParams({ key: cfg.publicKey, from, to, tz: cfg.timeZone })}`;
    fetch(url, { signal: ctl.signal, credentials: "same-origin" })
      .then(async (r) => {
        if (r.status === 401 && cfg.signIn) {
          setNeedSignIn(true);
          return;
        }
        const j = (await r.json().catch(() => ({}))) as Stats & { error?: string };
        if (!r.ok) throw new Error(j.error || "Couldn’t load the numbers.");
        setNeedSignIn(false);
        setData(j);
      })
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setError((e as Error).message || "Couldn’t load the numbers.");
      })
      .finally(() => {
        if (!ctl.signal.aborted) setLoading(false);
      });
    return () => ctl.abort();
  }, [from, to, valid]);

  function pick(id: string, days: number) {
    setPreset(id);
    setFrom(addDays(today, -(days - 1)));
    setTo(today);
  }

  const chart = useMemo(() => (data ? bucketize(data.days) : null), [data]);
  const busiest = useMemo(
    () => (data?.days.length ? data.days.reduce((a, b) => (b.visitors > a.visitors ? b : a)) : null),
    [data],
  );
  const deviceTotal = data?.devices.reduce((s, d) => s + d.visitors, 0) ?? 0;

  async function signOut() {
    await fetch("/api/edit/session", { method: "DELETE" }).catch(() => null);
    location.reload();
  }

  if (needSignIn)
    return (
      <div className="ct-sa">
        <header className="ct-sa-head">
          <p className="ct-sa-eyebrow">{cfg.siteName}</p>
          <h2>Website visitors</h2>
        </header>
        <SignIn />
      </div>
    );

  return (
    <div className="ct-sa">
      <header className="ct-sa-head">
        <p className="ct-sa-eyebrow">{cfg.siteName}</p>
        <h2>Website visitors</h2>
        {cfg.signIn && data && (
          <button type="button" className="ct-sa-link ct-sa-signout" onClick={signOut}>
            Sign out
          </button>
        )}
      </header>

      <div className="ct-sa-filters" role="group" aria-label="Date range">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`ct-sa-chip${preset === p.id ? " is-on" : ""}`}
            aria-pressed={preset === p.id}
            onClick={() => pick(p.id, p.days)}
          >
            {p.label}
          </button>
        ))}
        <span className="ct-sa-custom">
          <label>
            <span>From</span>
            <input
              type="date"
              value={from}
              max={to || today}
              onChange={(e) => {
                setPreset("custom");
                setFrom(e.target.value);
              }}
            />
          </label>
          <label>
            <span>To</span>
            <input
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={(e) => {
                setPreset("custom");
                setTo(e.target.value);
              }}
            />
          </label>
        </span>
      </div>

      {!valid && <p className="ct-sa-error">Pick a start date on or before the end date.</p>}
      {error && <p className="ct-sa-error">{error}</p>}

      {!data && loading && <p className="ct-sa-muted">Loading…</p>}

      {data && chart && (
        <div className={`ct-sa-body${loading ? " is-loading" : ""}`} aria-busy={loading}>
          <div className="ct-sa-tiles">
            <div className="ct-sa-tile">
              <p>Unique visitors</p>
              <strong>{nf.format(data.visitors)}</strong>
            </div>
            <div className="ct-sa-tile">
              <p>Page views</p>
              <strong>{nf.format(data.pageviews)}</strong>
            </div>
            <div className="ct-sa-tile">
              <p>Busiest day</p>
              <strong className="ct-sa-tile-small">
                {busiest && busiest.visitors > 0 ? fmtDay(busiest.date, { weekday: "short", month: "short", day: "numeric" }) : "—"}
              </strong>
              {busiest && busiest.visitors > 0 && (
                <span>
                  {nf.format(busiest.visitors)} {busiest.visitors === 1 ? "visitor" : "visitors"}
                </span>
              )}
            </div>
          </div>

          <section className="ct-sa-card">
            <h3>Visitors per {chart.unit}</h3>
            <p className="ct-sa-muted ct-sa-range">
              {fmtDay(from, { month: "long", day: "numeric", year: "numeric" })} – {fmtDay(to, { month: "long", day: "numeric", year: "numeric" })}
            </p>
            <Chart buckets={chart.list} unit={chart.unit} />
            <details className="ct-sa-table">
              <summary>Show the numbers as a table</summary>
              <table>
                <thead>
                  <tr>
                    <th scope="col">{chart.unit === "day" ? "Day" : "Week of"}</th>
                    <th scope="col">Visitors</th>
                    <th scope="col">Page views</th>
                  </tr>
                </thead>
                <tbody>
                  {[...chart.list].reverse().map((b) => (
                    <tr key={b.date}>
                      <td>{fmtDay(b.date, { weekday: chart.unit === "day" ? "short" : undefined, month: "short", day: "numeric", year: "numeric" })}</td>
                      <td>{nf.format(b.visitors)}</td>
                      <td>{nf.format(b.pageviews)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>

          <div className="ct-sa-grid2">
            <ListCard
              title="Most-viewed pages"
              rows={data.pages.map((p) => ({ label: p.path === "/" ? "Home page" : p.path, value: p.pageviews }))}
              empty="No page views in this range."
            />
            <ListCard
              title="Where visitors came from"
              rows={data.referrers.map((r) => ({ label: r.source, value: r.visitors }))}
              empty="No visitors in this range."
            />
          </div>

          {deviceTotal > 0 && (
            <p className="ct-sa-devices">
              {data.devices
                .map((d) => ({ name: DEVICE_NAMES[d.device] ?? d.device, pct: Math.round((d.visitors / deviceTotal) * 100) }))
                .filter((d) => d.name !== "unknown" && d.pct > 0)
                .map((d) => `${d.name} ${d.pct}%`)
                .join(" · ")}
            </p>
          )}
        </div>
      )}

      <p className="ct-sa-note">
        Counted privately, without cookies. Someone who comes back on a different day is counted again that day.
      </p>
    </div>
  );
}
