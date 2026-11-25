import type { MetadataRoute } from "next";
import { posts } from "@/lib/blog";
import { siteUrl } from "@/lib/site";

// The home page (its nav links are anchors on it), the history page, the blog and each article.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/pastor`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/history`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/gallery`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/devotional`, changeFrequency: "daily", priority: 0.5 },
    { url: `${siteUrl}/bible`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/verse`, changeFrequency: "daily", priority: 0.4 },
    { url: `${siteUrl}/blog`, changeFrequency: "weekly", priority: 0.7 },
    ...posts.map((p) => ({ url: `${siteUrl}/blog/${p.slug}`, lastModified: p.date, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
