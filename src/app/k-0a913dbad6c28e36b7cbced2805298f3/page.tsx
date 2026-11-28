import type { Metadata } from "next";
import Link from "next/link";
import { BASE, getComparison } from "./compare";

export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Text check",
  robots: { index: false, follow: false, nocache: true },
};

export default async function Page() {
  let out: Awaited<ReturnType<typeof getComparison>> | null = null;
  let problem = "";
  try {
    out = await getComparison();
  } catch (e) {
    problem = e instanceof Error ? e.message : "unknown problem";
  }

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1>Text check (temporary)</h1>
      {!out ? (
        <p>The comparison could not run: {problem}</p>
      ) : (
        <>
          <p>
            Second text lines read: {out.lines}. Book codes seen: {out.codes}. In ours but not theirs: {out.missingInTheirs.length}. In
            theirs but not ours: {out.missingInOurs}.
          </p>
          <ul>
            {out.parts.map((p) => (
              <li key={p.slug}>
                <Link href={`/${BASE}/${p.slug}`}>{p.title}</Link>: compared {p.compared}, identical {p.same}, only LORD/GOD capitals{" "}
                {p.nameCaseOnly}, real differences {p.diffs.length}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
