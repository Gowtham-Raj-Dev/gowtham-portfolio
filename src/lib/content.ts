import { sites, type Site } from "./sites";

export const skills = [
  { title: "Frontend", items: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Three.js", "Vite"] },
  { title: "Backend & cloud", items: ["Node.js", "Firebase", "Vercel", "Static hosting", "CI / CD"] },
  { title: "Growth", items: ["Technical SEO", "Sitemaps", "IndexNow", "GA4", "AdSense"] },
  { title: "Hard problems", items: ["J2ME emulator in JS", "Android app", "Video tools", "YouTube automation"] },
];

export const steps = [
  { title: "Spot the need", text: "Something people search for every day and can't get free or without signing up." },
  { title: "Build it fast", text: "Next.js, TypeScript and the browser. Heavy work like video or 3D runs on your device." },
  { title: "Ship it free", text: "Static hosting, automatic deploys, no login walls. If it works, it goes live." },
  { title: "Grow the network", text: "Sitemaps, IndexNow, analytics and cross-links so every site helps the others." },
];

export const stats = [
  { big: "9", small: "live websites" },
  { big: "6.9k", small: "3D model pages" },
  { big: "14", small: "browser games" },
  { big: "1", small: "developer" },
];

export type Game = { slug: string; title: string; genre: string; tagline: string; accent: string };

// The playable games on games.codelove.in (cover art in /public/games/<slug>.webp).
export const games: Game[] = [
  { slug: "patti-veedu", title: "Patti Veedu", genre: "Horror puzzle", tagline: "Grandma's house. Five nights. Listen for her anklet bells.", accent: "#e2563b" },
  { slug: "aisle-zero", title: "Aisle Zero", genre: "Horror stealth", tagline: "A huge abandoned supermarket at night. Something roams the aisles.", accent: "#e2261a" },
  { slug: "skate-rush", title: "Skate Rush", genre: "Endless runner", tagline: "Skate through the city, dodge the traffic, grab every coin.", accent: "#f59e0b" },
  { slug: "turbo-karts", title: "Turbo Karts", genre: "Kart racing", tagline: "Drift, boost and banana-slip your way to the podium.", accent: "#f97316" },
  { slug: "cannon-cove", title: "Cannon Cove", genre: "Naval trading", tagline: "Trade across the open sea, build a fleet, battle friends online.", accent: "#38bdf8" },
  { slug: "crypt-knight", title: "Crypt Knight", genre: "Action roguelite", tagline: "Sword, shield and a crypt full of restless skeletons.", accent: "#f43f5e" },
  { slug: "kingdom-clash", title: "Kingdom Clash", genre: "Strategy", tagline: "Build your village, train an army, raid rival villages.", accent: "#fbbf24" },
  { slug: "sky-hop", title: "Sky Hop", genre: "3D platformer", tagline: "Run, double-jump and stomp across floating sky islands.", accent: "#facc15" },
  { slug: "saucer-siege", title: "Saucer Siege", genre: "Tower defense", tagline: "Medieval towers versus flying saucers. Hold the valley!", accent: "#a78bfa" },
  { slug: "order-up", title: "Order Up!", genre: "Cooking", tagline: "Grill, stack and serve burgers before the customers walk out.", accent: "#f472b6" },
  { slug: "siege-smash", title: "Siege Smash", genre: "Physics puzzle", tagline: "Aim the trebuchet, topple the towers, rout the defenders.", accent: "#a3e635" },
  { slug: "beat-street", title: "Beat Street", genre: "Rhythm", tagline: "Hit the notes on the beat and make the crowd dance.", accent: "#e879f9" },
  { slug: "putt-paradise", title: "Putt Paradise", genre: "Mini golf", tagline: "Nine dreamy mini-golf holes. Ramps, loops and windmills.", accent: "#2dd4bf" },
  { slug: "hex-haven", title: "Hex Haven", genre: "Puzzle", tagline: "Lay hex tiles, match the edges, grow a tiny kingdom.", accent: "#34d399" },
];

// How to reach Gowtham (exit room, its card and the end of the walk)
export const contact = {
  whatsapp: "+91 63694 94396",
  whatsappUrl: "https://wa.me/916369494396",
  
  emails: [
    { label: "Gowtham", email: "gowtham@codelove.in" },
    { label: "Support", email: "support@codelove.in" },
  ],
};

export const gameUrl =(slug: string) => `https://games.codelove.in/${slug}/`;
export const playUrl = (slug: string) => `https://games.codelove.in/${slug}/play/`;

export type RoomKind = "lobby" | "site" | "games" | "workshop" | "exit";
export type Room = {
  id: string;
  kind: RoomKind;
  name: string;
  /** One line for the HUD card. */
  line: string;
  accent: string;
  /** Logo on the cube; "G" draws Gowtham's monogram. */
  logo: string;
  site?: Site;
};

const siteRoom = (s: Site): Room => ({
  id: s.key,
  kind: s.key === "games" ? "games" : "site",
  name: s.key === "games" ? "Game Center" : s.name,
  line: s.key === "games" ? "Click any TV to play the game right here." : s.tagline,
  accent: s.accent,
  logo: s.logo,
  site: s,
});

// One room per stop of the walk, in order. The world lays them out as a winding chain.
export const rooms: Room[] = [
  { id: "lobby", kind: "lobby", name: "Lobby", line: "Scroll to walk through my rooms.", accent: "#e8b85a", logo: "G" },
  ...sites.map(siteRoom),
  { id: "workshop", kind: "workshop", name: "Workshop", line: "The toolbox and how I ship.", accent: "#22d3ee", logo: "G" },
  { id: "exit", kind: "exit", name: "Exit", line: "Let's build something together.", accent: "#e8b85a", logo: "/logos/codelove.png" },
];

/** Rooms whose guide is a woman (picks the narration voice). */
export const femaleGuides = new Set(["codelove", "downloader", "videotogif", "utubeflow", "exit"]);

/** What the guide standing in each room says (model in /public/models/guides/<room id>.glb). */
export const guides: Record<string, { name: string; line: string }> = {
  lobby: {
    name: "Arun",
    line: "Hi, welcome to Gowtham's museum! Every room here is one of his live websites. Scroll and I'll walk you through, or switch to Manual at the top to explore on your own. You can even pick up the cube on the pillar and throw it.",
  },
  codelove: {
    name: "Priya",
    line: "This is CodeLove, the home of the whole network. It has free online tools, a learning center, guides and a blog, and it links every CodeLove site together.",
  },
  models: {
    name: "Karthik",
    line: "Welcome to Free 3D Models. Around six thousand nine hundred pages of free models: characters, animals, games and space. You can preview, recolor and download each one as a GLB file. The little friends on these pedestals come from there too.",
  },
  games: {
    name: "Vicky",
    line: "This is the Game Center! Fourteen free 3D games, all built from the model library. Click any TV on the wall and the game opens right here. Nothing to install, nothing to sign up for.",
  },
  downloader: {
    name: "Divya",
    line: "Insta Downloader saves public Instagram reels, videos and photos in full HD, with no login and no watermark. It works for Pinterest too, and it can download a whole batch at once.",
  },
  linkinbio: {
    name: "Rahul",
    line: "Link in Bio puts all your links on one simple page. Make it once, share it from every profile, and it's free to set up.",
  },
  videotogif: {
    name: "Meera",
    line: "Video to GIF is a GIF studio inside your browser. Turn any video into a GIF, then trim, resize and edit it. Nothing is uploaded. It all runs on your own device.",
  },
  videotoimages: {
    name: "Sanjay",
    line: "Video to Images pulls frames out of a video, saves the audio as an MP3, or resizes the video to 1080p, 720p or 480p. Everything stays private on your device.",
  },
  utubeflow: {
    name: "Kavya",
    line: "UTubeFlow is a free YouTube automation workflow. Plan your content calendar, make videos step by step, and publish them on a schedule, without paying every month.",
  },
  javaplay: {
    name: "Hari",
    line: "JavaPlay brings back the classic Java phone games. Gowtham wrote the emulator engine from scratch in JavaScript, so they play right in the browser, and there's an Android app too.",
  },
  workshop: {
    name: "Mani",
    line: "This is the workshop. On the walls you'll find Gowtham's toolbox, from Next.js and Three.js to SEO, and the four steps he follows to ship every site.",
  },
  exit: {
    name: "Anu",
    line: "Thanks for walking through! If you have an idea or a project, message Gowtham on WhatsApp, or write to gowtham at codelove dot in. When you're ready, step outside through the big doors.",
  },
};
