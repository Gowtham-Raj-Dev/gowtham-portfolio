import type { MetadataRoute } from "next";

// Everything is open to crawlers, the scripts and styles too: Google needs them to render the page.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://gowtham.codelove.in/sitemap.xml",
    host: "https://gowtham.codelove.in",
  };
}
