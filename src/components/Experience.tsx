"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { createWorld, type RoomInfo, type WorldHandle } from "@/lib/world";
import { femaleGuides, games, gameUrl, guides, playUrl, rooms } from "@/lib/content";
import { sites } from "@/lib/sites";
import { setSound, sfx } from "@/lib/audio";
import { canSpeak, speak } from "@/lib/narrator";

type Mode = "auto" | "manual";
type Caption = { name: string; room: string; text: string };

// Drives the walk: in Auto, scroll progress → position along the museum path; in Manual you
// walk around yourself. Owns the front page, the map, the sound switch, the guides' narration,
// the touch controls and the in-page game player.
export default function Experience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const world = useRef<WorldHandle | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const soundRef = useRef(false);
  const enteredRef = useRef(false);
  const narrateRef = useRef<(i: number) => void>(() => {});
  const stopTalkRef = useRef<() => void>(() => {});
  const [pct, setPct] = useState(0);
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [room, setRoom] = useState(0);
  const [map, setMap] = useState<RoomInfo[]>([]);
  const [music, setMusic] = useState(false);
  const [mode, setMode] = useState<Mode>("auto");
  const [touch, setTouch] = useState(false);
  const [help, setHelp] = useState(false);
  const [caption, setCaption] = useState<Caption | null>(null);
  const [near, setNear] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("locked");

    const lenis = reduced ? null : new Lenis({ lerp: 0.06, wheelMultiplier: 0.8, touchMultiplier: 1.2, smoothWheel: true });
    lenis?.stop();
    lenisRef.current = lenis;
    let lenisRaf = 0;
    const loop = (t: number) => {
      lenis?.raf(t);
      lenisRaf = requestAnimationFrame(loop);
    };
    if (lenis) lenisRaf = requestAnimationFrame(loop);

    const max = () => document.documentElement.scrollHeight - window.innerHeight;
    const getProgress = () => Math.min(1, Math.max(0, window.scrollY / Math.max(1, max())));
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-room]"));

    // A guide explains their room when you talk to them (click them, press T, or the Ask button).
    let capTimer = 0;
    let talkingRoom = -1;
    const stopTalk = () => {
      window.clearTimeout(capTimer);
      stop?.();
      stop = null;
      world.current?.setTalking(false);
      setCaption(null);
    };
    let stop: (() => void) | null = null;
    const narrate = (i: number) => {
      const r = rooms[i];
      const g = guides[r.id];
      if (!g || !enteredRef.current) return;
      if (talkingRoom === i && stop) return stopTalk();
      stopTalk();
      talkingRoom = i;
      setCaption({ name: g.name, room: r.name, text: g.line });
      world.current?.setTalking(true);
      const end = () => {
        stop = null;
        talkingRoom = -1;
        world.current?.setTalking(false);
        capTimer = window.setTimeout(() => setCaption(null), 600);
      };
      if (soundRef.current && canSpeak()) stop = speak(r.id, g.line, femaleGuides.has(r.id) ? "f" : "m", end);
      else capTimer = window.setTimeout(end, Math.max(4500, g.line.split(" ").length * 380));
    };
    narrateRef.current = narrate;
    stopTalkRef.current = stopTalk;

    let disposed = false;
    if (canvasRef.current)
      createWorld(canvasRef.current, {
        getProgress,
        onLoad: (p) => setPct(Math.round(p)),
        onRoom: (i) => {
          setRoom(i);
          cards.forEach((c) => c.classList.toggle("on", c.dataset.room === String(i)));
          stopTalk();
        },
        onPlay: (slug) => setPlaying(slug),
        onTalk: (i) => narrate(i),
        onNear: (i) => setNear(i),
        onLock: (l) => setLocked(l),
      })
        .then((h) => {
          if (disposed) return h.dispose();
          world.current = h;
          setMap(h.rooms);
          setReady(true);
        })
        .catch(() => setReady(true));

    const goTo = (i: number) => {
      const info = world.current?.rooms[i];
      if (!info) return;
      const y = info.start * max() + 2;
      if (lenis) lenis.scrollTo(y, { duration: 3 });
      else window.scrollTo(0, y);
    };
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const play = el.closest<HTMLElement>("[data-play]");
      if (play) return setPlaying(play.dataset.play!);
      const go = el.closest<HTMLElement>("[data-goto]");
      if (go && !document.documentElement.classList.contains("manual")) {
        e.preventDefault();
        goTo(Number(go.dataset.goto));
      }
    };
    document.addEventListener("click", onClick);

    return () => {
      disposed = true;
      stopTalk();
      world.current?.dispose();
      cancelAnimationFrame(lenisRaf);
      lenis?.destroy();
      setSound(false);
      document.removeEventListener("click", onClick);
      document.documentElement.classList.remove("locked", "manual");
    };
  }, []);

  // While a game is open: stop walking and talking, and let the game's own sound play instead of the music
  useEffect(() => {
    soundRef.current = music;
    if (!entered) return;
    if (playing) stopTalkRef.current();
    const still = !!playing || mode === "manual";
    if (still) lenisRef.current?.stop();
    else lenisRef.current?.start();
    document.documentElement.classList.toggle("locked", still);
    setSound(music && !playing);
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPlaying(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, entered, music, mode]);

  const switchMode = (m: Mode) => {
    if (m === mode || !world.current) return;
    document.documentElement.classList.toggle("manual", m === "manual");
    if (m === "auto") {
      // carry on the walk from the room you're standing in
      const info = world.current.rooms[room];
      const y = info.start * (document.documentElement.scrollHeight - window.innerHeight) + 2;
      document.documentElement.classList.remove("locked");
      if (lenisRef.current) lenisRef.current.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    } else {
      setHelp(true);
      window.setTimeout(() => setHelp(false), 8000);
    }
    world.current.setMode(m);
    setMode(m);
  };

  const enter = (m: Mode) => {
    setSound(true);
    setMusic(true);
    soundRef.current = true;
    enteredRef.current = true;
    setEntered(true);
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    document.documentElement.classList.remove("locked");
    lenisRef.current?.start();
    if (m === "manual") switchMode("manual");
  };

  const toggleSound = () => {
    sfx.ui();
    if (music) stopTalkRef.current();
    setMusic(!music);
  };

  // Shortcuts: 1 / 2 switch mode, N sound, H the shortcut list (the walking keys live in the world)
  const keysRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keysRef.current = (e: KeyboardEvent) => {
      if (!entered || playing || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "1") switchMode("auto");
      else if (k === "2") switchMode("manual");
      else if (k === "n") toggleSound();
      else if (k === "h") setHelp((v) => !v);
    };
  });
  useEffect(() => {
    const on = (e: KeyboardEvent) => keysRef.current(e);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  // Map of the winding path, north up
  const xs = map.map((r) => r.x);
  const zs = map.map((r) => r.z);
  const minX = Math.min(...xs) - 12;
  const minZ = Math.min(...zs) - 12;
  const w = Math.max(...xs) + 12 - minX;
  const h = Math.max(...zs) + 12 - minZ;
  const game = games.find((g) => g.slug === playing);
  const current = rooms[room];

  return (
    <>
      <canvas ref={canvasRef} className="world" aria-label="A 3D museum of Gowtham's projects you walk through by scrolling" />

      <div className="hud hud-tools">
        <div className="modes" role="group" aria-label="How to explore">
          {(["auto", "manual"] as const).map((m) => (
            <button key={m} aria-pressed={mode === m} onClick={() => switchMode(m)}>
              {m === "auto" ? "Auto" : "Manual"}
            </button>
          ))}
        </div>
        <button onClick={toggleSound} aria-pressed={music} aria-label={music ? "Sound on" : "Sound off"} className={music ? "music on" : "music"}>
          <span className="bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="label">{music ? "Sound on" : "Sound off"}</span>
        </button>
      </div>

      {map.length > 0 && (
        <nav className="hud minimap" aria-label="Museum map">
          <svg viewBox={`${minX} ${minZ} ${w} ${h}`}>
            <polyline points={map.map((r) => `${r.x},${r.z}`).join(" ")} />
            {map.map((r, i) => (
              <g key={i} data-goto={i} className={i === room ? "on" : i < room ? "seen" : ""} style={{ "--accent": r.accent } as React.CSSProperties}>
                <rect x={r.x - 5} y={r.z - 5} width={10} height={10} rx={2.5} />
                <title>{r.name}</title>
              </g>
            ))}
          </svg>
          <p>
            <b>{String(room).padStart(2, "0")}</b>/{String(rooms.length - 1).padStart(2, "0")} <span>{rooms[room]?.name}</span>
          </p>
        </nav>
      )}

      {entered && mode === "auto" && room === 0 && !caption && <div className="hint">Scroll to walk ↓</div>}

      {caption && (
        <div className="caption" key={caption.text} role="status">
          <b>
            {caption.name} <span>· {caption.room} guide</span>
          </b>
          <p>{caption.text}</p>
          <button onClick={() => stopTalkRef.current()} aria-label="Skip">
            Skip
          </button>
        </div>
      )}

      {entered && current && current.kind !== "exit" && (
        <div className="hud visit" key={current.id} style={{ "--accent": current.accent } as React.CSSProperties}>
          <span>{current.kind === "games" ? "Click any TV to play" : current.name}</span>
          <button className="ask" onClick={() => narrateRef.current(room)}>
            💬 Ask {guides[current.id]?.name}
          </button>
          {current.site && (
            <a className="btn" href={current.site.url} target="_blank" rel="noopener">
              Visit site ↗
            </a>
          )}
        </div>
      )}

      {mode === "manual" && near !== null && !caption && (
        <button className="talk-prompt" onClick={() => narrateRef.current(near)}>
          {touch ? "💬 Talk to " : "Press T to talk to "}
          {guides[rooms[near].id]?.name}
        </button>
      )}

      {entered && mode === "manual" && !touch && !locked && !playing && (
        <button className="lock-overlay" onClick={() => world.current?.lock()}>
          <b>Click to play</b>
          <span>Mouse looks around · W A S D walks · H shows every key · Esc frees the mouse</span>
        </button>
      )}

      {mode === "manual" && (
        <>
          <div className="crosshair" aria-hidden="true" />
          {help && (
            <div className="help">
              {touch ? (
                <>Left stick to walk · drag to look · tap the cube to pick it up, tap again to throw</>
              ) : (
                <ul className="keys">
                  <li><kbd>W A S D</kbd> / <kbd>↑ ↓</kbd> walk</li>
                  <li><kbd>← →</kbd> / mouse look</li>
                  <li><kbd>Shift</kbd> run</li>
                  <li><kbd>Space</kbd> jump</li>
                  <li><kbd>E</kbd> / <kbd>Click</kbd> grab · throw</li>
                  <li><kbd>Enter</kbd> kick the cube</li>
                  <li><kbd>R</kbd> cubes home</li>
                  <li><kbd>T</kbd> talk to the guide</li>
                  <li><kbd>1</kbd> Auto · <kbd>2</kbd> Manual</li>
                  <li><kbd>N</kbd> sound on / off</li>
                  <li><kbd>H</kbd> show / hide keys</li>
                  <li><kbd>Esc</kbd> free the mouse</li>
                </ul>
              )}
            </div>
          )}
          {touch && <Joystick onMove={(x, y) => world.current?.setJoystick(x, y)} />}
          <div className="hud play-btns">
            <button onClick={() => world.current?.interact()}>
              ✋ Grab / throw {!touch && <kbd>E</kbd>}
            </button>
            <button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }))}>
              🦶 Kick {!touch && <kbd>Enter</kbd>}
            </button>
            <button onClick={() => world.current?.resetCubes()}>
              ↺ Cubes home {!touch && <kbd>R</kbd>}
            </button>
            {touch ? (
              <button onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }))}>⤒ Jump</button>
            ) : (
              <button onClick={() => setHelp((v) => !v)}>
                ⌨ Keys <kbd>H</kbd>
              </button>
            )}
          </div>
        </>
      )}

      <div className={entered ? "intro done" : "intro"}>
        <div className="intro-inner">
          <p className="intro-kicker">Portfolio · walk-through museum</p>
          <h1>
            GOWTHAM<span className="sr-only"> · Creative web developer and founder of CodeLove</span>
          </h1>
          <p className="intro-sub">
            Creative web developer and founder of CodeLove. I build free web tools, a 3D model library and browser
            games, and I put every one of them in its own room. Come in and walk through.
          </p>
          <ul className="intro-logos" aria-label="Products inside">
            {sites.map((s) => (
              <li key={s.key} title={s.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.logo} alt={s.name} width={44} height={44} />
              </li>
            ))}
          </ul>
          <p className="intro-stats">
            <b>{rooms.length}</b> rooms · <b>{sites.length}</b> live products · <b>{games.length}</b> games you can play
          </p>
          {!ready ? (
            <div className="intro-load">
              <div className="bar">
                <i style={{ width: `${pct}%` }} />
              </div>
              <span>Setting up the rooms… {pct}%</span>
            </div>
          ) : (
            <div className="intro-enter">
              <button className="choice" onClick={() => enter("auto")} title="Just scroll. The camera walks you through every room.">
                Auto tour
              </button>
              <button className="choice" onClick={() => enter("manual")} title="Walk like a game, talk to the guides, kick the cubes.">
                Explore yourself
              </button>
            </div>
          )}
          <p className="intro-hint">♪ Sound is on, switch it off any time at the top right · you can change mode inside too</p>
        </div>
      </div>

      {game && (
        <div className="player" role="dialog" aria-modal="true" aria-label={`Play ${game.title}`}>
          <div className="player-bar">
            <div>
              <b>{game.title}</b>
              <span>{game.genre}</span>
            </div>
            <a href={gameUrl(game.slug)} target="_blank" rel="noopener">
              Open original ↗
            </a>
            <button onClick={() => setPlaying(null)} aria-label="Close game">
              ✕
            </button>
          </div>
          <iframe src={playUrl(game.slug)} title={game.title} allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope" allowFullScreen />
        </div>
      )}
    </>
  );
}

// Thumb stick for walking on touch screens
function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const R = 46;
  const move = (e: React.PointerEvent) => {
    if (!origin.current || e.pointerId !== origin.current.id) return;
    let dx = e.clientX - origin.current.x;
    let dy = e.clientY - origin.current.y;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx / R, -dy / R);
  };
  const end = () => {
    origin.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };
  return (
    <div
      className="joystick"
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.pointerId };
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <i style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
