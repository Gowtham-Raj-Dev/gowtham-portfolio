import { duck } from "./audio";

// Plays each guide's line from public/voices/<room>.wav (Gemini TTS, rendered by
// scripts/build-voices.mjs); without that file, falls back to the browser's own speech voices,
// preferring an Indian-English voice of the right gender. The music is lowered meanwhile.

const FEMALE = /heera|neerja|swara|kalpana|veena|female|zira|aria|jenny|samantha|sonia|libby|susan|hazel|natasha/i;
const MALE = /ravi|prabhat|hemant|rishi|male|david|guy|mark|daniel|george|ryan|thomas/i;

let voices: SpeechSynthesisVoice[] = [];
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const load = () => (voices = speechSynthesis.getVoices());
  load();
  speechSynthesis.addEventListener?.("voiceschanged", load);
}

function pick(gender: "m" | "f") {
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const want = gender === "f" ? FEMALE : MALE;
  for (const pref of [(v: SpeechSynthesisVoice) => /en.IN/i.test(v.lang), (v: SpeechSynthesisVoice) => /en.GB/i.test(v.lang), () => true]) {
    const v = en.filter(pref).find((x) => want.test(x.name));
    if (v) return { v, exact: true };
  }
  const v = en.find((x) => /en.IN/i.test(x.lang)) ?? en[0];
  return v ? { v, exact: false } : null;
}

export const canSpeak = () => typeof window !== "undefined" && ("speechSynthesis" in window || "Audio" in window);

/** Plays the room's recorded voice, or speaks the text; returns a function that stops it. onEnd runs once, however it ends. */
export function speak(room: string, text: string, gender: "m" | "f", onEnd: () => void) {
  let stopped = false;
  let stopNow = () => {};
  const a = new Audio(`/voices/${room}.wav`);
  const finish = () => {
    if (stopped) return;
    stopped = true;
    duck(false);
    onEnd();
  };
  a.onended = finish;
  let fellBack = false;
  const fallBack = () => {
    // no recording for this room: read it with the browser's voice instead
    if (fellBack) return;
    fellBack = true;
    if (!stopped && "speechSynthesis" in window) stopNow = synth(text, gender, finish);
    else finish();
  };
  a.onerror = fallBack;
  duck(true);
  a.play().catch(fallBack);
  return () => {
    stopped = true;
    a.pause();
    stopNow();
    duck(false);
  };
}

function synth(text: string, gender: "m" | "f", onEnd: () => void) {
  let done = false;
  let keepAlive = 0; // set below; the utterance can fail and finish before then
  const finish = () => {
    if (done) return;
    done = true;
    clearInterval(keepAlive);
    duck(false);
    onEnd();
  };
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const p = pick(gender);
  if (p) {
    u.voice = p.v;
    u.lang = p.v.lang;
  } else u.lang = "en-IN";
  // with no voice of the right gender, nudge the pitch instead
  u.pitch = p?.exact ? 1 : gender === "f" ? 1.25 : 0.85;
  u.rate = 1;
  u.onstart = () => duck(true);
  u.onend = finish;
  u.onerror = finish;
  speechSynthesis.speak(u);
  duck(true);
  // Chrome stops long utterances after ~15 s unless nudged
  if (!done)
    keepAlive = window.setInterval(() => {
      if (!speechSynthesis.speaking) return;
      speechSynthesis.pause();
      speechSynthesis.resume();
    }, 10000);
  return () => {
    done = true;
    clearInterval(keepAlive);
    speechSynthesis.cancel();
    duck(false);
  };
}
