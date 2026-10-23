import Link from "next/link";

// TODO(demo) style this page in the site's own look.
export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-5 py-28 text-center">
      <h1 className="text-4xl">This page is not here.</h1>
      <Link href="/" className="mt-8 underline">
        Back to the home page
      </Link>
    </section>
  );
}
