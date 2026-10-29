import * as THREE from "three";
import type { Site } from "./sites";
import type { Game } from "./content";

// Every printed surface in the museum (wall panels, signs, cube faces, floors) is
// painted at runtime on a canvas: dark glass, gold and one neon colour per room.

export const DISPLAY = '"Unbounded", "Manrope", sans-serif';
export const BODY = '"Manrope", "Segoe UI", sans-serif';
export const GOLD = "#e8b85a";
const TEXT = "#f3efe7";
const DIM = "#a7a29a";

function make(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

export function tex(src: TexImageSource | HTMLCanvasElement, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(src as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (rx !== 1 || ry !== 1) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
  }
  return t;
}

const images = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(url: string) {
  if (!images.has(url))
    images.set(
      url,
      new Promise((res, rej) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = url;
      }),
    );
  return images.get(url)!;
}

function noise(ctx: CanvasRenderingContext2D, w: number, h: number, n: number, color: string, a: number) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = Math.random() * a;
    ctx.fillStyle = color;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  ctx.globalAlpha = 1;
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  let line = "";
  for (const w of text.split(" ")) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y;
}

/** Shrinks the font until the text fits the width. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, px: number, maxW: number) {
  ctx.font = font(px);
  while (ctx.measureText(text).width > maxW && px > 20) ctx.font = font((px -= 4));
  return px;
}

// Dark glass card with a neon top edge: the base of every wall panel.
function glass(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#14161d");
  g.addColorStop(1, "#0b0c11");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.15, 0, 10, w * 0.15, 0, w * 0.7);
  glow.addColorStop(0, accent + "33");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  noise(ctx, w, h, 5000, "#ffffff", 0.035);
  ctx.strokeStyle = GOLD + "aa";
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.fillStyle = accent;
  ctx.fillRect(14, 14, w - 28, 10);
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.font = `600 34px ${BODY}`;
  ctx.fillStyle = color;
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "8px";
  ctx.fillText(text.toUpperCase(), x, y);
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
}

// ── Architecture ──

export type FloorKind = "marble" | "wood" | "grid" | "checker" | "concrete" | "carpet";

/** Lighten (k > 0) or darken (k < 0) a hex colour. */
function shade(hex: string, k: number) {
  const c = new THREE.Color(hex);
  return "#" + (k >= 0 ? c.lerp(new THREE.Color("#ffffff"), k) : c.lerp(new THREE.Color("#000000"), -k)).getHexString();
}

export function floorTexture(kind: FloorKind, a: string, b: string) {
  const { c, ctx } = make(1024, 1024);
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, 1024, 1024);
  if (kind === "marble") {
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = b;
      ctx.globalAlpha = 0.25 + Math.random() * 0.4;
      ctx.lineWidth = 0.6 + Math.random() * 2;
      ctx.beginPath();
      let x = Math.random() * 1024;
      let y = Math.random() * 1024;
      ctx.moveTo(x, y);
      for (let k = 0; k < 10; k++) ctx.lineTo((x += (Math.random() - 0.3) * 120), (y += (Math.random() - 0.5) * 90));
      ctx.stroke();
    }
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = GOLD;
    for (const p of [0, 512]) {
      ctx.fillRect(p, 0, 3, 1024);
      ctx.fillRect(0, p, 1024, 3);
    }
  } else if (kind === "wood") {
    // planks of slightly different tones, staggered joints
    for (let p = 0; p < 8; p++) {
      const x = p * 128;
      const cut = 150 + ((p * 397) % 700);
      for (const [y0, y1] of [
        [0, cut],
        [cut, 1024],
      ]) {
        ctx.fillStyle = Math.random() < 0.5 ? a : shade(a, -0.08 + Math.random() * 0.16);
        ctx.fillRect(x + 2, y0 + 2, 124, y1 - y0 - 4);
        ctx.strokeStyle = b;
        ctx.globalAlpha = 0.25;
        for (let g = 0; g < 6; g++) {
          ctx.beginPath();
          const gx = x + 10 + Math.random() * 108;
          ctx.moveTo(gx, y0);
          ctx.bezierCurveTo(gx + 6, y0 + 100, gx - 6, y1 - 100, gx + 3, y1);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = b;
      ctx.fillRect(x, 0, 2, 1024);
      ctx.fillRect(x, cut - 1, 128, 3);
    }
  } else if (kind === "grid") {
    ctx.strokeStyle = b;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    for (let p = 0; p <= 1024; p += 128) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 1024);
      ctx.moveTo(0, p);
      ctx.lineTo(1024, p);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1;
    for (let p = 0; p <= 1024; p += 32) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 1024);
      ctx.moveTo(0, p);
      ctx.lineTo(1024, p);
      ctx.stroke();
    }
  } else if (kind === "checker") {
    ctx.fillStyle = b;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) ctx.fillRect(x * 128, y * 128, 128, 128);
  } else if (kind === "concrete") {
    for (let i = 0; i < 40; i++) {
      const g = ctx.createRadialGradient(Math.random() * 1024, Math.random() * 1024, 0, Math.random() * 1024, Math.random() * 1024, 200);
      g.addColorStop(0, b + "55");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1024, 1024);
    }
    ctx.fillStyle = shade(b, -0.2);
    for (const p of [0, 512]) {
      ctx.fillRect(p, 0, 2, 1024);
      ctx.fillRect(0, p, 1024, 2);
    }
  } else {
    return arcadeCarpet(a);
  }
  ctx.globalAlpha = 1;
  noise(ctx, 1024, 1024, 9000, "#ffffff", 0.03);
  return c;
}

export function arcadeCarpet(base = "#0d0a1a") {
  const { c, ctx } = make(1024, 1024);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 1024);
  const cols = ["#ff4d1f", "#22d3ee", "#facc15", "#e879f9", "#34d399"];
  for (let i = 0; i < 140; i++) {
    ctx.save();
    ctx.translate(Math.random() * 1024, Math.random() * 1024);
    ctx.rotate(Math.random() * Math.PI);
    ctx.strokeStyle = cols[i % cols.length];
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 5;
    const s = 14 + Math.random() * 26;
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (i % 3 === 1) ctx.strokeRect(-s / 2, -s / 2, s, s);
    else {
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(-s / 3, -s / 2);
      ctx.lineTo(s / 3, s / 2);
      ctx.lineTo(s, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  return c;
}

/** Tall wall panels with soft grooves, in the room's colour. */
export function wallTexture(base: string) {
  const { c, ctx } = make(512, 512);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  noise(ctx, 512, 512, 3000, "#ffffff", 0.025);
  for (const x of [0, 256]) {
    const g = ctx.createLinearGradient(x, 0, x + 256, 0);
    g.addColorStop(0, shade(base, 0.06));
    g.addColorStop(0.5, base);
    g.addColorStop(1, shade(base, -0.12));
    ctx.fillStyle = g;
    ctx.fillRect(x + 10, 0, 236, 512);
    ctx.fillStyle = shade(base, -0.45);
    ctx.fillRect(x, 0, 6, 512);
    ctx.fillStyle = shade(base, 0.15);
    ctx.fillRect(x + 6, 0, 2, 512);
  }
  return c;
}

/** Coffered ceiling in the room's colour. */
export function ceilingTexture(base: string) {
  const { c, ctx } = make(512, 512);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = shade(base, 0.12);
  ctx.lineWidth = 10;
  ctx.strokeRect(30, 30, 452, 452);
  ctx.strokeStyle = shade(base, 0.06);
  ctx.lineWidth = 4;
  ctx.strokeRect(70, 70, 372, 372);
  return c;
}

export function glowSprite(color: string) {
  const { c, ctx } = make(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, color);
  g.addColorStop(0.25, color + "88");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return c;
}

export function nightSky() {
  const { c, ctx } = make(2048, 1024);
  const g = ctx.createLinearGradient(0, 0, 0, 1024);
  g.addColorStop(0, "#02030a");
  g.addColorStop(0.55, "#0b1130");
  g.addColorStop(0.62, "#1b1740");
  g.addColorStop(1, "#05050a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 2600; i++) {
    const y = Math.random() ** 1.6 * 600;
    ctx.globalAlpha = 0.3 + Math.random() * 0.7;
    ctx.fillStyle = Math.random() < 0.1 ? "#ffe2b0" : "#ffffff";
    const s = Math.random() < 0.04 ? 3 : 1.4;
    ctx.fillRect(Math.random() * 2048, y, s, s);
  }
  ctx.globalAlpha = 1;
  return c;
}

// ── Cube faces ──

export function logoFace(img: HTMLImageElement | null, accent: string) {
  const { c, ctx } = make(512, 512);
  ctx.fillStyle = "#08090c";
  ctx.fillRect(0, 0, 512, 512);
  const glow = ctx.createRadialGradient(256, 256, 20, 256, 256, 300);
  glow.addColorStop(0, accent + "40");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 512, 512);
  if (img) {
    ctx.save();
    round(ctx, 96, 96, 320, 320, 56);
    ctx.clip();
    ctx.drawImage(img, 96, 96, 320, 320);
    ctx.restore();
  } else {
    // Gowtham's monogram
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 300px ${DISPLAY}`;
    const g = ctx.createLinearGradient(0, 120, 0, 400);
    g.addColorStop(0, "#fff3d6");
    g.addColorStop(1, GOLD);
    ctx.fillStyle = g;
    ctx.fillText("G", 256, 270);
  }
  ctx.strokeStyle = accent;
  ctx.lineWidth = 14;
  ctx.strokeRect(14, 14, 484, 484);
  ctx.strokeStyle = "#ffffff55";
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, 444, 444);
  return c;
}

// ── Wall panels (aspect 2:1) ──

export function storyPanel(site: Site, n: number) {
  const W = 2048;
  const H = 1024;
  const { c, ctx } = make(W, H);
  glass(ctx, W, H, site.accent);
  label(ctx, `Room ${String(n).padStart(2, "0")} · Live product`, 110, 130, site.accent);
  ctx.fillStyle = TEXT;
  fit(ctx, site.name, (px) => `800 ${px}px ${DISPLAY}`, 132, W - 220);
  ctx.fillText(site.name, 104, 290);
  ctx.font = `600 46px ${BODY}`;
  ctx.fillStyle = site.accent;
  ctx.fillText(site.domain + "  ↗", 110, 370);
  ctx.font = `500 50px ${BODY}`;
  ctx.fillStyle = TEXT;
  // the left column stops short of the features box at x 1080
  const tagEnd = wrap(ctx, site.tagline, 110, 470, 900, 62);
  ctx.font = `400 38px ${BODY}`;
  ctx.fillStyle = DIM;
  wrap(ctx, site.blurb, 110, tagEnd + 80, 900, 54);
  // features, right column
  ctx.fillStyle = "#ffffff0d";
  round(ctx, 1080, 420, 860, 480, 28);
  ctx.fill();
  label(ctx, "What it does", 1130, 490, GOLD);
  site.features.forEach((f, i) => {
    const y = 570 + i * 72;
    ctx.fillStyle = site.accent;
    ctx.beginPath();
    ctx.arc(1146, y - 13, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = TEXT;
    fit(ctx, f, (px) => `500 ${px}px ${BODY}`, 40, 720);
    ctx.fillText(f, 1180, y);
  });
  return c;
}

export function showcasePanel(site: Site, shot: HTMLImageElement | null) {
  const W = 2048;
  const H = 1024;
  const { c, ctx } = make(W, H);
  glass(ctx, W, H, site.accent);
  // framed screenshot, left
  const sx = 90;
  const sy = 110;
  const sw = 1240;
  const sh = 651;
  ctx.fillStyle = "#000";
  round(ctx, sx - 14, sy - 14, sw + 28, sh + 28, 26);
  ctx.fill();
  if (shot) {
    ctx.save();
    round(ctx, sx, sy, sw, sh, 16);
    ctx.clip();
    ctx.drawImage(shot, sx, sy, sw, sh);
    ctx.restore();
  }
  ctx.strokeStyle = site.accent;
  ctx.lineWidth = 4;
  round(ctx, sx - 14, sy - 14, sw + 28, sh + 28, 26);
  ctx.stroke();
  // tags under the shot
  let tx = sx;
  ctx.font = `600 34px ${BODY}`;
  for (const t of site.tags) {
    const w = ctx.measureText(t).width + 56;
    ctx.fillStyle = "#ffffff12";
    round(ctx, tx, 820, w, 70, 35);
    ctx.fill();
    ctx.fillStyle = TEXT;
    ctx.fillText(t, tx + 28, 867);
    tx += w + 18;
  }
  // numbers, right
  label(ctx, "By the numbers", 1420, 160, GOLD);
  site.numbers.forEach((s, i) => {
    const y = 330 + i * 250;
    ctx.fillStyle = site.accent;
    fit(ctx, s.big, (px) => `800 ${px}px ${DISPLAY}`, 150, 520);
    ctx.fillText(s.big, 1414, y);
    ctx.fillStyle = DIM;
    ctx.font = `500 40px ${BODY}`;
    ctx.fillText(s.small, 1420, y + 66);
  });
  return c;
}

export function aboutPanel() {
  const W = 2048;
  const H = 1024;
  const { c, ctx } = make(W, H);
  glass(ctx, W, H, GOLD);
  label(ctx, "About me", 110, 130, GOLD);
  ctx.fillStyle = TEXT;
  ctx.font = `800 110px ${DISPLAY}`;
  ctx.fillText("Hi, I'm Gowtham.", 104, 280);
  ctx.font = `500 50px ${BODY}`;
  ctx.fillStyle = TEXT;
  wrap(
    ctx,
    "I build fast, free web tools and ship them myself: design, code, 3D, servers, deploys and SEO.",
    110,
    400,
    1800,
    68,
  );
  ctx.font = `400 42px ${BODY}`;
  ctx.fillStyle = DIM;
  wrap(
    ctx,
    "One site grew into a network of nine: a 3D model library, a game center, media tools, a YouTube automation workflow and a Java game emulator written from scratch in JavaScript. Every room ahead is one of them.",
    110,
    580,
    1800,
    60,
  );
  ctx.font = `600 40px ${BODY}`;
  ctx.fillStyle = GOLD;
  ctx.fillText("Keep scrolling → each room is a live product.", 110, 900);
  return c;
}

export function heroPanel(stats: { big: string; small: string }[]) {
  const W = 2048;
  const H = 1024;
  const { c, ctx } = make(W, H);
  glass(ctx, W, H, GOLD);
  ctx.textAlign = "center";
  label(ctx, "Welcome to the museum of", W / 2, 150, GOLD);
  ctx.textAlign = "center";
  const g = ctx.createLinearGradient(0, 200, 0, 420);
  g.addColorStop(0, "#fff6e0");
  g.addColorStop(1, GOLD);
  ctx.fillStyle = g;
  ctx.font = `900 250px ${DISPLAY}`;
  ctx.fillText("GOWTHAM", W / 2, 410);
  ctx.font = `500 50px ${BODY}`;
  ctx.fillStyle = TEXT;
  ctx.fillText("Creative web developer  ·  Founder of CodeLove", W / 2, 500);
  stats.forEach((s, i) => {
    const x = 270 + i * 503;
    ctx.fillStyle = "#ffffff0d";
    round(ctx, x - 210, 600, 420, 300, 28);
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.font = `800 120px ${DISPLAY}`;
    ctx.fillText(s.big, x, 770);
    ctx.fillStyle = DIM;
    ctx.font = `500 40px ${BODY}`;
    ctx.fillText(s.small, x, 845);
  });
  return c;
}

export function skillsPanel(groups: { title: string; items: string[] }[]) {
  const W = 2048;
  const H = 1024;
  const { c, ctx } = make(W, H);
  glass(ctx, W, H, "#22d3ee");
  label(ctx, "Workshop", 110, 130, "#22d3ee");
  ctx.fillStyle = TEXT;
  ctx.font = `800 100px ${DISPLAY}`;
  ctx.fillText("My toolbox", 104, 260);
  const cols = ["#22d3ee", GOLD, "#f472b6", "#34d399"];
  groups.forEach((gr, i) => {
    const x = 110 + (i % 2) * 940;
    const y = 380 + Math.floor(i / 2) * 300;
    ctx.fillStyle = cols[i];
    ctx.font = `700 48px ${DISPLAY}`;
    ctx.fillText(gr.title, x, y);
    let cx = x;
    let cy = y + 40;
    ctx.font = `500 34px ${BODY}`;
    for (const it of gr.items) {
      const w = ctx.measureText(it).width + 48;
      if (cx + w > x + 880) {
        cx = x;
        cy += 82;
      }
      ctx.fillStyle = "#ffffff12";
      round(ctx, cx, cy, w, 64, 32);
      ctx.fill();
      ctx.fillStyle = TEXT;
      ctx.fillText(it, cx + 24, cy + 44);
      cx += w + 14;
    }
  });
  return c;
}

export function stepsPanel(steps: { title: string; text: string }[]) {
  const W = 2048;
  const H = 1024;
  const { c, ctx } = make(W, H);
  glass(ctx, W, H, "#22d3ee");
  label(ctx, "Process", 110, 130, "#22d3ee");
  ctx.fillStyle = TEXT;
  ctx.font = `800 100px ${DISPLAY}`;
  ctx.fillText("How I ship", 104, 260);
  steps.forEach((s, i) => {
    const x = 110 + i * 470;
    ctx.fillStyle = "#ffffff0d";
    round(ctx, x, 340, 430, 580, 28);
    ctx.fill();
    ctx.fillStyle = "#22d3ee";
    ctx.font = `800 110px ${DISPLAY}`;
    ctx.fillText(String(i + 1).padStart(2, "0"), x + 36, 480);
    ctx.fillStyle = TEXT;
    ctx.font = `700 42px ${DISPLAY}`;
    wrap(ctx, s.title, x + 36, 570, 360, 52);
    ctx.fillStyle = DIM;
    ctx.font = `400 34px ${BODY}`;
    wrap(ctx, s.text, x + 36, 690, 360, 48);
  });
  return c;
}

export function contactPanel(contact: { whatsapp: string; emails: { label: string; email: string }[] }) {
  const W = 2048;
  const H = 1024;
  const { c, ctx } = make(W, H);
  glass(ctx, W, H, GOLD);
  label(ctx, "Contact", 110, 130, GOLD);
  ctx.fillStyle = TEXT;
  ctx.font = `800 104px ${DISPLAY}`;
  ctx.fillText("Let's build", 104, 260);
  ctx.fillStyle = GOLD;
  ctx.fillText("something.", 104, 380);
  ctx.font = `500 42px ${BODY}`;
  ctx.fillStyle = DIM;
  wrap(ctx, "Have an idea, a project or a collaboration in mind? I'm one message away.", 110, 470, 1300, 58);
  // WhatsApp and the three mail addresses
  const rows = [{ label: "WhatsApp", email: contact.whatsapp }, ...contact.emails];
  rows.forEach((r, i) => {
    const y = 650 + i * 78;
    ctx.font = `600 32px ${BODY}`;
    ctx.fillStyle = GOLD;
    ctx.fillText(r.label.toUpperCase(), 110, y);
    ctx.font = `600 44px ${BODY}`;
    ctx.fillStyle = TEXT;
    ctx.fillText(r.email, 620, y);
  });
  return c;
}

export function networkPanel(list: Site[], logos: (HTMLImageElement | null)[]) {
  const W = 2048;
  const H = 1024;
  const { c, ctx } = make(W, H);
  glass(ctx, W, H, GOLD);
  label(ctx, "Thanks for walking through", 110, 130, GOLD);
  ctx.fillStyle = TEXT;
  ctx.font = `800 96px ${DISPLAY}`;
  ctx.fillText("The CodeLove network", 104, 250);
  list.forEach((s, i) => {
    const x = 110 + (i % 3) * 620;
    const y = 330 + Math.floor(i / 3) * 210;
    ctx.fillStyle = "#ffffff0d";
    round(ctx, x, y, 580, 170, 26);
    ctx.fill();
    const img = logos[i];
    if (img) {
      ctx.save();
      round(ctx, x + 26, y + 30, 110, 110, 24);
      ctx.clip();
      ctx.drawImage(img, x + 26, y + 30, 110, 110);
      ctx.restore();
    }
    ctx.fillStyle = TEXT;
    fit(ctx, s.name, (px) => `700 ${px}px ${DISPLAY}`, 38, 400);
    ctx.fillText(s.name, x + 160, y + 80);
    ctx.fillStyle = s.accent;
    fit(ctx, s.domain, (px) => `500 ${px}px ${BODY}`, 30, 400);
    ctx.fillText(s.domain, x + 160, y + 128);
  });
  return c;
}

/** A still pulled from a video, as Video to Images saves it: a sunset clip, frame n of a sequence. */
export function videoFrame(n: number) {
  const W = 1024;
  const H = 576;
  const { c, ctx } = make(W, H);
  const t = n / 7; // 0..1 through the clip: the sun sinks, the sky warms
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.7);
  sky.addColorStop(0, `hsl(${215 - t * 40}, 55%, ${48 - t * 22}%)`);
  sky.addColorStop(1, `hsl(${32 - t * 14}, 90%, ${66 - t * 14}%)`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `hsl(42, 100%, ${78 - t * 12}%)`;
  ctx.beginPath();
  ctx.arc(W * (0.3 + t * 0.35), H * (0.3 + t * 0.32), 46, 0, Math.PI * 2);
  ctx.fill();
  // two ridges of hills, the near one darker
  for (const [base, amp, col] of [
    [0.62, 40, `hsl(260, 25%, ${30 - t * 10}%)`],
    [0.74, 30, `hsl(250, 30%, ${16 - t * 6}%)`],
  ] as const) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, H * base - Math.sin(x / 130 + base * 9) * amp - Math.sin(x / 47) * amp * 0.25);
    ctx.lineTo(W, H);
    ctx.fill();
  }
  // the file name the tool would give it
  ctx.fillStyle = "#000000a0";
  ctx.fillRect(0, H - 64, W, 64);
  ctx.fillStyle = TEXT;
  ctx.font = `600 30px ${BODY}`;
  ctx.fillText(`frame_${String(n * 24 + 1).padStart(4, "0")}.jpg`, 28, H - 22);
  ctx.textAlign = "right";
  ctx.fillStyle = DIM;
  ctx.fillText(`00:${String(n).padStart(2, "0")} · 1080p`, W - 28, H - 22);
  return c;
}

export function gameWallTitle(accent: string) {
  const { c, ctx } = make(2048, 256);
  ctx.textAlign = "center";
  ctx.font = `900 150px ${DISPLAY}`;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 40;
  ctx.fillStyle = "#fff";
  ctx.fillText("GAME CENTER", 1024, 180);
  return c;
}

// ── Small signs ──

export function doorSign(top: string, main: string, accent: string) {
  const { c, ctx } = make(1024, 256);
  ctx.fillStyle = "#0b0c10";
  round(ctx, 8, 8, 1008, 240, 30);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.font = `600 34px ${BODY}`;
  ctx.fillStyle = DIM;
  ctx.fillText(top.toUpperCase(), 512, 84);
  ctx.fillStyle = TEXT;
  fit(ctx, main, (px) => `800 ${px}px ${DISPLAY}`, 76, 920);
  ctx.fillText(main, 512, 180);
  return c;
}

export function button(text: string, accent: string) {
  const { c, ctx } = make(1024, 256);
  ctx.fillStyle = accent;
  round(ctx, 10, 10, 1004, 236, 118);
  ctx.fill();
  ctx.fillStyle = "#08090c";
  ctx.textAlign = "center";
  fit(ctx, text, (px) => `800 ${px}px ${DISPLAY}`, 92, 900);
  ctx.fillText(text, 512, 158);
  return c;
}

export function gameLabel(g: Game) {
  const { c, ctx } = make(1024, 200);
  ctx.fillStyle = "#08090c";
  round(ctx, 6, 6, 1012, 188, 24);
  ctx.fill();
  ctx.strokeStyle = g.accent;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = TEXT;
  fit(ctx, g.title, (px) => `800 ${px}px ${DISPLAY}`, 70, 640);
  ctx.fillText(g.title, 40, 125);
  ctx.fillStyle = g.accent;
  ctx.textAlign = "right";
  ctx.font = `700 46px ${BODY}`;
  ctx.fillText("▶ PLAY", 984, 122);
  return c;
}

/** CRT scanlines with a dark vignette, laid over every TV screen. */
export function scanlines() {
  const { c, ctx } = make(256, 256);
  for (let y = 0; y < 256; y += 4) {
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, y, 256, 2);
  }
  const v = ctx.createRadialGradient(128, 128, 60, 128, 128, 190);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 256, 256);
  return c;
}

export function endSign() {
  const { c, ctx } = make(2048, 768);
  ctx.textAlign = "center";
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 50;
  ctx.font = `900 220px ${DISPLAY}`;
  ctx.fillStyle = "#fff4dc";
  ctx.fillText("LET'S BUILD", 1024, 260);
  ctx.fillStyle = GOLD;
  ctx.fillText("SOMETHING", 1024, 500);
  ctx.shadowBlur = 0;
  ctx.font = `500 56px ${BODY}`;
  ctx.fillStyle = TEXT;
  ctx.fillText("thanks for walking through my rooms", 1024, 640);
  return c;
}
