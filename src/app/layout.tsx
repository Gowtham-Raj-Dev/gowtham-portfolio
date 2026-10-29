import type { Metadata, Viewport } from "next";
import { sites } from "@/lib/sites";
import { skills } from "@/lib/content";
import "./globals.css";

const SITE = "https://gowtham.codelove.in";
const TITLE = "Gowtham — Creative Web Developer & Founder of CodeLove | 3D Portfolio";
const DESCRIPTION =
  "Gowtham, creative web developer and founder of CodeLove. Walk through a 3D museum of his nine free websites and play 14 browser games.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Gowtham",
  authors: [{ name: "Gowtham", url: SITE }],
  creator: "Gowtham",
  publisher: "CodeLove",
  keywords: ["Gowtham", "Gowtham CodeLove", "creative web developer", "web developer portfolio", "3D portfolio", "Three.js portfolio", "CodeLove", "founder of CodeLove", ...sites.map((s) => s.name)],
  category: "technology",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // the link preview on WhatsApp, LinkedIn, X and the rest
  openGraph: {
    type: "profile",
    url: SITE,
    siteName: "Gowtham",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_IN",
    firstName: "Gowtham",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "GOWTHAM · Creative web developer · Founder of CodeLove, with the logos of his nine websites" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#07080b",
};

// Tells search engines who Gowtham is: a person, the founder of CodeLove, and the nine sites he made.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      url: SITE,
      name: "Gowtham",
      description: DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": "https://codelove.in/#organization" },
    },
    {
      "@type": "ProfilePage",
      "@id": `${SITE}/#profile`,
      url: SITE,
      name: TITLE,
      isPartOf: { "@id": `${SITE}/#website` },
      mainEntity: { "@id": `${SITE}/#person` },
      primaryImageOfPage: `${SITE}/og.png`,
    },
    {
      "@type": "Person",
      "@id": `${SITE}/#person`,
      name: "Gowtham",
      url: SITE,
      image: `${SITE}/og.png`,
      jobTitle: "Creative Web Developer",
      description: "Creative web developer and founder of CodeLove, who builds free web tools, a 3D model library and browser games.",
      email: "mailto:gowtham@codelove.in",
      worksFor: { "@id": "https://codelove.in/#organization" },
      founder: { "@id": "https://codelove.in/#organization" },
      knowsAbout: skills.flatMap((g) => g.items),
      nationality: { "@type": "Country", name: "India" },
    },
    {
      "@type": "Organization",
      "@id": "https://codelove.in/#organization",
      name: "CodeLove",
      url: "https://codelove.in",
      logo: "https://gowtham.codelove.in/logos/codelove.png",
      founder: { "@id": `${SITE}/#person` },
    },
    {
      "@type": "ItemList",
      name: "Websites made by Gowtham",
      itemListElement: sites.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: { "@type": "WebSite", name: s.name, url: s.url, description: s.blurb, creator: { "@id": `${SITE}/#person` } },
      })),
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Manrope:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600&family=Unbounded:wght@700;800;900&display=swap" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
