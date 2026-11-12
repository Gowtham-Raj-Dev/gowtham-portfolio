import type { Metadata } from "next";
import Experience from "@/components/Experience";
import { sites } from "@/lib/sites";
import { rooms, games, skills, steps, stats, gameUrl, contact } from "@/lib/content";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const num = (i: number) => String(i).padStart(2, "0");

export default function Home() {
  return (
    <>
      <Experience />
      <div className="track" aria-hidden="true" />

      <header className="hud hud-top">
        <a href="#" data-goto="0" className="brand">
          <span>GOWTHAM</span>
          <small>creative web developer</small>
        </a>
      </header>

      <main className="hud cards">
        {rooms.map((r, i) => (
          <section key={r.id} data-room={i} className={i === 0 ? "card on" : "card"} style={{ "--accent": r.accent } as React.CSSProperties}>
            <p className="kicker">
              Room {num(i)} · {r.kind === "site" ? "Live product" : r.kind === "games" ? "Free 3D Games" : r.name}
            </p>

            {r.kind === "lobby" && (
              <>
                <h2>Hi, I&apos;m Gowtham.</h2>
                <p>
                  Welcome to my museum. Every room is one of my live products: a pillar with its logo cube in the middle and its
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
                <footer className="site-footer" aria-label="CodeLove network and credits">
                  <p className="network">
                    CodeLove network:{" "}
                    {sites.map((s, k) => (
                      <span key={s.domain}>
                        <a href={s.url} target="_blank" rel="noopener">
                          {s.name}
                        </a>
                        {k < sites.length - 1 ? " · " : ""}
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
