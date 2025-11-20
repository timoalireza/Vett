export const heroEvents = [
  {
    id: "event-1",
    title: "WHO Treaty Deep-Dive",
    subtitle: "Thu, 13 Feb • Brussels",
    status: "Going",
    accent: "#5AE0A3",
    topic: "health"
  },
  {
    id: "event-2",
    title: "Viral Clip Reality Check",
    subtitle: "Sat, 24 Feb • Global",
    status: "Queued",
    accent: "#A1B8FF",
    topic: "media"
  },
  {
    id: "event-3",
    title: "Elections Integrity Watch",
    subtitle: "Tue, 4 Nov • DC",
    status: "Soon",
    accent: "#FFC38A",
    topic: "politics"
  }
];

export const quickActions = [
  { label: "Instagram Post", icon: "logo-instagram" },
  { label: "TikTok Link", icon: "logo-tiktok" },
  { label: "X Thread", icon: "logo-twitter" },
  { label: "Upload Screenshot", icon: "image-outline", permission: "media" }
];

export const dummyClaims = [
  { text: "EU granted WHO full pandemic override powers", verdict: "False", confidence: 0.94 },
  { text: "CDC halted all flu shots for pregnant people", verdict: "Partially True", confidence: 0.68 },
  { text: "Solar panels shut down whenever it snows", verdict: "False", confidence: 0.91 }
];

export const dummySources = [
  { outlet: "WHO.int", reliability: 0.9, bias: "Center" as const },
  { outlet: "Health Policy Watch", reliability: 0.82, bias: "Center" as const },
  { outlet: "Euronews", reliability: 0.75, bias: "Center" as const }
];

export const exploreTopics = ["Politics", "Health", "Science", "Tech", "Finance"];

export const inviteSummary = {
  title: "Get the party started with Vett",
  subtitle: "Drop anything into Vett to see if it holds up—links, posts, screenshots."
};

