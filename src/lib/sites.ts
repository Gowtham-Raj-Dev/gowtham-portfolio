export type Site = {
  key: string;
  name: string;
  url: string;
  domain: string;
  blurb: string;
  tagline: string;
  features: string[];
  numbers: { big: string; small: string }[];
  tags: string[];
  /** Logo shown on every face of the room's cube (in /public/logos). */
  logo: string;
  /** Screenshot framed on the room's second wall (in /public/shots). */
  shot: string;
  /** Neon colour of the room. */
  accent: string;
};

export const sites: Site[] = [
  {
    key: "codelove",
    name: "CodeLove",
    url: "https://codelove.in",
    domain: "codelove.in",
    tagline: "The home of the whole network.",
    blurb: "The home of the network: free tools, a learning center, guides and a blog in one place.",
    features: ["Free online tools", "Learning center", "Step-by-step guides", "Blog", "Links every CodeLove site"],
    numbers: [
      { big: "9", small: "sites linked" },
      { big: "0", small: "sign-ups needed" },
    ],
    tags: ["Next.js", "SEO", "Hub"],
    logo: "/logos/codelove.png",
    shot: "/shots/codelove.png",
    accent: "#3d6bff",
  },
  {
    key: "models",
    name: "Free 3D Models",
    url: "https://models.codelove.in",
    domain: "models.codelove.in",
    tagline: "A free library of ready-to-use 3D models.",
    blurb: "Around 6,900 pages of free 3D models, with a GLB viewer to preview, recolor and download glTF files.",
    features: ["Live GLB viewer", "Recolor before download", "80+ collections", "Characters, games, nature, space", "Free for commercial use"],
    numbers: [
      { big: "6.9k", small: "model pages" },
      { big: "80+", small: "collections" },
    ],
    tags: ["Three.js", "GLB", "Static export"],
    logo: "/logos/models.svg",
    shot: "/shots/models.jpg",
    accent: "#8b5cf6",
  },
  {
    key: "games",
    name: "Free 3D Games",
    url: "https://games.codelove.in",
    domain: "games.codelove.in",
    tagline: "Games that run right in the browser.",
    blurb: "Games that run right in the browser. Open the page and start playing, nothing to install.",
    features: ["Built from the 3D library", "Racing, horror, strategy, puzzles", "Touch controls for phones", "Online play in some games", "Nothing to install"],
    numbers: [
      { big: "14", small: "playable now" },
      { big: "4", small: "coming soon" },
    ],
    tags: ["Three.js", "WebGL", "Games"],
    logo: "/logos/games.svg",
    shot: "/shots/games.jpg",
    accent: "#ff4d1f",
  },
  {
    key: "downloader",
    name: "Insta Downloader",
    url: "https://downloader.codelove.in",
    domain: "downloader.codelove.in",
    tagline: "Save Reels, videos and photos in HD.",
    blurb: "Save public Instagram Reels, videos and photos in HD with no login and no watermark. Pinterest too.",
    features: ["Instagram Reels and videos", "Photos and carousels", "Pinterest videos and images", "Batch mode", "No login, no watermark"],
    numbers: [
      { big: "HD", small: "full quality" },
      { big: "0", small: "watermarks" },
    ],
    tags: ["Next.js", "Vercel", "Media"],
    logo: "/logos/downloader.svg",
    shot: "/shots/downloader.png",
    accent: "#f43f5e",
  },
  {
    key: "linkinbio",
    name: "Link in Bio",
    url: "https://linkinbio.codelove.in",
    domain: "linkinbio.codelove.in",
    tagline: "All your links on one simple page.",
    blurb: "One simple page that holds all of your links, ready to share from any profile.",
    features: ["One page for every link", "Share from any profile", "Clean, fast profiles", "Free to set up"],
    numbers: [
      { big: "1", small: "link to share" },
      { big: "∞", small: "links inside" },
    ],
    tags: ["Next.js", "Profiles"],
    logo: "/logos/linkinbio.png",
    shot: "/shots/linkinbio.png",
    accent: "#b05cff",
  },
  {
    key: "videotogif",
    name: "Video to GIF",
    url: "https://videotogif.codelove.in",
    domain: "videotogif.codelove.in",
    tagline: "GIF Studio, right in your browser.",
    blurb: "GIF Studio: turn video into GIFs, then trim, resize and edit them with free in-browser tools.",
    features: ["Video to GIF", "Trim and resize", "GIF editing tools", "Runs on your device", "No upload, no sign-up"],
    numbers: [
      { big: "100%", small: "in-browser" },
      { big: "0", small: "uploads" },
    ],
    tags: ["In-browser", "Media"],
    logo: "/logos/videotogif.svg",
    shot: "/shots/videotogif.png",
    accent: "#00e5ff",
  },
  {
    key: "videotoimages",
    name: "Video to Images",
    url: "https://videotoimages.codelove.in",
    domain: "videotoimages.codelove.in",
    tagline: "Frames, audio and resizing on your device.",
    blurb: "Pull frames from a video, extract MP3 audio or resize to 1080p, 720p or 480p, all on your device.",
    features: ["Extract video frames", "Video to MP3", "Resize to 1080p / 720p / 480p", "Private: nothing leaves your device"],
    numbers: [
      { big: "3", small: "tools in one" },
      { big: "0", small: "uploads" },
    ],
    tags: ["In-browser", "Tools"],
    logo: "/logos/videotoimages.svg",
    shot: "/shots/videotoimages.png",
    accent: "#e8edf5",
  },
  {
    key: "utubeflow",
    name: "Free YouTube Automation",
    url: "https://utubeflow.codelove.in",
    domain: "utubeflow.codelove.in",
    tagline: "UTubeFlow: plan, make and publish on schedule.",
    blurb: "UTubeFlow: a free YouTube automation workflow to plan, make and publish videos on a schedule.",
    features: ["Plan a content calendar", "Make videos step by step", "Publish on a schedule", "Free, no subscription"],
    numbers: [
      { big: "1", small: "workflow" },
      { big: "₹0", small: "per month" },
    ],
    tags: ["Vite", "Automation"],
    logo: "/logos/utubeflow.png",
    shot: "/shots/utubeflow.png",
    accent: "#34d399",
  },
  {
    key: "javaplay",
    name: "Free Java Games",
    url: "https://javaplay.codelove.in",
    domain: "javaplay.codelove.in",
    tagline: "JavaPlay: classic phone games, reborn.",
    blurb: "JavaPlay: classic J2ME phone games on an emulator engine written from scratch in JavaScript, plus an Android app.",
    features: ["J2ME emulator built in JavaScript", "Classic keypad phone games", "Plays in the browser", "Android app"],
    numbers: [
      { big: "JS", small: "engine from scratch" },
      { big: "APK", small: "Android app" },
    ],
    tags: ["Emulator", "JS engine", "Android"],
    logo: "/logos/javaplay.png",
    shot: "/shots/javaplay.png",
    accent: "#ff8a1f",
  },
];
