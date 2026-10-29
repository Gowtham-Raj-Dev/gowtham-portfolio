import type { MetadataRoute } from "next";

// The whole museum is one page. Listed the way every CodeLove site lists its pages:
// lastmod is the build time, checked daily, top priority.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://gowtham.codelove.in", // same as the page's canonical link
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
