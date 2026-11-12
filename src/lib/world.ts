import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rooms, games, skills, steps, stats, femaleGuides, contact, type Room } from "./content";
import { sites } from "./sites";
import * as T from "./textures";
import { sfx } from "./audio";

// A museum of rooms joined by short corridors. Each room shows one product: a pillar in
// the middle carries a spinning cube with the product's logo on every face, two walls hold
// its story, and the room has its own look and furniture. Every room turns 90°, and inside
// it the camera circles the long way round the pillar, so the walk winds left and right.

const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const; // N E S W
// Exit wall of each room. Alternating E/W with N in between makes a snake that never overlaps.
const EXITS = [1, 0, 3, 0, 1, 0, 3, 0, 1, 0, 3, 0, 1];
const CL = 7; // corridor length
const DW = 4; // door width
const DH = 4.6; // door height
const EYE = 1.8;
const ZERO2 = new THREE.Vector2();
const CUBE_Y = 4.4;
const PALM_ROLL = -0.4; // radians the forearms are twisted: palms half turned in, fingers in view
const PROP = 1.22; // furniture scale against the tall rooms
const GUIDE_H = 1.95; // guide height, metres
const ROUGH: Record<string, number> = { marble: 0.2, wood: 0.55, grid: 0.3, checker: 0.3, concrete: 0.85, carpet: 0.9 };

const sizeOf = (r: Room) => (r.kind === "games" ? 24 : r.kind === "lobby" || r.kind === "exit" ? 18 : 16);
const heightOf = (r: Room) => (r.kind === "games" ? 8.5 : 7);

// Each room's own look: wall colour, floor, ceiling and trim.
type Theme = { wall: string; floor: T.FloorKind; f1: string; f2: string; ceil: string; trim: string };
const GOLD_ROOM: Theme = { wall: "#1b1b21", floor: "marble", f1: "#121318", f2: "#2a2b33", ceil: "#0e0f13", trim: "#c89b45" };
const THEMES: Record<string, Theme> = {
  lobby: GOLD_ROOM,
  codelove: { wall: "#13203f", floor: "grid", f1: "#0b1226", f2: "#2c4fae", ceil: "#0a1022", trim: "#3d6bff" },
  models: { wall: "#221935", floor: "marble", f1: "#1a1426", f2: "#5a4a85", ceil: "#120d1e", trim: "#8b5cf6" },
  games: { wall: "#160f2a", floor: "carpet", f1: "#0d0a1a", f2: "#ff4d1f", ceil: "#0b0816", trim: "#ff4d1f" },
  downloader: { wall: "#3a1c18", floor: "wood", f1: "#4a2e1d", f2: "#2c1a0f", ceil: "#1a0e0b", trim: "#f43f5e" },
  linkinbio: { wall: "#d9cfee", floor: "wood", f1: "#c9a77f", f2: "#a8835a", ceil: "#f1ecf8", trim: "#9b5cf0" },
  videotogif: { wall: "#0f2a30", floor: "checker", f1: "#0a1619", f2: "#17444d", ceil: "#081417", trim: "#00b8cc" },
  videotoimages: { wall: "#ece9e3", floor: "concrete", f1: "#d3cec5", f2: "#bab4a9", ceil: "#f7f5f1", trim: "#8a8f99" },
  videocut: { wall: "#29140d", floor: "grid", f1: "#170b06", f2: "#6b2b12", ceil: "#170a05", trim: "#f97316" },
  utubeflow: { wall: "#16301f", floor: "wood", f1: "#6a4a2c", f2: "#46301b", ceil: "#0f2018", trim: "#34d399" },
  javaplay: { wall: "#33200e", floor: "checker", f1: "#1c130a", f2: "#6a3c12", ceil: "#1a1008", trim: "#ff8a1f" },
  workshop: { wall: "#45464a", floor: "concrete", f1: "#6a6b6e", f2: "#58595c", ceil: "#2a2b2e", trim: "#22d3ee" },
  exit: GOLD_ROOM,
};

// Furniture per room, from the CC0 kits of the Free 3D Models library.
// slot 0-3: along the entrance wall, 4-7: along the exit wall, 8-11: the corners.
type Decor = { m: string; h: number; slot: number; y?: number; dz?: number; plinth?: boolean; spin?: boolean };
// "monitor" and "frame" are built in code; the rest are textured models (the avatar-show kit) or,
// in the 3D Models room, the library's own characters on pedestals. Slot 10 is the guide's corner.
const desk = (slot: number, chair = true): Decor[] => [
  { m: "avatar-show__table", h: 0.76, slot },
  { m: "monitor", h: 1, slot, y: 0.76 },
  ...(chair ? [{ m: "avatar-show__arm-chair", h: 0.95, slot, dz: 1.0 }] : []),
];
const plant = (slot: number, h = 1.6): Decor => ({ m: "avatar-show__banana-plant", h, slot });
const sofa = (slot: number): Decor => ({ m: "avatar-show__long-chair", h: 0.9, slot });
const DECOR: Record<string, Decor[]> = {
  lobby: [sofa(5), sofa(6), { m: "avatar-show__arm-chair", h: 0.95, slot: 8 }, plant(9), plant(11), plant(4), plant(7)],
  codelove: [...desk(4), ...desk(7), plant(8), plant(9), sofa(0), plant(3)],
  models: [
    { m: "cube-pets__animal-fox", h: 0.9, slot: 0, plinth: true, spin: true },
    { m: "cube-pets__animal-panda", h: 0.9, slot: 3, plinth: true, spin: true },
    { m: "cube-pets__animal-lion", h: 0.9, slot: 4, plinth: true, spin: true },
    { m: "cube-pets__animal-penguin", h: 0.9, slot: 7, plinth: true, spin: true },
    { m: "cube-pets__animal-giraffe", h: 1.3, slot: 8, plinth: true, spin: true },
    { m: "space-kit__astronaut-a", h: 1.2, slot: 9, plinth: true, spin: true },
    { m: "space-kit__alien", h: 1.1, slot: 11, plinth: true, spin: true },
    { m: "cube-pets__animal-elephant", h: 1.0, slot: 1, plinth: true, spin: true },
  ],
  downloader: [...desk(4), ...desk(7), sofa(0), plant(8), plant(9), plant(3)],
  linkinbio: [...desk(4), sofa(0), sofa(3), { m: "avatar-show__arm-chair", h: 0.95, slot: 8 }, plant(9), plant(7)],
  videotogif: [{ m: "avatar-show__table", h: 0.76, slot: 0 }, { m: "monitor", h: 1.7, slot: 0, y: 0.76 }, sofa(9), { m: "avatar-show__arm-chair", h: 0.95, slot: 8 }, plant(4), plant(7), plant(3)],
  videotoimages: [0, 1, 2, 3, 4, 7].map((slot): Decor => ({ m: "frame", h: 1, slot })).concat([plant(8), plant(9)]),
  videocut: [...desk(0), ...desk(4), sofa(7), plant(8), plant(9), plant(3)],
  utubeflow: [plant(0, 2), plant(3, 2), plant(4, 2), plant(7, 2), plant(8, 2.2), plant(9, 2.2), plant(11, 2.2), sofa(1)],
  javaplay: [...desk(0), ...desk(3), plant(8), plant(9), sofa(5)],
  workshop: [...desk(0), ...desk(3), sofa(4), plant(7), plant(9), { m: "avatar-show__arm-chair", h: 0.95, slot: 8 }],
  exit: [sofa(0), sofa(3), plant(1), plant(2), plant(8, 2), plant(9, 2)],
};

export type RoomInfo = { name: string; accent: string; start: number; x: number; z: number };
export type WorldHandle = {
  rooms: RoomInfo[];
  /** auto: the scroll walks you along the path; manual: walk around yourself (WASD / joystick + drag to look). */
  setMode: (m: "auto" | "manual") => void;
  /** Mobile joystick, -1..1 (y = forward). */
  setJoystick: (x: number, y: number) => void;
  /** Pick up / throw / press whatever is in the middle of the screen. */
  interact: () => void;
  resetCubes: () => void;
  /** Manual mode on a desktop: capture the mouse again after Esc. */
  lock: () => void;
  /** The guide in the current room acts out talking while the narration plays. */
  setTalking: (on: boolean) => void;
  dispose: () => void;
};
export type WorldEvents = {
  getProgress: () => number;
  onRoom: (i: number) => void;
  onLoad: (pct: number) => void;
  onPlay: (slug: string) => void;
  /** You clicked a guide, or pressed T next to one. */
  onTalk: (room: number) => void;
  /** The guide you're standing next to (manual mode), or null. */
  onNear: (room: number | null) => void;
  /** Manual mode: whether the mouse is captured (Esc lets it go). */
  onLock: (locked: boolean) => void;
};

type Placed = {
  room: Room;
  theme: Theme;
  c: THREE.Vector3;
  S: number;
  H: number;
  e: number;
  x: number;
  A: number;
  B: number;
  group: THREE.Group;
  paint: (() => void)[];
  unpaint: (() => void)[];
  painted: boolean;
  cube: THREE.Object3D;
  spin: THREE.Object3D[];
};

type Clickable = { meshes: THREE.Object3D[]; room: number; act: () => void; hover?: (on: boolean) => void };

const dv = (k: number) => new THREE.Vector3(DIRS[k][0], 0, DIRS[k][1]);
// rotation.y that turns a plane (normal +z) to face into the room from wall k
const faceY = (k: number) => Math.atan2(-DIRS[k][0], -DIRS[k][1]);
const smooth = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

export async function createWorld(canvas: HTMLCanvasElement, ev: WorldEvents): Promise<WorldHandle> {
  await Promise.all(
    [`800 80px ${T.DISPLAY}`, `900 80px ${T.DISPLAY}`, `700 40px ${T.DISPLAY}`, `500 40px ${T.BODY}`, `600 40px ${T.BODY}`, `400 40px ${T.BODY}`].map((f) =>
      document.fonts.load(f),
    ),
  ).catch(() => {});
  ev.onLoad(8);

  const mobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const BG = new THREE.Color("#07080b");
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 18, 50);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.25;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 400);
  scene.add(camera);

  // Lights: a soft fill plus two lights that follow you into each room. Nothing glows.
  scene.add(new THREE.HemisphereLight(0xd8dce8, 0x2a2016, 0.55));
  const roomLight = new THREE.PointLight(0xffe6c8, 45, 30, 1.5);
  const accentLight = new THREE.PointLight(0xffffff, 5, 10, 1.8);
  scene.add(roomLight, accentLight);

  // ── Shared materials ──
  const trimCache = new Map<string, THREE.MeshStandardMaterial>();
  // Coloured metal trims: lit like everything else, they don't glow.
  const neon = (color: string, _k = 0) => {
    void _k;
    if (!trimCache.has(color)) trimCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.6 }));
    return trimCache.get(color)!;
  };
  const placeholder = new THREE.DataTexture(new Uint8Array([12, 13, 17, 255]), 1, 1);
  placeholder.colorSpace = THREE.SRGBColorSpace;
  placeholder.needsUpdate = true;
  // Printed surfaces (panels, cube faces, screens) are unlit so they read the same in every room.
  const printed = (level = 0.82) => new THREE.MeshBasicMaterial({ map: placeholder, color: new THREE.Color(level, level, level) });
  const setMap = (m: THREE.MeshBasicMaterial, t: THREE.Texture) => {
    m.map = t;
  };

  const scanTex = T.tex(T.scanlines(), 1, 1);
  const repeat = (t: THREE.Texture, rx: number, ry: number) => {
    const c = t.clone();
    c.wrapS = c.wrapT = THREE.RepeatWrapping;
    c.repeat.set(rx, ry);
    c.needsUpdate = true;
    return c;
  };
  const themeTex = new Map<string, THREE.Texture>();
  const cached = (key: string, make: () => HTMLCanvasElement) => {
    if (!themeTex.has(key)) themeTex.set(key, T.tex(make()));
    return themeTex.get(key)!;
  };
  const floorTexOf = (th: Theme) => cached(`f${th.floor}${th.f1}${th.f2}`, () => T.floorTexture(th.floor, th.f1, th.f2));
  const wallMats = new Map<string, THREE.MeshStandardMaterial>();
  const wallMat = (th: Theme, w: number, h: number) => {
    const key = `${th.wall}${w}x${h}`;
    if (!wallMats.has(key)) {
      const map = repeat(cached(`w${th.wall}`, () => T.wallTexture(th.wall)), w / 3, h / 3);
      wallMats.set(key, new THREE.MeshStandardMaterial({ map, roughness: 0.8, metalness: 0.05 }));
    }
    return wallMats.get(key)!;
  };
  const edgeMats = new Map<string, THREE.MeshStandardMaterial>();
  const edgeMat = (th: Theme) => {
    if (!edgeMats.has(th.wall)) edgeMats.set(th.wall, new THREE.MeshStandardMaterial({ color: th.wall, roughness: 0.8, metalness: 0.05 }));
    return edgeMats.get(th.wall)!;
  };
  // Box face order is +x, -x, +y, -y, +z, -z: a wall along x shows its z faces, one along z its x faces.
  const wallFaces = (th: Theme, w: number, h: number, alongZ = false) => {
    const tex = wallMat(th, w, h);
    const e = edgeMat(th);
    return alongZ ? [tex, tex, e, e, e, e] : [e, e, e, e, tex, tex];
  };
  const marble = new THREE.MeshStandardMaterial({ color: 0xe4ded3, roughness: 0.28, metalness: 0.05 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc89b45, roughness: 0.3, metalness: 1 });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x1d1e25, roughness: 0.45, metalness: 0.2 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x2b1c12, roughness: 0.6, metalness: 0.1 });

  const pillarGeo = new THREE.LatheGeometry(
    [
      [0, 0],
      [1.0, 0],
      [1.0, 0.22],
      [0.86, 0.3],
      [0.86, 0.42],
      [0.62, 0.52],
      [0.55, 0.62],
      [0.5, 2.6],
      [0.6, 2.7],
      [0.78, 2.84],
      [0.92, 2.92],
      [0.92, 3.06],
      [0, 3.06],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    56,
  );
  const plinthGeo = new THREE.CylinderGeometry(0.5, 0.56, 0.7, 40);
  const cubeGeo = new RoundedBoxGeometry(1.4, 1.4, 1.4, 4, 0.1);
  const tvGeo = new RoundedBoxGeometry(3.3, 2.3, 1.1, 4, 0.16);

  const box = (w: number, h: number, d: number, mat: THREE.Material | THREE.Material[]) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const plane = (w: number, h: number, mat: THREE.Material) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  const basicTex = (c: HTMLCanvasElement, transparent = true) => new THREE.MeshBasicMaterial({ map: T.tex(c), transparent });

  // ── Lay the rooms out ──
  const placed: Placed[] = [];
  rooms.forEach((room, i) => {
    const S = sizeOf(room);
    const c = new THREE.Vector3();
    if (i > 0) {
      const p = placed[i - 1];
      c.copy(p.c).addScaledVector(dv(p.x), p.S / 2 + CL + S / 2);
    }
    const e = i === 0 ? 2 : (EXITS[i - 1] + 2) % 4;
    const x = EXITS[i];
    // Take the long way round the pillar: past the two walls that have no door.
    const [A, B] = (e + 1) % 4 === x ? [(e + 3) % 4, (e + 2) % 4] : [(e + 1) % 4, (e + 2) % 4];
    const group = new THREE.Group();
    scene.add(group);
    const theme = THEMES[room.id] ?? GOLD_ROOM;
    placed.push({ room, theme, c, S, H: heightOf(room), e, x, A, B, group, paint: [], unpaint: [], painted: false, cube: new THREE.Group(), spin: [] });
  });

  const clickables: Clickable[] = [];
  const obstacleObjs: [THREE.Object3D, number][] = []; // things you can't walk through, with their radius
  const deskOf: { table: THREE.Object3D; halfW: number; corner: boolean }[] = []; // per room, the desk its guide stands beside
  const easels: [number, THREE.Object3D][] = []; // [room, holder] of every photo easel
  const tvScreens: { m: THREE.MeshBasicMaterial; hover: number }[] = [];

  // A frame on wall k: origin at the wall's inner face, +x along the wall, +z into the room.
  const wallFrame = (P: Placed, k: number) => {
    const f = new THREE.Group();
    f.position.copy(P.c).addScaledVector(dv(k), P.S / 2);
    f.rotation.y = faceY(k);
    P.group.add(f);
    return f;
  };

  const buildWall = (P: Placed, k: number, door: boolean, i: number) => {
    const f = wallFrame(P, k);
    const { S, H } = P;
    const accent = P.theme.trim;
    if (!door) {
      const w = box(S + 0.8, H, 0.4, wallFaces(P.theme, S + 0.8, H));
      w.position.set(0, H / 2, -0.2);
      f.add(w);
      const base = box(S, 0.05, 0.05, neon(accent));
      base.position.set(0, 0.12, 0.03);
      f.add(base);
    } else {
      const sw = (S - DW) / 2;
      for (const s of [-1, 1]) {
        const w = box(sw + 0.4, H, 0.4, wallFaces(P.theme, sw, H));
        w.position.set(s * (DW / 2 + sw / 2 + 0.2), H / 2, -0.2);
        f.add(w);
        const base = box(sw, 0.05, 0.05, neon(accent));
        base.position.set(s * (DW / 2 + sw / 2), 0.12, 0.03);
        f.add(base);
        // neon door frame
        const post = box(0.1, DH, 0.1, neon(accent, 4));
        post.position.set(s * (DW / 2 + 0.06), DH / 2, 0.02);
        f.add(post);
      }
      const lintel = box(DW, H - DH, 0.4, wallFaces(P.theme, DW, H - DH));
      lintel.position.set(0, DH + (H - DH) / 2, -0.2);
      f.add(lintel);
      const top = box(DW + 0.22, 0.1, 0.1, neon(accent, 4));
      top.position.set(0, DH + 0.05, 0.02);
      f.add(top);
    }
    const crown = box(S, 0.06, 0.06, neon(accent));
    crown.position.set(0, H - 0.3, 0.03);
    f.add(crown);

    if (door && k === P.x) {
      const next = placed[i + 1]?.room;
      const sign = plane(3.2, 0.8, basicTex(next ? T.doorSign("Next room", next.name, next.accent) : T.doorSign("The end", "Step outside", T.GOLD)));
      sign.position.set(0, DH + 0.75, 0.04);
      f.add(sign);
    }
    if (door && k === P.e && i > 0) {
      // On the corridor side, so you read where you're going as you walk in.
      const sign = plane(3.2, 0.8, basicTex(T.doorSign(`Room ${String(i).padStart(2, "0")}`, P.room.name, P.room.accent)));
      sign.position.set(0, DH + 0.75, -0.42);
      sign.rotation.y = Math.PI;
      f.add(sign);
    }
    return f;
  };

  // A printed panel on a wall, painted only while the room is near.
  const panel = (P: Placed, f: THREE.Object3D, draw: () => HTMLCanvasElement | Promise<HTMLCanvasElement>, w = 9.6, h = 4.8, y = 3.3) => {
    const m = printed();
    const mesh = plane(w, h, m);
    mesh.position.set(0, y, 0.02);
    f.add(mesh);
    let t: THREE.Texture | null = null;
    P.paint.push(async () => {
      const c = await draw();
      if (!P.painted) return;
      t = T.tex(c);
      setMap(m, t);
    });
    P.unpaint.push(() => {
      setMap(m, placeholder);
      t?.dispose();
      t = null;
    });
    return mesh;
  };

  const linkButton = (i: number, f: THREE.Object3D, text: string, accent: string, url: string, x: number, y: number, w = 2.6) => {
    const m = basicTex(T.button(text, accent));
    const b = plane(w, w / 4, m);
    b.position.set(x, y, 0.05);
    f.add(b);
    clickables.push({
      meshes: [b],
      room: i,
      act: () => window.open(url, "_blank", "noopener"),
      hover: (on) => b.scale.setScalar(on ? 1.08 : 1),
    });
  };

  const glb = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const fitModel = (root: THREE.Object3D, height: number, byHeight = false) => {
    const b = new THREE.Box3().setFromObject(root);
    const size = b.getSize(new THREE.Vector3());
    const s = height / (byHeight ? size.y : Math.max(size.y, Math.max(size.x, size.z) * 0.75));
    root.scale.setScalar(s);
    root.position.set(-((b.min.x + b.max.x) / 2) * s, -b.min.y * s, -((b.min.z + b.max.z) / 2) * s);
    const holder = new THREE.Group();
    holder.add(root);
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.frustumCulled = false;
    });
    return holder;
  };

  const arcadeNames = ["arcade-machine", "claw-machine", "pinball", "dance-machine", "basketball-game", "prize-wheel", "air-hockey"];
  let loaded = 0;
  const arcade = await Promise.all(
    arcadeNames.map((n) =>
      glb.loadAsync(`/models/arcade-${n}.glb`).then(
        (g) => (ev.onLoad(10 + (++loaded / arcadeNames.length) * 50), g),
        () => null,
      ),
    ),
  );
  const decorNames = [...new Set(Object.values(DECOR).flatMap((l) => l.map((d) => d.m)))].filter((n) => n.includes("__"));
  const decor = new Map<string, GLTF>();
  await Promise.all(
    decorNames.map((n) =>
      glb.loadAsync(`/models/decor/${n}.glb`).then(
        (g) => {
          decor.set(n, g);
          ev.onLoad(60 + (decor.size / decorNames.length) * 30);
        },
        () => {},
      ),
    ),
  );

  // A thin-bezel monitor (scale 1 ≈ 24") on a stand, with keyboard and mouse; the screen shows the room's site.
  const alu = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.32, metalness: 0.85 });
  const texLoader = new THREE.TextureLoader();
  const lazyPicture = (P: Placed, m: THREE.MeshBasicMaterial, url: string) => {
    let tx: THREE.Texture | null = null;
    P.paint.push(async () => {
      tx = await texLoader.loadAsync(url).catch(() => null);
      if (!tx || !P.painted) return;
      tx.colorSpace = THREE.SRGBColorSpace;
      tx.anisotropy = 8;
      setMap(m, tx);
    });
    P.unpaint.push(() => {
      setMap(m, placeholder);
      tx?.dispose();
    });
  };
  const monitor = (P: Placed, scale: number) => {
    const g = new THREE.Group();
    const base = box(0.26, 0.012, 0.2, alu);
    base.position.set(0, 0.006, -0.12);
    const neck = box(0.05, 0.3, 0.02, alu);
    neck.position.set(0, 0.16, -0.17);
    neck.rotation.x = -0.12;
    const frame = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.55, 0.028, 2, 0.01), plastic);
    frame.position.set(0, 0.5, -0.15);
    const screenMat = printed(0.85);
    const screen = plane(0.89, 0.5, screenMat);
    screen.position.set(0, 0.505, -0.135);
    lazyPicture(P, screenMat, P.room.site?.shot ?? "/shots/codelove.png");
    g.add(base, neck, frame, screen);
    if (scale < 1.3) {
      const kb = box(0.44, 0.012, 0.14, alu);
      kb.position.set(0, 0.006, 0.12);
      const keys = box(0.42, 0.004, 0.12, plastic);
      keys.position.set(0, 0.014, 0.12);
      const ms = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.04, 4, 10), alu);
      ms.rotation.x = Math.PI / 2;
      ms.scale.y = 0.55;
      ms.position.set(0.3, 0.014, 0.13);
      g.add(kb, keys, ms);
    }
    g.scale.setScalar(scale);
    return g;
  };
  // A framed print on a wooden easel, showing one of the game covers
  const photoFrame = (P: Placed, slot: number) => {
    const g = new THREE.Group();
    const wood = darkWood;
    for (const s of [-1, 1]) {
      const leg = box(0.04, 1.7, 0.04, wood);
      leg.position.set(s * 0.32, 0.82, 0.05);
      leg.rotation.z = -s * 0.06;
      g.add(leg);
    }
    const back = box(0.04, 1.6, 0.04, wood);
    back.position.set(0, 0.78, -0.32);
    back.rotation.x = 0.35;
    const ledge = box(0.9, 0.04, 0.12, wood);
    ledge.position.set(0, 0.86, 0.1);
    const fr = box(1.12, 0.66, 0.05, plastic);
    fr.position.set(0, 1.22, 0.06);
    fr.rotation.x = -0.08;
    const picMat = printed(0.85);
    const pic = plane(1.04, 0.58, picMat);
    pic.position.set(0, 1.22, 0.088);
    pic.rotation.x = -0.08;
    // one still of the same clip on each easel, a moment later each time
    let ft: THREE.Texture | null = null;
    P.paint.push(() => {
      ft = T.tex(T.videoFrame(slot));
      setMap(picMat, ft);
    });
    P.unpaint.push(() => {
      setMap(picMat, placeholder);
      ft?.dispose();
    });
    g.add(back, ledge, fr, pic);
    return g;
  };

  // ── Build each room ──
  placed.forEach((P, i) => {
    const { c, S, H, room } = P;
    const g = P.group;
    const accent = room.accent;

    const th = P.theme;
    const floor = plane(S, S, new THREE.MeshStandardMaterial({ map: repeat(floorTexOf(th), S / 8, S / 8), roughness: ROUGH[th.floor], metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.copy(c);
    g.add(floor);
    const ceil = plane(S, S, new THREE.MeshStandardMaterial({ map: repeat(cached(`c${th.ceil}`, () => T.ceilingTexture(th.ceil)), S / 6, S / 6), roughness: 0.9 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(c.x, H, c.z);
    g.add(ceil);

    const frames: THREE.Object3D[] = [];
    for (let k = 0; k < 4; k++) {
      const door = k === P.x || (k === P.e && i > 0);
      frames[k] = buildWall(P, k, door, i);
    }

    // Pillar, coloured ring and the logo cube
    const pillar = new THREE.Mesh(pillarGeo, marble);
    pillar.position.copy(c);
    g.add(pillar);
    obstacleObjs.push([pillar, 1.25]);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.035, 8, 72), neon(accent, 4));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(c.x, 3.0, c.z);
    g.add(ring);
    for (const [r0, r1, k] of [
      [1.25, 1.33, 3],
      [3.9, 3.95, 1.4],
    ] as const) {
      const fr = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 96), neon(accent, k));
      fr.rotation.x = -Math.PI / 2;
      fr.position.set(c.x, 0.01, c.z);
      g.add(fr);
    }
    const cube = new THREE.Group();
    cube.position.set(c.x, CUBE_Y, c.z);
    const faceMat = printed(0.85);
    cube.add(new THREE.Mesh(cubeGeo, faceMat));
    g.add(cube);
    P.cube = cube;
    let faceTex: THREE.Texture | null = null;
    P.paint.push(async () => {
      const img = room.logo === "G" ? null : await T.loadImage(room.logo).catch(() => null);
      if (!P.painted) return;
      faceTex = T.tex(T.logoFace(img, accent));
      setMap(faceMat, faceTex);
    });
    P.unpaint.push(() => {
      setMap(faceMat, placeholder);
      faceTex?.dispose();
    });
    if (room.site) {
      const url = room.site.url;
      clickables.push({ meshes: [cube], room: i, act: () => window.open(url, "_blank", "noopener") });
    }

    // ── What the walls say ──
    const fa = frames[P.A];
    const fb = frames[P.B];
    if (room.kind === "lobby") {
      panel(P, fa, () => T.aboutPanel());
      panel(P, fb, () => T.heroPanel(stats));
    } else if (room.kind === "site" && room.site) {
      const s = room.site;
      panel(P, fa, () => T.storyPanel(s, i));
      panel(P, fb, async () => T.showcasePanel(s, await T.loadImage(s.shot).catch(() => null)));
      linkButton(i, fb, "VISIT SITE ↗", accent, s.url, 3.1, 1.5);
    } else if (room.kind === "workshop") {
      panel(P, fa, () => T.skillsPanel(skills));
      panel(P, fb, () => T.stepsPanel(steps));
    } else if (room.kind === "exit") {
      panel(P, fa, async () => T.networkPanel(sites, await Promise.all(sites.map((s) => T.loadImage(s.logo).catch(() => null)))));
      panel(P, fb, () => T.contactPanel(contact));
      linkButton(i, fb, "WHATSAPP ↗", "#25d366", contact.whatsappUrl, 3.0, 1.5, 3.0);
      linkButton(i, fb, "EMAIL ↗", T.GOLD, `mailto:${contact.emails[0].email}`, 3.0, 2.5, 2.2);
    } else if (room.kind === "games") {
      buildGameWall(P, i, fa, games.slice(0, 7));
      buildGameWall(P, i, fb, games.slice(7, 14));
      const title = plane(7.5, 0.94, basicTex(T.gameWallTitle(accent)));
      title.position.set(0, 7.45, 0.05);
      fa.add(title);
      linkButton(i, fb, "OPEN GAMES.CODELOVE.IN ↗", accent, "https://games.codelove.in", 0, 7.6, 4.8);
      // arcade machines beside both doors
      const spots: [THREE.Object3D, number][] = [];
      for (const k of [P.e, P.x]) for (const xx of [-(DW / 2 + 1.7), DW / 2 + 1.7, -(DW / 2 + 5), DW / 2 + 5]) spots.push([frames[k], xx]);
      arcade.forEach((a, n) => {
        if (!a || !spots[n]) return;
        const m = fitModel(a.scene, n === 6 ? 1.3 : 2.2);
        m.position.set(spots[n][1], 0, 1.2);
        spots[n][0].add(m);
        obstacleObjs.push([m, 0.85]);
      });
    }

    // ── Furniture ──
    const half = S / 2;
    const decorList = DECOR[room.id] ?? [];
    // every guide works at a desk: rooms without one get one in the guide's corner
    for (const d of decorList.some((x) => x.m === "monitor") ? decorList : [...decorList, ...desk(10)]) {
      let item: THREE.Object3D;
      const k = d.plinth ? 1 : PROP;
      if (d.m === "monitor") item = monitor(P, d.h * k);
      else if (d.m === "frame") {
        item = photoFrame(P, d.slot);
        item.scale.setScalar(k);
      } else {
        const src = decor.get(d.m);
        if (!src) continue;
        item = fitModel(src.scene.clone(true), d.h * k, d.m.startsWith("avatar-show"));
      }
      const holder = new THREE.Group();
      if (d.m === "avatar-show__table" && !deskOf[i]) {
        item.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(item);
        deskOf[i] = { table: holder, halfW: (b.max.x - b.min.x) / 2, corner: d.slot >= 8 };
      }
      if (d.m === "frame") easels.push([i, holder]);
      if (d.plinth) {
        const pl = new THREE.Mesh(plinthGeo, marble);
        pl.position.y = 0.35;
        holder.add(pl);
        item.position.y = 0.7;
      }
      item.position.y += (d.y ?? 0) * k;
      holder.add(item);
      if (d.spin) P.spin.push(item);
      if (!d.y) obstacleObjs.push([holder, d.plinth ? 0.75 : d.m.includes("table") || d.m.includes("long-chair") ? 0.9 : 0.55]);
      if (d.slot < 8) {
        const xs = [-(half - 2.9), -(DW / 2 + 1.3), DW / 2 + 1.3, half - 2.9]; // clear of the corner slots
        holder.position.set(xs[d.slot % 4], 0, 1.1 + (d.dz ?? 0) * k);
        if (d.dz) holder.rotation.y = Math.PI; // a chair, facing its desk
        frames[d.slot < 4 ? P.e : P.x].add(holder);
      } else {
        const [k1, k2] = [
          [P.A, P.B],
          [P.B, P.x],
          [P.x, P.e],
          [P.e, P.A],
        ][d.slot - 8];
        holder.position.copy(c).addScaledVector(dv(k1), half - 1.2).addScaledVector(dv(k2), half - 1.2);
        holder.lookAt(c.x, 0, c.z);
        if (d.dz) {
          holder.translateZ(d.dz * k);
          holder.rotateY(Math.PI);
        }
        g.add(holder);
      }
    }

    // ── Corridor to the next room ──
    if (i < placed.length - 1) {
      const cf = new THREE.Group();
      cf.position.copy(c).addScaledVector(dv(P.x), S / 2 + CL / 2);
      cf.rotation.y = faceY((P.x + 2) % 4); // local +z points down the corridor
      g.add(cf);
      const CW = DW;
      const CH = DH;
      const CI = CL - 0.8; // between the two rooms' wall thickness
      const cfloor = plane(CW, CL, new THREE.MeshStandardMaterial({ map: repeat(floorTexOf(placed[i + 1].theme), CW / 8, CL / 8), roughness: ROUGH[placed[i + 1].theme.floor], metalness: 0.05 }));
      cfloor.rotation.x = -Math.PI / 2;
      cf.add(cfloor);
      const cceil = plane(CW, CI, new THREE.MeshStandardMaterial({ color: placed[i + 1].theme.ceil, roughness: 0.9 }));
      cceil.rotation.x = Math.PI / 2;
      cceil.position.y = CH;
      cf.add(cceil);
      for (const s of [-1, 1]) {
        const w = box(0.4, CH, CI, wallFaces(placed[i + 1].theme, CI, CH, true));
        w.position.set(s * (CW / 2 + 0.2), CH / 2, 0);
        cf.add(w);
        const strip = box(0.05, 0.05, CL, neon(placed[i + 1].theme.trim));
        strip.position.set(s * (CW / 2 - 0.05), 0.08, 0);
        cf.add(strip);
      }
      const nextAccent = placed[i + 1].theme.trim;
      for (const z of [-2, 0, 2]) {
        for (const s of [-1, 1]) {
          const post = box(0.08, CH - 0.1, 0.08, neon(nextAccent, 3));
          post.position.set(s * (CW / 2 - 0.06), (CH - 0.1) / 2, z);
          cf.add(post);
        }
        const top = box(CW - 0.1, 0.08, 0.08, neon(nextAccent, 3));
        top.position.set(0, CH - 0.12, z);
        cf.add(top);
      }
    }
  });

  // Retro TVs on a wall of the game center, one per game
  function buildGameWall(P: Placed, i: number, f: THREE.Object3D, list: typeof games) {
    const slots: [number, number][] = [
      [-5.4, 5.3],
      [-1.8, 5.3],
      [1.8, 5.3],
      [5.4, 5.3],
      [-3.6, 2.2],
      [0, 2.2],
      [3.6, 2.2],
    ];
    const loader = new THREE.TextureLoader();
    list.forEach((gm, n) => {
      const [x, y] = slots[n];
      const tv = new THREE.Group();
      tv.position.set(x, y, 0.6);
      const body = new THREE.Mesh(tvGeo, plastic);
      tv.add(body);
      const screenMat = printed(0.8);
      const screen = plane(2.5, 1.31, screenMat);
      screen.position.set(-0.3, 0.05, 0.56);
      tv.add(screen);
      const scan = plane(2.5, 1.31, new THREE.MeshBasicMaterial({ map: scanTex, transparent: true, depthWrite: false }));
      scan.position.set(-0.3, 0.05, 0.565);
      tv.add(scan);
      for (const ky of [0.45, -0.05]) {
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 20), gold);
        knob.rotation.x = Math.PI / 2;
        knob.position.set(1.28, ky, 0.57);
        tv.add(knob);
      }
      for (let s = 0; s < 4; s++) {
        const slot = box(0.42, 0.04, 0.02, darkWood);
        slot.position.set(1.28, -0.45 - s * 0.12, 0.56);
        tv.add(slot);
      }
      const led = box(0.1, 0.1, 0.03, neon(gm.accent, 4));
      led.position.set(1.28, 0.85, 0.56);
      tv.add(led);
      const lab = plane(2.6, 0.51, basicTex(T.gameLabel(gm)));
      lab.position.set(0, -1.48, 0.1);
      tv.add(lab);
      f.add(tv);

      let t: THREE.Texture | null = null;
      P.paint.push(async () => {
        t = await loader.loadAsync(`/games/${gm.slug}.webp`).catch(() => null);
        if (!t || !P.painted) return;
        t.colorSpace = THREE.SRGBColorSpace;
        setMap(screenMat, t);
      });
      P.unpaint.push(() => {
        setMap(screenMat, placeholder);
        t?.dispose();
      });
      const entry = { m: screenMat, hover: 0 };
      tvScreens.push(entry);
      clickables.push({
        meshes: [body, screen, lab],
        room: i,
        act: () => ev.onPlay(gm.slug),
        hover: (on) => {
          entry.hover = on ? 1 : 0;
          tv.scale.setScalar(on ? 1.05 : 1);
        },
      });
    });
  }

  // ── The way out: double doors onto a night terrace ──
  const last = placed[placed.length - 1];
  const exitFrame = wallFrame(last, last.x);
  const leaves = [-1, 1].map((s) => {
    const hinge = new THREE.Group();
    hinge.position.set(s * (DW / 2), 0, 0);
    const leaf = box(DW / 2, DH, 0.12, darkWood);
    leaf.position.set(-s * (DW / 4), DH / 2, 0);
    hinge.add(leaf);
    for (const yy of [1.2, 3.4]) {
      const trim = box(DW / 2 - 0.4, 0.05, 0.14, gold);
      trim.position.set(-s * (DW / 4), yy, 0);
      hinge.add(trim);
    }
    const handle = box(0.06, 0.5, 0.2, gold);
    handle.position.set(-s * (DW / 2 - 0.25), 1.2, 0.05);
    hinge.add(handle);
    exitFrame.add(hinge);
    return { hinge, s };
  });
  const outside = new THREE.Group();
  outside.position.copy(last.c).addScaledVector(dv(last.x), last.S / 2);
  outside.rotation.y = faceY((last.x + 2) % 4); // +z points away from the museum
  scene.add(outside);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(180, 48, 24),
    new THREE.MeshBasicMaterial({ map: T.tex(T.nightSky()), side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  sky.position.set(0, -20, 30);
  outside.add(sky);
  const terrace = plane(90, 90, new THREE.MeshStandardMaterial({ map: repeat(floorTexOf(GOLD_ROOM), 12, 12), roughness: 0.2, metalness: 0.1 }));
  terrace.rotation.x = -Math.PI / 2;
  terrace.position.set(0, -0.01, 45.1);
  outside.add(terrace);
  for (let z = 2; z < 32; z += 2.2)
    for (const s of [-1, 1]) {
      const lamp = box(0.25, 0.06, 0.6, neon(T.GOLD, 3));
      lamp.position.set(s * 2.6, 0.03, z);
      outside.add(lamp);
    }
  const endSign = plane(20, 7.5, new THREE.MeshBasicMaterial({ map: T.tex(T.endSign()), transparent: true, fog: false, toneMapped: false, depthWrite: false }));
  endSign.position.set(0, 7.5, 36);
  endSign.rotation.y = Math.PI;
  outside.add(endSign);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.tex(T.glowSprite("#fff4dc")), fog: false, depthWrite: false, toneMapped: false }));
  moon.scale.set(26, 26, 1);
  moon.position.set(-38, 34, 120);
  outside.add(moon);
  outside.visible = false;

  // ── Out on the terrace: every product's cube lying on the floor to kick about (manual mode).
  // Their logos load the first time you come near the exit. ──
  outside.updateMatrixWorld(true);
  const groundCubes = sites.map((s, n) => {
    const mat = printed(0.92);
    const m = new THREE.Mesh(cubeGeo, mat);
    // scattered in a loose arc a few steps past the doors
    const a = (n / (sites.length - 1) - 0.5) * 2.2;
    m.position.copy(outside.localToWorld(new THREE.Vector3(Math.sin(a) * 7, 0, 9 + Math.cos(a) * 4)));
    m.rotation.y = n * 0.7;
    scene.add(m);
    return { m, mat, s };
  });
  let outsideLoaded = false;
  const loadOutside = () => {
    if (outsideLoaded) return;
    outsideLoaded = true;
    groundCubes.forEach((c) =>
      T.loadImage(c.s.logo).then(
        (img) => setMap(c.mat, T.tex(T.logoFace(img, c.s.accent))),
        () => {},
      ),
    );
  };
  // the sign turns to face you wherever you walk, even once you're past it
  const signCam = new THREE.Vector3();
  const animateOutside = () => {
    outside.worldToLocal(signCam.copy(camera.position));
    endSign.rotation.y = Math.atan2(signCam.x - endSign.position.x, signCam.z - endSign.position.z);
  };

  // ── Camera path: waypoints with their look targets ──
  type WP = { p: THREE.Vector3; l: THREE.Vector3; dwell: number; room: number };
  const wps: WP[] = [];
  placed.forEach((P, i) => {
    const { c, S, e, x, A, B, room } = P;
    const h = S / 2;
    const pt = (...parts: [number, number][]) => {
      const v = new THREE.Vector3(c.x, EYE, c.z);
      for (const [k, d] of parts) v.addScaledVector(dv(k), d);
      return v;
    };
    const look = (k: number, y: number, along = 0) => {
      const v = new THREE.Vector3(c.x, y, c.z).addScaledVector(dv(k), h);
      return v.addScaledVector(new THREE.Vector3(Math.cos(faceY(k)), 0, -Math.sin(faceY(k))), along);
    };
    const cube = new THREE.Vector3(c.x, CUBE_Y - 0.6, c.z);
    const add = (p: THREE.Vector3, l: THREE.Vector3, dwell = 0, r = i) => wps.push({ p, l, dwell, room: r });
    // how far from a wall you stand to read it: far enough to take in the whole wall
    // A phone held upright can't take in a whole 9.6 m panel from any spot in the room, so there the
    // walk stops twice per wall, a step further back: the left half, then the right half.
    const portrait = window.innerWidth / window.innerHeight < 0.8;
    const R = room.kind === "games" ? 10.4 : (S === 18 ? 6.8 : 6.2) + (portrait ? 0.9 : 0);
    const k = S * 0.27;
    const stops = portrait && room.kind !== "games" ? [-2.5, 2.5] : [0];
    const ly = room.kind === "games" ? 4.4 : 3.3;
    // The view turns gradually: room → wall A → the corner between A and B → wall B → exit door.
    // Neighbouring look targets are never more than ~90° apart, so the camera never whips round.
    const corner = (k1: number, k2: number, y: number) => look(k1, y).add(look(k2, y)).sub(new THREE.Vector3(c.x, y, c.z));
    const along = (k1: number) => new THREE.Vector3(Math.cos(faceY(k1)), 0, -Math.sin(faceY(k1)));

    if (i === 0) add(pt([e, h - 2.6]), look(B, 3.6), 1);
    else add(pt([e, h - 0.9]), cube);
    add(pt([e, k], [A, k]), corner(A, B, 3.4).lerp(look(A, ly), 0.6));
    for (const o of stops) add(pt([A, h - R]).addScaledVector(along(A), o), look(A, ly, o), 1);
    add(pt([A, k], [B, k]), corner(A, B, ly), 0.3);
    for (const o of stops) add(pt([B, h - R]).addScaledVector(along(B), o), look(B, ly, o), 1);
    add(pt([B, k], [x, k]), look(x, 2.4).lerp(look(B, 3), 0.25));
    if (i < placed.length - 1) {
      add(pt([x, h - 0.9]), look(x, 2.2, 0).addScaledVector(dv(x), CL + 4));
      add(pt([x, h + CL / 2]), look(x, 2.0).addScaledVector(dv(x), CL + 6), 0, i + 1);
    } else {
      add(pt([x, h - 2.5]), look(x, 2.4));
      add(pt([x, h + 3]), look(x, 6).addScaledVector(dv(x), 36));
      add(pt([x, h + 13]), look(x, 6.8).addScaledVector(dv(x), 36), 1);
    }
  });
  const posCurve = new THREE.CatmullRomCurve3(wps.map((w) => w.p), false, "centripetal");
  const lookCurve = new THREE.CatmullRomCurve3(wps.map((w) => w.l), false, "centripetal");
  const N = wps.length;
  // Scroll is spent by distance, plus extra on the reading stops so they hold still a moment.
  const weights: number[] = [];
  for (let k = 0; k < N - 1; k++) weights.push(wps[k].p.distanceTo(wps[k + 1].p) * (1 + 0.6 * (wps[k].dwell + wps[k + 1].dwell)));
  const cum = [0];
  for (const w of weights) cum.push(cum[cum.length - 1] + w);
  const total = cum[N - 1];
  const progressToT = (p: number) => {
    const target = Math.min(1, Math.max(0, p)) * total;
    let k = 0;
    while (k < N - 2 && cum[k + 1] < target) k++;
    const f = Math.min(1, Math.max(0, (target - cum[k]) / Math.max(1e-6, weights[k])));
    // gentle slow-down at reading stops, never a dead stop
    const s0 = 1 - 0.45 * wps[k].dwell;
    const s1 = 1 - 0.45 * wps[k + 1].dwell;
    const f2 = f * f;
    const f3 = f2 * f;
    const h = (f3 - 2 * f2 + f) * s0 + (-2 * f3 + 3 * f2) + (f3 - f2) * s1;
    return (k + h) / (N - 1);
  };
  const roomInfo: RoomInfo[] = placed.map((P, i) => ({
    name: P.room.name,
    accent: P.room.accent,
    start: cum[wps.findIndex((w) => w.room === i)] / total,
    x: P.c.x,
    z: P.c.z,
  }));

  // ── Painting rooms near the camera ──
  const paintRoom = async (P: Placed) => {
    if (P.painted) return;
    P.painted = true;
    await Promise.all(P.paint.map((f) => f()));
  };
  const unpaintRoom = (P: Placed) => {
    if (!P.painted) return;
    P.painted = false;
    P.unpaint.forEach((f) => f());
  };
  await Promise.all([0, 1, 2].map((i) => paintRoom(placed[i])));
  ev.onLoad(100);

  // ── Where you can walk (manual mode): room floors, corridors and the terrace ──
  type Rect = { x0: number; x1: number; z0: number; z1: number };
  const rects: Rect[] = [];
  const rect = (a: THREE.Vector3, b: THREE.Vector3, pad: number) => ({
    x0: Math.min(a.x, b.x) - pad,
    x1: Math.max(a.x, b.x) + pad,
    z0: Math.min(a.z, b.z) - pad,
    z1: Math.max(a.z, b.z) + pad,
  });
  const roomRects: Rect[] = [];
  placed.forEach((P, i) => {
    const m = P.room.kind === "games" ? 1.5 : 0.55; // TVs stick out of the game-center walls
    const h = P.S / 2 - m;
    const r = { x0: P.c.x - h, x1: P.c.x + h, z0: P.c.z - h, z1: P.c.z + h };
    rects.push(r);
    roomRects.push({ x0: P.c.x - P.S / 2, x1: P.c.x + P.S / 2, z0: P.c.z - P.S / 2, z1: P.c.z + P.S / 2 });
    const d = dv(P.x);
    const a = P.c.clone().addScaledVector(d, P.S / 2 - m - 0.1);
    const mNext = placed[i + 1]?.room.kind === "games" ? 1.5 : 0.55;
    const len = i < placed.length - 1 ? CL + m + mNext + 0.2 : 1.6;
    const b = a.clone().addScaledVector(d, len);
    // a door-wide strip: padded only across the corridor, not along it
    const half = DW / 2 - 0.35;
    rects.push(d.x ? { ...rect(a, b, 0), z0: a.z - half, z1: a.z + half } : { ...rect(a, b, 0), x0: a.x - half, x1: a.x + half });
  });
  {
    // the terrace beyond the exit doors: all of it, edge to edge, so you can ride anywhere on it
    const d = dv(last.x);
    const a = last.c.clone().addScaledVector(d, last.S / 2 + 0.6);
    const b = a.clone().addScaledVector(d, 87.5);
    const half = 43.5;
    rects.push(d.x ? { ...rect(a, b, 0), z0: a.z - half, z1: a.z + half } : { ...rect(a, b, 0), x0: a.x - half, x1: a.x + half });
  }
  const inRect = (r: Rect, x: number, z: number) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
  const walkable = (x: number, z: number) => rects.some((r) => inRect(r, x, z));
  outside.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);
  // keep the guide's desk clear: drop any easel standing right beside it
  for (const [i, e] of easels) {
    const d = deskOf[i];
    if (!d || e.getWorldPosition(new THREE.Vector3()).distanceTo(d.table.getWorldPosition(new THREE.Vector3())) > 3.2) continue;
    e.removeFromParent();
    obstacleObjs.splice(obstacleObjs.findIndex(([o]) => o === e), 1);
  }
  const obstacles = obstacleObjs.map(([o, r]) => {
    const p = o.getWorldPosition(new THREE.Vector3());
    return { x: p.x, z: p.z, r };
  });

  // ── The guides: a real person (Microsoft Rocketbox avatar) standing in a corner of each room.
  // They only explain the room when you go up and talk to them. ──
  // Walk clips carry root motion; pin the drifting axes so people stay on the spot.
  const inPlace = (clip: THREE.AnimationClip) => {
    for (const tr of clip.tracks) {
      if (!tr.name.endsWith(".position")) continue;
      const v = tr.values;
      for (const a of [0, 2]) for (let k = a; k < v.length; k += 3) v[k] = v[a];
    }
    return clip;
  };
  const clipCache = new Map<string, Promise<THREE.AnimationClip | null>>();
  const clipOf = (name: string) => {
    if (!clipCache.has(name))
      clipCache.set(
        name,
        glb.loadAsync(`/models/anim/${name}.glb`).then(
          (g) => (g.animations[0] ? inPlace(g.animations[0]) : null),
          () => null,
        ),
      );
    return clipCache.get(name)!;
  };
  type Guide = { root: THREE.Object3D; mixer: THREE.AnimationMixer; idle?: THREE.AnimationAction; talk?: THREE.AnimationAction; wave?: THREE.AnimationAction; cur?: THREE.AnimationAction; talking: boolean; home: number };
  const guidesBy: (Guide | null)[] = placed.map(() => null);
  const guideRequested = placed.map(() => false);
  // beside the room's desk, on the side nearer the middle of the room, level with the keyboard
  const guideAt = placed.map((P, i) => {
    const d = deskOf[i];
    if (!d) {
      const h = P.S / 2 - 1.7;
      return P.c.clone().addScaledVector(dv(P.x), h).addScaledVector(dv(P.e), h).setY(0);
    }
    const p = d.table.getWorldPosition(new THREE.Vector3());
    const right = new THREE.Vector3(1, 0, 0).transformDirection(d.table.matrixWorld);
    const fwd = new THREE.Vector3(0, 0, 1).transformDirection(d.table.matrixWorld);
    const a = p.clone().addScaledVector(right, d.halfW + 0.45);
    const b = p.clone().addScaledVector(right, -(d.halfW + 0.45));
    // a corner desk sits diagonally, so step further out to keep clear of the wall
    return (a.distanceTo(P.c) <= b.distanceTo(P.c) ? a : b).addScaledVector(fwd, d.corner ? 0.7 : 0.25).setY(0);
  });
  const guidePos = (P: Placed) => guideAt[placed.indexOf(P)].clone();
  guideAt.forEach((gp) => obstacles.push({ x: gp.x, z: gp.z, r: 0.45 }));
  const loadGuide = (i: number) => {
    if (guideRequested[i]) return;
    guideRequested[i] = true;
    const P = placed[i];
    const g = femaleGuides.has(P.room.id) ? "f" : "m";
    Promise.all([glb.loadAsync(`/models/people/${P.room.id}.glb`), clipOf(`${g}_idle`), clipOf(`${g}_talk`), clipOf(`${g}_wave`)]).then(
      ([gl, idle, talk, wave]) => {
        const holder = fitModel(gl.scene, GUIDE_H, true);
        holder.position.copy(guidePos(P));
        const home = Math.atan2(P.c.x - holder.position.x, P.c.z - holder.position.z);
        holder.rotation.y = home;
        P.group.add(holder);
        const mixer = new THREE.AnimationMixer(gl.scene);
        const a = (c: THREE.AnimationClip | null) => (c ? mixer.clipAction(c) : undefined);
        const guide: Guide = { root: holder, mixer, idle: a(idle), talk: a(talk), wave: a(wave), talking: false, home };
        guide.idle?.play();
        guide.cur = guide.idle;
        guidesBy[i] = guide;
        clickables.push({ meshes: [holder], room: i, act: () => ev.onTalk(i) });
      },
      () => {},
    );
  };
  const swap = (g: Guide, to: THREE.AnimationAction | undefined, once = false) => {
    if (!to || to === g.cur) return;
    to.reset();
    to.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    to.clampWhenFinished = once;
    to.play();
    g.cur?.crossFadeTo(to, 0.45, false);
    g.cur = to;
  };

  // ── First-person arms (manual mode): a real Rocketbox body hung under the camera with
  // its head hidden, and the arms posed by two-bone IK so the hands sit where we want them. ──
  type Arm = { s: number; up: THREE.Object3D; fore: THREE.Object3D; hand: THREE.Object3D; upRest: THREE.Quaternion; foreRest: THREE.Quaternion; a: number; b: number };
  const body = new THREE.Group();
  body.visible = false;
  camera.add(body);
  let arms: Arm[] = [];
  glb.loadAsync("/models/hands.glb").then(
    (gl) => {
      const root = gl.scene;
      const bb = new THREE.Box3().setFromObject(root);
      root.scale.setScalar(1.75 / (bb.max.y - bb.min.y));
      root.rotation.y = Math.PI; // face -z, like the camera
      root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.frustumCulled = false;
      });
      body.add(root);
      const bone = (n: string) => root.getObjectByName(n.replace(/ /g, "_")) ?? root.getObjectByName(n);
      bone("Bip01 Head")?.scale.setScalar(0.001);
      // relax the T-pose's straight fingers into a loose curl (the IK never touches them)
      for (const side of ["L", "R"])
        for (let f = 1; f <= 4; f++)
          ["", "1", "2"].forEach((j, k) => bone(`Bip01 ${side} Finger${f}${j}`)?.rotateZ([0.25 + f * 0.06, 0.45 + f * 0.05, 0.35][k]));
      body.updateMatrixWorld(true);
      // put the eyes where the camera is
      const head = bone("Bip01 Head");
      if (head) {
        const eye = body.worldToLocal(head.getWorldPosition(new THREE.Vector3()));
        root.position.sub(eye).add(new THREE.Vector3(0, -0.06, 0.14));
      }
      body.updateMatrixWorld(true);
      arms = (["L", "R"] as const)
        .map((side) => {
          const up = bone(`Bip01 ${side} UpperArm`);
          const fore = bone(`Bip01 ${side} Forearm`);
          const hand = bone(`Bip01 ${side} Hand`);
          if (!up || !fore || !hand) return null;
          const w = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
          return {
            s: side === "L" ? -1 : 1,
            up,
            fore,
            hand,
            upRest: up.quaternion.clone(),
            foreRest: fore.quaternion.clone(),
            a: w(up).distanceTo(w(fore)),
            b: w(fore).distanceTo(w(hand)),
          };
        })
        .filter((x): x is Arm => !!x);
    },
    () => {},
  );
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  // turn bone so its child points at target (all in world space)
  const aim = (b: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3) => {
    const p = b.getWorldPosition(new THREE.Vector3());
    va.copy(child.getWorldPosition(new THREE.Vector3())).sub(p).normalize();
    vb.copy(target).sub(p).normalize();
    qa.setFromUnitVectors(va, vb).multiply(b.getWorldQuaternion(qb));
    b.parent!.getWorldQuaternion(qb).invert();
    b.quaternion.copy(qb.multiply(qa));
    b.updateMatrixWorld(true);
  };
  const handTarget = new THREE.Vector3();
  const reach = (arm: Arm, local: THREE.Vector3) => {
    arm.up.quaternion.copy(arm.upRest);
    arm.fore.quaternion.copy(arm.foreRest);
    arm.up.updateMatrixWorld(true);
    const S = arm.up.getWorldPosition(new THREE.Vector3());
    const T = camera.localToWorld(handTarget.copy(local));
    const dir = T.clone().sub(S);
    const d = THREE.MathUtils.clamp(dir.length(), 0.05, arm.a + arm.b - 0.002);
    dir.normalize();
    // elbows bend down and out
    const pole = camera.localToWorld(new THREE.Vector3(arm.s * 0.7, -1, 0.3)).sub(camera.getWorldPosition(new THREE.Vector3())).normalize();
    pole.addScaledVector(dir, -pole.dot(dir)).normalize();
    const cosA = THREE.MathUtils.clamp((arm.a * arm.a + d * d - arm.b * arm.b) / (2 * arm.a * d), -1, 1);
    const elbow = S.clone().addScaledVector(dir, arm.a * cosA).addScaledVector(pole, arm.a * Math.sqrt(1 - cosA * cosA));
    aim(arm.up, arm.fore, elbow);
    aim(arm.fore, arm.hand, S.clone().addScaledVector(dir, d));
    // roll the forearm so the palms face down, as when you walk
    const along = arm.hand.getWorldPosition(new THREE.Vector3()).sub(arm.fore.getWorldPosition(new THREE.Vector3())).normalize();
    qa.setFromAxisAngle(along, arm.s * PALM_ROLL).multiply(arm.fore.getWorldQuaternion(qb));
    arm.fore.parent!.getWorldQuaternion(qb).invert();
    arm.fore.quaternion.copy(qb.multiply(qa));
    arm.fore.updateMatrixWorld(true);
  };
  const setHandsVisible = (v: boolean) => (body.visible = v);

  // ── The cubes can be picked up and thrown (manual mode) ──
  // ground: one of the terrace cubes, which rest on the floor instead of floating on a pillar
  type CubeState = { P: Placed; obj: THREE.Object3D; home: THREE.Vector3; state: "home" | "held" | "free" | "return"; vel: THREE.Vector3; spin: THREE.Vector3; t: number; from: THREE.Vector3; ground?: boolean };
  const HELD_SCALE = 0.3;
  const GROUND_SCALE = 0.5;
  const cubes: CubeState[] = placed.map((P) => ({
    P,
    obj: P.cube,
    home: P.cube.position.clone(),
    state: "home",
    vel: new THREE.Vector3(),
    spin: new THREE.Vector3(),
    t: 0,
    from: new THREE.Vector3(),
  }));
  for (const gc of groundCubes) {
    gc.m.scale.setScalar(GROUND_SCALE);
    gc.m.position.y = 0.7 * GROUND_SCALE;
    cubes.push({ P: last, obj: gc.m, home: gc.m.position.clone(), state: "home", vel: new THREE.Vector3(), spin: new THREE.Vector3(), t: 0, from: new THREE.Vector3(), ground: true });
  }
  const sizeOfCube = (cs: CubeState) => (cs.ground ? GROUND_SCALE : HELD_SCALE);
  let held: CubeState | null = null;
  let throwKick = 0;
  const grab = (cs: CubeState) => {
    cs.state = "held";
    scene.attach(cs.obj); // so it isn't hidden with its room when you carry it away
    held = cs;
    sfx.grab();
  };
  const throwHeld = () => {
    if (!held) return;
    const cs = held;
    held = null;
    camera.getWorldDirection(fwd);
    cs.vel.copy(fwd).multiplyScalar(9).add(new THREE.Vector3(0, 2.6, 0)).add(moveVel);
    cs.spin.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
    cs.state = "free";
    throwKick = 1;
    sfx.throw();
  };
  const sendHome = (cs: CubeState) => {
    if (cs.state === "home") return;
    if (held === cs) held = null;
    cs.state = "return";
    cs.t = 0;
    cs.from.copy(cs.obj.position);
  };
  const updateCube = (cs: CubeState, dt: number) => {
    const o = cs.obj;
    if (cs.state === "held") {
      o.position.copy(camera.localToWorld(tmp.set(0, -0.22 - throwKick * 0.05, -0.78)));
      o.quaternion.copy(camera.quaternion);
      o.scale.setScalar(HELD_SCALE);
      return;
    }
    if (cs.state === "return") {
      cs.t = Math.min(1, cs.t + dt * 1.2);
      const k = smooth(0, 1, cs.t);
      o.position.lerpVectors(cs.from, cs.home, k);
      o.position.y += Math.sin(k * Math.PI) * 2;
      o.scale.setScalar(THREE.MathUtils.lerp(HELD_SCALE, cs.ground ? GROUND_SCALE : 1, k));
      if (cs.t >= 1) {
        cs.state = "home";
        if (!cs.ground) cs.P.group.attach(o);
        else o.rotation.set(0, o.rotation.y, 0); // sitting flat on the floor
      }
      return;
    }
    if (cs.state !== "free") return;
    o.scale.setScalar(sizeOfCube(cs));
    const half = 0.7 * sizeOfCube(cs);
    const v = cs.vel;
    const p = o.position;
    v.y -= 18 * dt;
    const nx = p.x + v.x * dt;
    const nz = p.z + v.z * dt;
    if (walkable(nx, p.z)) p.x = nx;
    else {
      if (Math.abs(v.x) > 2) sfx.bounce(Math.min(1, Math.abs(v.x) / 12));
      v.x *= -0.5;
    }
    if (walkable(p.x, nz)) p.z = nz;
    else {
      if (Math.abs(v.z) > 2) sfx.bounce(Math.min(1, Math.abs(v.z) / 12));
      v.z *= -0.5;
    }
    p.y += v.y * dt;
    // (the terrace is open to the sky)
    if (!cs.ground && p.y > cs.P.H - half - 0.1) {
      p.y = cs.P.H - half - 0.1;
      v.y = -Math.abs(v.y) * 0.4;
    }
    for (const ob of obstacles) {
      if (ob.r < 1 || p.y > 3.2) continue; // bounce off the pillars
      const dx = p.x - ob.x;
      const dz = p.z - ob.z;
      const d = Math.hypot(dx, dz);
      const min = 0.95 + half;
      if (d < min && d > 1e-4) {
        p.x = ob.x + (dx / d) * min;
        p.z = ob.z + (dz / d) * min;
        const dot = (v.x * dx + v.z * dz) / d;
        if (dot < 0) {
          v.x -= 1.5 * dot * (dx / d);
          v.z -= 1.5 * dot * (dz / d);
        }
      }
    }
    if (p.y < half) {
      p.y = half;
      if (v.y < -2) sfx.bounce(Math.min(1, -v.y / 12));
      if (v.y < 0) v.y = Math.abs(v.y) < 1.2 ? 0 : -v.y * 0.42;
      v.x *= 0.82;
      v.z *= 0.82;
      cs.spin.multiplyScalar(0.7);
    }
    if (p.y <= half + 0.001) {
      v.x *= 1 - Math.min(1, dt * 3);
      v.z *= 1 - Math.min(1, dt * 3);
      // settle flat on a face
      const e = o.rotation;
      const snap = (a: number) => Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
      e.x += (snap(e.x) - e.x) * Math.min(1, dt * 6);
      e.z += (snap(e.z) - e.z) * Math.min(1, dt * 6);
    }
    o.rotation.x += cs.spin.x * dt;
    o.rotation.y += cs.spin.y * dt;
    o.rotation.z += cs.spin.z * dt;
  };

  // ── Input ──
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2(0, 0);
  const ptrSmooth = new THREE.Vector2();
  const tmp = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const moveVel = new THREE.Vector3();
  let mouse = false;
  let hovered: Clickable | null = null;
  let cur = 0;
  let mode: "auto" | "manual" = "auto";
  const hit = (nx: number, ny: number, objs: THREE.Object3D[]) => {
    ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
    return ray.intersectObjects(objs, true)[0];
  };
  const isUnder = (o: THREE.Object3D | null, m: THREE.Object3D) => {
    for (; o; o = o.parent) if (o === m) return true;
    return false;
  };
  const pick = (nx: number, ny: number) => {
    const list = clickables.filter((c) => c.room === cur);
    const h = hit(
      nx,
      ny,
      list.flatMap((c) => c.meshes),
    );
    if (!h || h.distance > 16) return null;
    return list.find((c) => c.meshes.some((m) => isUnder(h.object, m))) ?? null;
  };
  // Manual mode: throw what you hold, else pick up a cube you point at, else press what you point at.
  // (The cubes only open their website in Auto.)
  const cubeMeshes = new Set(cubes.map((c) => c.obj));
  const interact = (nx: number, ny: number) => {
    if (held) return throwHeld();
    const free = cubes.filter((cs) => cs.state !== "held" && cs.state !== "return");
    const h = hit(
      nx,
      ny,
      free.map((cs) => cs.obj),
    );
    if (h) {
      if (h.distance < 7) {
        const cs = free.find((c) => isUnder(h.object, c.obj));
        if (cs) grab(cs);
      }
      return;
    }
    const c = pick(nx, ny);
    if (c && !c.meshes.some((m) => cubeMeshes.has(m))) c.act();
  };
  // Kick the nearest cube in front of you (off its pillar, too) and send it flying.
  let kickDip = 0;
  const kick = () => {
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    let best: CubeState | null = null;
    let bestD = 3.2;
    for (const cs of cubes) {
      if (cs.state === "held" || cs.state === "return") continue;
      const dx = cs.obj.position.x - camera.position.x;
      const dz = cs.obj.position.z - camera.position.z;
      const d = Math.hypot(dx, dz);
      if (d < bestD && (dx * fwd.x + dz * fwd.z) / Math.max(d, 1e-3) > 0.3) {
        best = cs;
        bestD = d;
      }
    }
    kickDip = 1;
    sfx.kick();
    if (!best) return;
    if (best.state === "home") {
      scene.attach(best.obj);
      best.obj.scale.setScalar(HELD_SCALE);
    }
    best.vel.copy(fwd).multiplyScalar(12).add(new THREE.Vector3(0, 5, 0));
    best.spin.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16);
    best.state = "free";
  };
  let near: number | null = null;

  const keys = new Set<string>();
  let yaw = 0;
  let pitch = 0;
  const joy = new THREE.Vector2();
  let drag: { x: number; y: number; moved: number; id: number } | null = null;
  const toNdc = (x: number, y: number) => [(x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1] as const;

  const onMove = (e: PointerEvent) => {
    mouse = e.pointerType === "mouse";
    ptr.set(...toNdc(e.clientX, e.clientY));
    if (mode === "manual" && locked) {
      yaw -= e.movementX * 0.0022;
      pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.0022, -1.2, 1.2);
      return;
    }
    if (mode === "manual" && drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      const k = e.pointerType === "mouse" ? 0.0032 : 0.005;
      yaw -= dx * k;
      pitch = THREE.MathUtils.clamp(pitch - dy * k, -1.2, 1.2);
    }
  };
  const onDown = (e: PointerEvent) => {
    if (mode !== "manual") return;
    if (locked) {
      if (e.button === 0) interact(0, 0);
      return;
    }
    if (e.pointerType === "mouse" && !coarse) {
      requestLock();
      return;
    }
    drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId };
  };
  const onUp = (e: PointerEvent) => {
    if (mode !== "manual" || !drag || e.pointerId !== drag.id) return;
    if (drag.moved < 8) interact(...toNdc(e.clientX, e.clientY));
    drag = null;
  };
  const onClick = (e: MouseEvent) => {
    if (mode === "manual") return;
    pick(...toNdc(e.clientX, e.clientY))?.act();
  };
  const onKey = (e: KeyboardEvent) => {
    if (mode !== "manual") return;
    const k = e.key.toLowerCase();
    if (e.type === "keydown") {
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      if (k === "e" && !e.repeat) interact(0, 0);
      if (k === "enter" && !e.repeat) kick();
      if (k === "t" && !e.repeat && near !== null) ev.onTalk(near);
      if (k === "r" && !e.repeat) {
        if (cubes.some((c) => c.state !== "home")) sfx.home();
        cubes.forEach(sendHome);
      }
      if (k === " " && !e.repeat && jumpY === 0) jumpV = 4.6;
      keys.add(k);
    } else keys.delete(k);
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  canvas.addEventListener("click", onClick);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);
  const onBlur = () => keys.clear();
  window.addEventListener("blur", onBlur);
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  let locked = false;
  const requestLock = () => {
    const r = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
    r?.catch?.(() => {});
  };
  const onLockChange = () => {
    locked = document.pointerLockElement === canvas;
    if (!locked) keys.clear();
    ev.onLock(locked);
  };
  document.addEventListener("pointerlockchange", onLockChange);

  // ── Rendering ──
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = camera.aspect < 0.8 ? 78 : 62;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };
  onResize();
  window.addEventListener("resize", onResize);

  // ── Main loop ──
  const clock = new THREE.Clock();
  let tCur = progressToT(ev.getProgress());
  let raf = 0;
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const lookSmooth = new THREE.Vector3();
  const lightTarget = new THREE.Vector3();
  const accentColor = new THREE.Color();
  const doorC = last.c.clone().addScaledVector(dv(last.x), last.S / 2).setY(EYE);
  const me = new THREE.Vector3(); // where you stand in manual mode
  const blendFrom = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
  let blend = 1;
  let lastT = tCur;
  let first = true;
  let walkPhase = 0;
  let jumpY = 0;
  let jumpV = 0;
  let talking = false;
  ev.onRoom(0);

  const setRoom = (r: number) => {
    if (r === cur) return;
    cur = r;
    ev.onRoom(cur);
  };

  const stepManual = (dt: number) => {
    const f = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0) + joy.y;
    const s = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0) + joy.x;
    yaw += ((keys.has("arrowleft") ? 1 : 0) - (keys.has("arrowright") ? 1 : 0)) * dt * 1.8;
    const speed = keys.has("shift") ? 6 : 3.4;
    const dir = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const want = dir.multiplyScalar(f).addScaledVector(right, s);
    if (want.lengthSq() > 1) want.normalize();
    moveVel.lerp(want.multiplyScalar(speed), Math.min(1, dt * 10));
    const nx = me.x + moveVel.x * dt;
    const nz = me.z + moveVel.z * dt;
    if (walkable(nx, me.z)) me.x = nx;
    if (walkable(me.x, nz)) me.z = nz;
    for (const ob of obstacles) {
      const dx = me.x - ob.x;
      const dz = me.z - ob.z;
      const d = Math.hypot(dx, dz);
      const min = ob.r + 0.35;
      if (d < min && d > 1e-4) {
        me.x = ob.x + (dx / d) * min;
        me.z = ob.z + (dz / d) * min;
      }
    }
    const moving = moveVel.length();
    const before = Math.floor(walkPhase / Math.PI);
    walkPhase += dt * moving * 2.6;
    if (Math.floor(walkPhase / Math.PI) !== before && moving > 0.6 && jumpY === 0) sfx.step();
    if (jumpV !== 0 || jumpY > 0) {
      jumpV -= 14 * dt;
      jumpY += jumpV * dt;
      if (jumpY <= 0) {
        jumpY = 0;
        jumpV = 0;
        sfx.land();
      }
    }
    camera.position.set(me.x, EYE + jumpY + Math.sin(walkPhase * 2) * 0.03 * Math.min(1, moving / 3) * (jumpY ? 0 : 1), me.z);
    camera.rotation.set(pitch, yaw, 0, "YXZ");
    const r = roomRects.findIndex((rr) => inRect(rr, me.x, me.z));
    if (r >= 0) setRoom(r);

    // arms: relaxed and low, reaching round the cube when you hold one, punching on a throw
    throwKick = Math.max(0, throwKick - dt * 3);
    kickDip = Math.max(0, kickDip - dt * 3);
    camera.position.y -= Math.sin(kickDip * Math.PI) * 0.12;
    if (arms.length) {
      camera.updateMatrixWorld(true);
      for (const arm of arms) {
        const bob = Math.sin(walkPhase * 2 + (arm.s > 0 ? 0 : Math.PI)) * 0.015 * Math.min(1, moving / 3);
        const target = held
          ? tmp.set(arm.s * 0.19, -0.17, -0.62 - throwKick * 0.2)
          : tmp.set(arm.s * (camera.aspect < 0.8 ? 0.14 : 0.2), -0.16 + bob, -0.42 - throwKick * 0.2); // closer in on a tall phone screen
        reach(arm, target);
      }
    }
  };

  const tick = () => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // Auto: two layers of easing (Lenis on the scroll, this on the path) keep the walk smooth.
    tCur += (progressToT(ev.getProgress()) - tCur) * Math.min(1, dt * 2.4);
    const speed = Math.abs(tCur - lastT) / Math.max(dt, 1e-4);
    lastT = tCur;
    if (mode === "auto") {
      posCurve.getPoint(tCur, pos);
      lookCurve.getPoint(tCur, look);
      if (first) {
        lookSmooth.copy(look);
        first = false;
      }
      lookSmooth.lerp(look, Math.min(1, dt * 5));
      setRoom(wps[Math.min(N - 1, Math.floor(tCur * (N - 1) + 0.0001))].room);
      const walk = Math.min(1, speed * 60);
      camera.position.copy(pos);
      camera.position.y += Math.sin(t * 6) * 0.018 * walk;
      camera.lookAt(lookSmooth);
      ptrSmooth.lerp(mouse ? ptr : ZERO2, Math.min(1, dt * 2));
      camera.rotateY(-ptrSmooth.x * 0.1);
      camera.rotateX(ptrSmooth.y * 0.05);
      // coming back from manual: glide from where you stood onto the path
      if (blend < 1) {
        blend = Math.min(1, blend + dt * 0.9);
        const k = smooth(0, 1, blend);
        camera.position.lerpVectors(blendFrom.p, camera.position, k);
        camera.quaternion.slerpQuaternions(blendFrom.q, camera.quaternion.clone(), k);
      }
    } else stepManual(dt);

    placed.forEach((P, i) => {
      P.group.visible = Math.abs(i - cur) <= 1;
      if (i >= cur - 1 && i <= cur + 2) paintRoom(P);
      else if (Math.abs(i - cur) > 3) unpaintRoom(P);
    });
    outside.visible = cur >= placed.length - 2;
    if (outside.visible) {
      loadOutside();
      animateOutside();
    }

    // Lights glide to the current room
    const P = placed[cur];
    const k = Math.min(1, dt * 1.5);
    roomLight.position.lerp(lightTarget.set(P.c.x, P.H - 0.8, P.c.z), k);
    accentLight.position.lerp(lightTarget.set(P.c.x, CUBE_Y + 1.2, P.c.z), k);
    accentLight.color.lerp(accentColor.set(P.room.accent), k);

    // Cubes: float and spin on their pillars unless someone's playing with them
    for (const cs of cubes) {
      if (cs.ground) cs.obj.visible = outside.visible;
      if (cs.state === "home") {
        if (cs.ground || !cs.P.group.visible) continue; // terrace cubes just lie where they are
        cs.obj.rotation.y += dt * 0.45;
        cs.obj.rotation.x = Math.sin(t * 0.6) * 0.2;
        cs.obj.rotation.z = 0;
        cs.obj.position.set(cs.home.x, CUBE_Y + Math.sin(t * 1.3) * 0.1, cs.home.z);
        cs.obj.scale.setScalar(1);
      } else updateCube(cs, dt);
    }
    for (const Q of placed) if (Q.group.visible) for (const sp of Q.spin) sp.rotation.y += dt * 0.4;
    for (const s of tvScreens) s.m.color.setScalar(0.8 + s.hover * 0.2);

    // Guides: load as you approach; idle in their corner, turn to you when you come close, act out the talk
    let nearNow: number | null = null;
    guidesBy.forEach((g, i) => {
      if (Math.abs(i - cur) <= 1) loadGuide(i);
      if (!g || !placed[i].group.visible) return;
      const dx = camera.position.x - g.root.position.x;
      const dz = camera.position.z - g.root.position.z;
      const dist = Math.hypot(dx, dz);
      const speaking = talking && i === cur;
      if (mode === "manual" && dist < 3.4) nearNow = i;
      const want = speaking || dist < 3.4 ? Math.atan2(dx, dz) : g.home;
      let d = want - g.root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      g.root.rotation.y += d * Math.min(1, dt * 2.5);
      if (speaking && !g.talking) swap(g, g.talk);
      else if (!speaking && g.talking) swap(g, g.idle);
      g.talking = speaking;
      g.mixer.update(dt);
    });
    if (nearNow !== near) {
      near = nearNow;
      ev.onNear(near);
    }

    // Exit doors swing open as you reach them
    const open = smooth(7, 3, camera.position.distanceTo(doorC));
    for (const l of leaves) l.hinge.rotation.y = -l.s * open * 1.85;

    // Hover (mouse only)
    if (mouse && !drag) {
      const now = pick(ptr.x, ptr.y);
      if (now !== hovered) {
        hovered?.hover?.(false);
        now?.hover?.(true);
        hovered = now;
      }
      const overCube = mode === "manual" && !held && !!hit(ptr.x, ptr.y, cubes.map((c) => c.obj));
      canvas.style.cursor = now || overCube ? "pointer" : mode === "manual" ? "grab" : "";
    }

    renderer.render(scene, camera);
  };
  tick();

  return {
    rooms: roomInfo,
    setMode(m) {
      if (m === mode) return;
      if (m === "manual") {
        camera.getWorldDirection(fwd);
        yaw = Math.atan2(-fwd.x, -fwd.z);
        pitch = Math.asin(THREE.MathUtils.clamp(fwd.y, -1, 1)) * 0.5;
        me.set(camera.position.x, 0, camera.position.z);
        if (!walkable(me.x, me.z)) {
          const P = placed[cur];
          me.set(P.c.x, 0, P.c.z).addScaledVector(dv(P.e), P.S / 2 - 2);
        }
        moveVel.set(0, 0, 0);
        setHandsVisible(true);
        if (!coarse) requestLock();
      } else {
        blendFrom.p.copy(camera.position);
        blendFrom.q.copy(camera.quaternion);
        blend = 0;
        tCur = progressToT(ev.getProgress());
        first = true;
        keys.clear();
        joy.set(0, 0);
        setHandsVisible(false);
        cubes.forEach(sendHome);
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        if (near !== null) ev.onNear((near = null));
      }
      mode = m;
    },
    setJoystick(x, y) {
      joy.set(x, y);
    },
    interact() {
      interact(0, 0);
    },
    lock() {
      if (mode === "manual" && !coarse) requestLock();
    },
    resetCubes() {
      if (cubes.some((c) => c.state !== "home")) sfx.home();
      cubes.forEach(sendHome);
    },
    setTalking(on) {
      talking = on;
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("pointerlockchange", onLockChange);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("click", onClick);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) {
          for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
          mat.dispose();
        }
      });
      envTex.dispose();
      renderer.dispose();
    },
  };
}
