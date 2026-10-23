import type { MetadataRoute } from "next";
import { isDemo, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // A preview copy must never compete with the church's real listing.
  if (isDemo) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
