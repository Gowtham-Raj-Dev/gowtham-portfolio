#!/usr/bin/env node
/**
 * Renders every guide's line (src/lib/content.ts) to public/voices/<room>.wav with Gemini TTS,
 * so the site plays real voices without shipping an API key. Only lines that changed since the
 * last run are rendered again (public/voices/voices.json keeps a hash of each).
 *
 * Keys: GEMINI_TTS_KEYS / GEMINI_API_KEY in the environment, or in ../games.codelove.in/.env.local.
 *   node scripts/build-voices.mjs          # render new / changed lines
 *   node scripts/build-voices.mjs --force  # render everything again
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "voices");
const MODEL = "gemini-3.8-flash-tts";
const CHECK_MODEL = "gemini-3.8-flash"; // transcribes each take to make sure it says the line and nothing else
// Only the line itself is sent: any style note in the text got read out loud with it. The voice
// comes from the voice name, the accent from the language code.
const LANG = "en-IN";
// a different voice for each guide, in room order
const VOICES = { f: ["Achernar", "Kore", "Leda", "Aoede", "Despina"], m: ["Charon", "Puck", "Orus", "Iapetus", "Algieba", "Fenrir", "Umbriel"] };

function keys() {
  const file = path.join(ROOT, "..", "games.codelove.in", ".env.local");
  const env = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const read = (name) => process.env[name] ?? new RegExp("^" + name + "=(.+)$", "m").exec(env)?.[1] ?? "";
  const all = [read("GEMINI_TTS_KEYS"), read("GEMINI_API_KEY")].join(",").split(",").map((k) => k.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  if (!all.length) throw new Error("no Gemini API key: set GEMINI_TTS_KEYS or GEMINI_API_KEY");
  return [...new Set(all)];
}

function guides() {
  const src = fs.readFileSync(path.join(ROOT, "src", "lib", "content.ts"), "utf8");
  const female = new Set([...(/femaleGuides = new Set\(\[([^\]]*)\]/.exec(src)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  const block = src.slice(src.indexOf("export const guides"));
  const unq = (s) => JSON.parse(`"${s}"`);
  return [...block.matchAll(/(\w+):\s*\{\s*name:\s*"((?:[^"\\]|\\.)*)",\s*line:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => ({ id: m[1], name: unq(m[2]), line: unq(m[3]), g: female.has(m[1]) ? "f" : "m" }));
}

const wavOf = (pcm, rate) => {
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + pcm.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); // PCM
  head.writeUInt16LE(1, 22); // mono
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write("data", 36);
  head.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([head, pcm]);
};

// Cut the silence Gemini leaves at both ends (16-bit mono samples), keeping a short breath, and drop
// the click or half-word it sometimes adds after the line: a blip under half a second that comes
// after a clear pause. Then fade both ends so nothing pops.
function trim(pcm, rate) {
  const n = pcm.length >> 1;
  // work in 10 ms frames: a frame is "sound" if any sample in it is loud
  const F = Math.round(rate / 100);
  const frames = Math.ceil(n / F);
  const sound = new Uint8Array(frames);
  for (let i = 0; i < n; i++) if (Math.abs(pcm.readInt16LE(i * 2)) > 600) sound[(i / F) | 0] = 1;
  let a = 0;
  while (a < frames && !sound[a]) a++;
  let b = frames - 1;
  while (b > a && !sound[b]) b--;
  for (;;) {
    // the last stretch of sound (gaps under 250 ms count as part of it), then the pause before it
    let s = b;
    for (let quiet = 0; s > a && quiet < 25; s--) quiet = sound[s] ? 0 : quiet + 1;
    s += 25;
    let gapEnd = s - 1;
    while (gapEnd > a && !sound[gapEnd]) gapEnd--;
    if (b - s > 50 || s - gapEnd < 30 || gapEnd <= a) break;
    b = gapEnd; // under half a second after a 300 ms+ pause: a blip, so cut it and look again
  }
  a *= F;
  b = Math.min(n - 1, (b + 1) * F);
  const pad = Math.round(rate * 0.12);
  const out = Buffer.from(pcm.subarray(Math.max(0, a - pad) * 2, Math.min(n, b + pad) * 2));
  const m = out.length >> 1;
  const fade = Math.min(Math.round(rate * 0.08), m >> 1);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    out.writeInt16LE(Math.round(out.readInt16LE(i * 2) * k), i * 2);
    out.writeInt16LE(Math.round(out.readInt16LE((m - 1 - i) * 2) * k), (m - 1 - i) * 2);
  }
  return out;
}

const words = (s) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
// share of the line's words heard in order (longest common subsequence), and how many extra words were said
function match(line, heard) {
  const x = words(line);
  const y = words(heard);
  const dp = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const common = dp[x.length][y.length];
  return { score: common / x.length, extra: y.length - common };
}

async function transcribe(wav, key) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${CHECK_MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Transcribe this speech word for word. Reply with only the words you hear, nothing else." }, { inlineData: { mimeType: "audio/wav", data: wav.toString("base64") } }] }],
    }),
  }).then((res) => res.json(), () => ({}));
  return r.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join(" ").trim() ?? "";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tts(text, voice, ks) {
  for (let attempt = 0; attempt < ks.length * 3; attempt++) {
    const key = ks[attempt % ks.length];
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { languageCode: LANG, voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      }),
    }).then((res) => res.json(), (e) => ({ error: { message: String(e) } }));
    const audio = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (audio) return { pcm: Buffer.from(audio.data, "base64"), rate: Number(/rate=(\d+)/.exec(audio.mimeType)?.[1] ?? 24000) };
    console.warn(`  retry (${r.error?.message?.slice(0, 120) ?? "no audio"})`);
    await sleep(4000 * (attempt + 1));
  }
  throw new Error("Gemini TTS gave no audio");
}

const force = process.argv.includes("--force");
fs.mkdirSync(OUT, { recursive: true });
const manifestFile = path.join(OUT, "voices.json");
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : {};
const ks = keys();
const used = { f: 0, m: 0 };
for (const gd of guides()) {
  const voice = VOICES[gd.g][used[gd.g]++ % VOICES[gd.g].length];
  const hash = crypto.createHash("sha1").update(`${MODEL}|${voice}|${LANG}|${gd.line}`).digest("hex").slice(0, 12);
  const file = path.join(OUT, `${gd.id}.wav`);
  // a line is done once a take of it passed the check; anything else is recorded again
  if (!force && manifest[gd.id]?.hash === hash && manifest[gd.id]?.checked && fs.existsSync(file)) {
    console.log(`${gd.id}: unchanged`);
    continue;
  }
  console.log(`${gd.id}: ${gd.name} (${voice})…`);
  // keep the take only if it says the line, all of it, with nothing added; else try again
  let best = null;
  let checked = false;
  for (let take = 1; take <= 4; take++) {
    const { pcm, rate } = await tts(gd.line, voice, ks);
    const wav = wavOf(trim(pcm, rate), rate);
    let heard = "";
    for (const k of ks) if (!heard) heard = await transcribe(wav, k);
    if (!heard) {
      // no quota left to check it: keep this take for now, a later run checks it again
      console.log(`  take ${take}: couldn't be checked (no transcript), kept as unchecked`);
      best ??= { wav, rank: -1 };
      break;
    }
    const m = match(gd.line, heard);
    console.log(`  take ${take}: ${Math.round(m.score * 100)}% of the words, ${m.extra} extra`);
    if (!best || m.score - m.extra * 0.05 > best.rank) best = { wav, rank: m.score - m.extra * 0.05 };
    if (m.score >= 0.95 && m.extra <= 1) {
      checked = true;
      break;
    }
  }
  fs.writeFileSync(file, best.wav);
  manifest[gd.id] = { hash, voice, checked };
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
}
console.log(`Done: ${OUT}`);
