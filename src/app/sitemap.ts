import type { MetadataRoute } from "next";

// The museum plus the About, Contact and Privacy pages. Listed the way every CodeLove site lists its pages:
// lastmod is the build time, checked daily, top priority. URLs match each page's canonical link.
export const dynamic = "force-static";

const SITE = "https://gowtham.codelove.in";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/about", "/contact", "/privacy"].map((path) => ({
    url: `${SITE}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  }));
}
