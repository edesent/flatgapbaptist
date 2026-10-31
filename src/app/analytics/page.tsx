import type { Metadata } from "next";
import { SiteAnalytics } from "@/tools/site-analytics/site-analytics";

// Private visitors page (church-tools/site-analytics). Not linked anywhere and not in the sitemap.
export const metadata: Metadata = {
  title: "Website visitors",
  robots: { index: false, follow: false },
};

export default function AnalyticsPage() {
  return (
    <div className="wrap py-12 md:py-16">
      <SiteAnalytics />
    </div>
  );
}
