const RAW_HOST_TRUST: Array<[string, number]> = [
  ["www.fda.gov", 0.95],
  ["fda.gov", 0.95],
  ["www.who.int", 0.95],
  ["who.int", 0.95],
  ["www.cdc.gov", 0.92],
  ["cdc.gov", 0.92],
  ["www.nih.gov", 0.9],
  ["nih.gov", 0.9],
  ["www.reuters.com", 0.88],
  ["reuters.com", 0.88],
  ["www.apnews.com", 0.88],
  ["apnews.com", 0.88],
  ["www.bbc.com", 0.85],
  ["bbc.com", 0.85],
  ["www.factcheck.org", 0.9],
  ["factcheck.org", 0.9],
  ["www.snopes.com", 0.88],
  ["snopes.com", 0.88],
  ["www.nytimes.com", 0.85],
  ["nytimes.com", 0.85],
  ["www.wsj.com", 0.85],
  ["wsj.com", 0.85],
  ["www.nbcnews.com", 0.85],
  ["nbcnews.com", 0.85],
  ["www.cbsnews.com", 0.83],
  ["cbsnews.com", 0.83],
  ["www.theguardian.com", 0.84],
  ["theguardian.com", 0.84],
  ["www.pbs.org", 0.82],
  ["pbs.org", 0.82]
];

export const HOST_TRUST = new Map<string, number>(RAW_HOST_TRUST);

export const HOST_BLACKLIST = new Set<string>([
  "vaccinedamage.news",
  "flushot.news",
  "naturalnews.com",
  "infowars.com",
  "thebee.news",
  "onfocus.news",
  "kentlive.news",
  "pandemic.news",
  "deception.news",
  "biggovernment.news"
]);

const LOW_TRUST_THRESHOLD = 0.35;
const BLACKLIST_RELIABILITY = 0.15;
const DYNAMIC_LOW_TRUST_CLAMP = 0.4;
const LOW_TRUST_MIN_OBSERVATIONS = 3;
const BLACKLIST_MIN_OBSERVATIONS = 5;
const DYNAMIC_BLACKLIST_THRESHOLD = 0.25;

type DomainStats = {
  scoreSum: number;
  count: number;
};

const DOMAIN_STATS = new Map<string, DomainStats>();
const DYNAMIC_LOW_TRUST = new Set<string>();
const DYNAMIC_BLACKLIST = new Set<string>();

export function extractHostname(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return null;
  }
}

export function isBlacklisted(url: string): boolean {
  const hostname = extractHostname(url);
  if (!hostname) return false;
  return (
    HOST_BLACKLIST.has(hostname) ||
    HOST_BLACKLIST.has(`www.${hostname}`) ||
    DYNAMIC_BLACKLIST.has(hostname) ||
    DYNAMIC_BLACKLIST.has(`www.${hostname}`)
  );
}

export function adjustReliability(url: string, current: number | undefined): number {
  const hostname = extractHostname(url);
  if (!hostname) {
    return current ?? 0.6;
  }

  if (isBlacklisted(url)) {
    return Math.min(current ?? BLACKLIST_RELIABILITY, BLACKLIST_RELIABILITY);
  }

  if (
    DYNAMIC_LOW_TRUST.has(hostname) ||
    DYNAMIC_LOW_TRUST.has(`www.${hostname}`)
  ) {
    return Math.min(current ?? DYNAMIC_LOW_TRUST_CLAMP, DYNAMIC_LOW_TRUST_CLAMP);
  }

  const canonicalTrust =
    HOST_TRUST.get(hostname) ?? HOST_TRUST.get(`www.${hostname}`) ?? (current ?? 0.6);

  return Math.max(current ?? 0.6, canonicalTrust);
}

export function isLowTrust(url: string, reliability: number | undefined): boolean {
  const adjusted = adjustReliability(url, reliability);
  return adjusted < LOW_TRUST_THRESHOLD;
}

export function recordEvidenceReliability(url: string, reliability: number | undefined): void {
  if (typeof reliability !== "number") return;
  const hostname = extractHostname(url);
  if (!hostname) return;

  const stats = DOMAIN_STATS.get(hostname) ?? { scoreSum: 0, count: 0 };
  stats.scoreSum += reliability;
  stats.count += 1;
  DOMAIN_STATS.set(hostname, stats);

  const average = stats.scoreSum / stats.count;

  if (
    stats.count >= BLACKLIST_MIN_OBSERVATIONS &&
    average < DYNAMIC_BLACKLIST_THRESHOLD &&
    !DYNAMIC_BLACKLIST.has(hostname)
  ) {
    DYNAMIC_BLACKLIST.add(hostname);
    // eslint-disable-next-line no-console
    console.warn("[trust] Added to dynamic blacklist", { hostname, average, observations: stats.count });
    return;
  }

  if (
    stats.count >= LOW_TRUST_MIN_OBSERVATIONS &&
    average < LOW_TRUST_THRESHOLD &&
    !DYNAMIC_LOW_TRUST.has(hostname)
  ) {
    DYNAMIC_LOW_TRUST.add(hostname);
    // eslint-disable-next-line no-console
    console.warn("[trust] Marked as dynamic low-trust", { hostname, average, observations: stats.count });
  }
}

export function getTrustSnapshot(): {
  dynamicLowTrust: string[];
  dynamicBlacklist: string[];
} {
  return {
    dynamicLowTrust: Array.from(DYNAMIC_LOW_TRUST),
    dynamicBlacklist: Array.from(DYNAMIC_BLACKLIST)
  };
}


