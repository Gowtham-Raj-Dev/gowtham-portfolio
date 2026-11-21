import type { Metadata } from "next";
import Experience from "@/components/Experience";
import { networkLinks } from "@/lib/sites";
import { rooms, games, skills, steps, stats, gameUrl, contact } from "@/lib/content";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const faqs = [
  {
    q: "How do I explore Gowtham's 3D portfolio?",
    a: "Scroll to walk through the museum, one room per live CodeLove product, or use first person mode to look around. Each room has a card with the story of the product and a link to open it.",
  },
  {
    q: "Who is Gowtham, the founder of CodeLove?",
    a: "Gowtham (Gowthamraj) is a creative web developer from India who designs, builds and runs every CodeLove site himself. You can read more on the About Gowtham page.",
  },
  {
    q: "How do I build a three.js portfolio like this one?",
    a: "Start with one idea per room, build the scene with three.js, and keep a plain HTML layer under it so search engines and screen readers can read the text. This museum does exactly that: every room is also real page text.",
  },
  {
    q: "How do I contact Gowtham about a web project?",
    a: "Send a WhatsApp message or an email using the details in the last room, or open the Contact page. Gowtham replies himself.",
  },
];

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

const num = (i: number) => String(i).padStart(2, "0");

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Experience />
      <div className="track" aria-hidden="true" />

      <header className="hud hud-top">
        <a href="#" data-goto="0" className="brand">
          <span>GOWTHAM</span>
          <small>creative web developer</small>
        </a>
        <nav className="hud-links" aria-label="About, contact and privacy">
          <a href="/about">About Gowtham</a>
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </header>

      <main className="hud cards">
        {rooms.map((r, i) => (
          <section key={r.id} data-room={i} className={i === 0 ? "card on" : "card"} style={{ "--accent": r.accent } as React.CSSProperties}>
            <p className="kicker">
              Room {num(i)} · {r.kind === "site" ? "Live product" : r.kind === "games" ? "Free 3D Games" : r.name}
            </p>

            {r.kind === "lobby" && (
              <>
                <h1>Hi, I&apos;m Gowtham, a creative web developer.</h1>
                <p>
                  Welcome to my three.js 3D portfolio, a museum. Every room is one of my live products: a pillar with its logo cube in the middle and its
                  story on the walls. Scroll to walk through.
                </p>
                <ul className="chips">
                  {stats.map((s) => (
                    <li key={s.small}>
                      <b>{s.big}</b> {s.small}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {r.kind === "site" && r.site && (
              <>
                <h2>{r.site.name}</h2>
                <p className="lead">{r.site.tagline}</p>
                <p>{r.site.blurb}</p>
                <ul className="chips">
                  {r.site.features.slice(0, 4).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <a className="btn" href={r.site.url} target="_blank" rel="noopener">
                  Visit {r.site.domain} ↗
                </a>
              </>
            )}

            {r.kind === "games" && r.site && (
              <>
                <h2>Game Center</h2>
                <p>{r.site.blurb} Click a TV on the wall, or pick one here, to play it right inside this page.</p>
                <div className="games">
                  {games.map((g) => (
                    <button key={g.slug} data-play={g.slug} style={{ "--g": g.accent } as React.CSSProperties}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/games/${g.slug}.webp`} alt="" loading="lazy" width={120} height={63} />
                      <span>{g.title}</span>
                    </button>
                  ))}
                </div>
                <noscript>
                  <ul>
                    {games.map((g) => (
                      <li key={g.slug}>
                        <a href={gameUrl(g.slug)}>{g.title}</a>: {g.tagline}
                      </li>
                    ))}
                  </ul>
                </noscript>
                <a className="btn" href={r.site.url} target="_blank" rel="noopener">
                  Open {r.site.domain} ↗
                </a>
              </>
            )}

            {r.kind === "workshop" && (
              <>
                <h2>Toolbox &amp; process</h2>
                <ul className="chips">
                  {skills.flatMap((g) => g.items.slice(0, 3)).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <ol className="steps">
                  {steps.map((s) => (
                    <li key={s.title}>
                      <b>{s.title}.</b> {s.text}
                    </li>
                  ))}
                </ol>
              </>
            )}

            {r.kind === "exit" && (
              <>
                <h2>Let&apos;s build something.</h2>
                <p>Have an idea, a project or a collaboration in mind? I&apos;m one message away.</p>
                <div className="btns">
                  <a className="btn" href={contact.whatsappUrl} target="_blank" rel="noopener">
                    WhatsApp {contact.whatsapp} ↗
                  </a>
                </div>
                <ul className="contact-list">
                  {contact.emails.map((m) => (
                    <li key={m.email}>
                      <b>{m.label}:</b> <a href={`mailto:${m.email}`}>{m.email}</a>
                    </li>
                  ))}
                </ul>
                <section className="faq" aria-label="Frequently asked questions">
                  <h2>Questions about Gowtham&apos;s 3D portfolio</h2>
                  {faqs.map((f) => (
                    <details key={f.q}>
                      <summary>{f.q}</summary>
                      <p>{f.a}</p>
                    </details>
                  ))}
                </section>
                <footer className="site-footer" aria-label="CodeLove network and credits">
                  <p className="network">
                    CodeLove network:{" "}
                    {networkLinks.map((s, k) => (
                      <span key={s.url}>
                        <a href={s.url} target="_blank" rel="noopener">
                          {s.label}
                        </a>
                        {k < networkLinks.length - 1 ? " · " : ""}
                      </span>
                    ))}
                  </p>
                  <p className="credits">Guides and first-person arms: Microsoft Rocketbox avatars (MIT). Furniture, plants, characters and arcade machines from the Free 3D Models library (CC0).</p>
                </footer>
              </>
            )}
          </section>
        ))}
      </main>
    </>
  );
}
