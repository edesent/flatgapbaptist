import type { Metadata } from "next";
import { PARTS, getComparison } from "../compare";

export const dynamic = "force-static";
export const dynamicParams = false;
export const metadata: Metadata = {
  title: "Text check",
  robots: { index: false, follow: false, nocache: true },
};

export function generateStaticParams() {
  return PARTS.map((p) => ({ part: p.slug }));
}

export default async function Page({ params }: { params: Promise<{ part: string }> }) {
  const { part } = await params;
  let problem = "";
  let found: Awaited<ReturnType<typeof getComparison>>["parts"][number] | undefined;
  try {
    const out = await getComparison();
    found = out.parts.find((p) => p.slug === part);
  } catch (e) {
    problem = e instanceof Error ? e.message : "unknown problem";
  }

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif", lineHeight: 1.4 }}>
      {!found ? (
        <p>The comparison could not run: {problem || "section not found"}</p>
      ) : (
        <>
          <h1>{found.title}</h1>
          <p>
            Verses compared: {found.compared}. Identical: {found.same}. Only LORD/GOD capital letters differ: {found.nameCaseOnly}.
            Real differences listed below: {found.diffs.length}.
          </p>
          <hr />
          {found.diffs.map((d) => (
            <div key={d.ref} style={{ marginBottom: "0.25rem", fontSize: "0.9rem" }}>
              <b>{d.ref}</b> ours: [{d.oursBit}] | theirs: [{d.theirsBit}]
            </div>
          ))}
        </>
      )}
    </main>
  );
}
