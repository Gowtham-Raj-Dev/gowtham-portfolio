// Background music for the walk, composed in code with WebAudio so there's no audio file
// to download: a slow four-chord loop (Dmaj9 → Bm9 → Gmaj9 → A6/9) of warm pads, a soft
// bass and a gentle plucked arpeggio, all through a generated reverb. Browsers only allow
// sound after a click, so it starts from the "Enter with music" button or the music switch.

const BPM = 76;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const CHORDS = [
  { bass: 38, pad: [66, 69, 73, 76] },
  { bass: 35, pad: [66, 69, 73, 74] },
  { bass: 31, pad: [66, 69, 71, 74] },
  { bass: 33, pad: [64, 66, 71, 73] },
];
// Arpeggio over two bars: indexes into the chord's pad notes, -1 = rest
const ARP = [0, 2, 1, 3, 2, -1, 1, 2, 0, 3, 2, -1, 1, 2, 3, -1];

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bus: GainNode | null = null;
let timer = 0;
let nextStep = 0; // time of the next 8th note
let step = 0;
let playing = false;

function reverb(c: AudioContext, seconds = 3) {
  const len = c.sampleRate * seconds;
  const b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  const conv = c.createConvolver();
  conv.buffer = b;
  return conv;
}

function setup() {
  const c = new AudioContext();
  master = c.createGain();
  master.gain.value = 0;
  master.connect(c.destination);
  // dry + reverb + a dotted-8th echo
  bus = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2600;
  bus.connect(lp);
  lp.connect(master);
  const verb = reverb(c);
  const wet = c.createGain();
  wet.gain.value = 0.55;
  lp.connect(verb).connect(wet).connect(master);
  const delay = c.createDelay(1);
  delay.delayTime.value = BEAT * 0.75;
  const fb = c.createGain();
  fb.gain.value = 0.32;
  const dw = c.createGain();
  dw.gain.value = 0.25;
  lp.connect(delay).connect(fb).connect(delay);
  delay.connect(dw).connect(verb);
  ctx = c;
}

function pad(midi: number, t: number, dur: number) {
  const c = ctx!;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.035, t + 1.6);
  g.gain.setValueAtTime(0.035, t + dur - 0.2);
  g.gain.linearRampToValueAtTime(0, t + dur + 1.8);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(700, t);
  f.frequency.linearRampToValueAtTime(1500, t + dur / 2);
  f.frequency.linearRampToValueAtTime(800, t + dur);
  f.connect(g).connect(bus!);
  for (const [type, cents] of [
    ["sine", -6],
    ["triangle", 6],
  ] as const) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = hz(midi);
    o.detune.value = cents;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 2);
  }
}

function bass(midi: number, t: number, dur: number) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.value = hz(midi);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.12, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.04, t + dur * 0.6);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(bus!);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function pluck(midi: number, t: number, vel: number) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = "triangle";
  o.frequency.value = hz(midi);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.05 * vel, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.9);
  o.connect(g).connect(bus!);
  o.start(t);
  o.stop(t + 1);
}

// Schedules the next few notes ahead of time so the music never stutters.
function schedule() {
  if (!ctx) return;
  while (nextStep < ctx.currentTime + 0.4) {
    const chord = CHORDS[Math.floor(step / 16) % CHORDS.length];
    const inChord = step % 16;
    if (inChord === 0) {
      chord.pad.forEach((n) => pad(n, nextStep, BAR * 2));
      bass(chord.bass, nextStep, BAR);
    }
    if (inChord === 8) bass(chord.bass, nextStep, BAR);
    // the arpeggio sits out every fourth chord, so the loop breathes
    const a = ARP[inChord];
    if (a >= 0 && Math.floor(step / 16) % 4 !== 3) pluck(chord.pad[a] + 12, nextStep, 0.6 + Math.random() * 0.4);
    nextStep += BEAT / 2;
    step++;
  }
}

// ── Sound effects (manual mode): synthesised too, and only while sound is on ──
let fx: GainNode | null = null;
const fxOut = () => {
  if (!ctx || !playing) return null;
  if (!fx) {
    fx = ctx.createGain();
    fx.gain.value = 0.7;
    fx.connect(ctx.destination);
  }
  return fx;
};
const noise = (c: AudioContext, seconds: number) => {
  const b = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * seconds)), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
};
// a filtered noise burst: footsteps, whooshes, thuds
function burst(seconds: number, type: BiquadFilterType, freq: number, peak: number, sweepTo?: number) {
  const out = fxOut();
  if (!ctx || !out) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, seconds);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + seconds);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.02, seconds / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  src.connect(f).connect(g).connect(out);
  src.start(t);
}
function tone(from: number, to: number, seconds: number, peak: number, type: OscillatorType = "sine") {
  const out = fxOut();
  if (!ctx || !out) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + seconds);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + seconds + 0.02);
}
export const sfx = {
  step: () => burst(0.09, "lowpass", 420 + Math.random() * 160, 0.22),
  grab: () => {
    burst(0.07, "bandpass", 1800, 0.25);
    tone(520, 760, 0.12, 0.08, "triangle");
  },
  throw: () => burst(0.35, "bandpass", 500, 0.3, 2200),
  kick: () => {
    tone(140, 45, 0.18, 0.55);
    burst(0.25, "bandpass", 700, 0.22, 2400);
  },
  bounce: (k: number) => {
    tone(110 + Math.random() * 40, 50, 0.12, 0.35 * k);
    burst(0.05, "lowpass", 900, 0.2 * k);
  },
  land: () => tone(90, 40, 0.15, 0.4),
  home: () => tone(660, 1320, 0.35, 0.08, "triangle"),
  ui: () => tone(880, 1100, 0.06, 0.05, "triangle"),
};

let ducked = false;
const level = () => (ducked ? 0.22 : 0.9);

/** Lowers the music while a guide is talking, and brings it back after. */
export function duck(on: boolean) {
  ducked = on;
  if (!ctx || !master || !playing) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
  master.gain.linearRampToValueAtTime(level(), ctx.currentTime + (on ? 0.4 : 1.2));
}

export function setSound(on: boolean) {
  if (on === playing) return;
  playing = on;
  if (on) {
    if (!ctx) setup();
    const c = ctx!;
    c.resume();
    nextStep = c.currentTime + 0.1;
    step = 0;
    master!.gain.cancelScheduledValues(c.currentTime);
    master!.gain.setValueAtTime(master!.gain.value, c.currentTime);
    master!.gain.linearRampToValueAtTime(level(), c.currentTime + 2.5);
    schedule();
    timer = window.setInterval(schedule, 120);
  } else if (ctx) {
    const c = ctx;
    window.clearInterval(timer);
    master!.gain.cancelScheduledValues(c.currentTime);
    master!.gain.setValueAtTime(master!.gain.value, c.currentTime);
    master!.gain.linearRampToValueAtTime(0, c.currentTime + 0.8);
    window.setTimeout(() => !playing && c.suspend(), 900);
  }
}
