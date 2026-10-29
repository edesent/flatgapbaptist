import type { Metadata } from "next";
import HomePage from "../page";

/** The home page with the pastor's editor switched on (src/edit). Kept out of search. */
export const metadata: Metadata = {
  title: "Edit the website",
  alternates: { canonical: "/" },
  robots: { index: false, follow: false },
};

export default HomePage;
