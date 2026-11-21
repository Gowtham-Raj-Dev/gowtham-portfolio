import Link from "next/link";
import { networkLinks } from "@/lib/sites";

/** Plain text page (About, Contact, Privacy): brand link back to the museum, the content, and the page links. */
export const INFO_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
];

export default function InfoPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="info-page">
      <header className="info-head">
        <Link href="/" className="brand" aria-label="Gowtham, back to the 3D museum">
          <span>GOWTHAM</span>
          <small>creative web developer</small>
        </Link>
        <nav className="info-nav" aria-label="Pages">
          <Link href="/">3D museum</Link>
          {INFO_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="info-main">
        <h1>{title}</h1>
        {updated && <p className="info-updated">Last updated: {updated}</p>}
        {children}
      </main>
      <footer className="info-foot">
        <p>
          © {new Date().getFullYear()} Gowtham · <a href="https://codelove.in">CodeLove</a>
        </p>
        <p className="network">
          CodeLove network:{" "}
          {networkLinks.map((s, k) => (
            <span key={s.url}>
              <a href={s.url}>{s.label}</a>
              {k < networkLinks.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>      </footer>
    </div>
  );
}
