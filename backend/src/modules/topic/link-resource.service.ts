import { env } from '../shared/config/env.js';
import { BraveSearchResponseSchema } from './link-resource.schemas.js';

const DEFAULT_BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';
const MAX_URL_LENGTH = 2048;
const MAX_TITLE_LENGTH = 200;
const MAX_RESULTS = 10;
const FRESHNESS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface LearningResource {
  title: string;
  url: string;
}

interface TopicContext {
  name: string;
  category: string;
  subcategory: string;
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^\[::1\]$/,
  /^0\.0\.0\.0$/,
];

const HIGH_SIGNAL_DOMAINS = [
  'martinfowler.com',
  'refactoring.guru',
  'patterns.dev',
  '12factor.net',
  'microservices.io',
  'cloud.google.com',
  'aws.amazon.com',
  'docs.microsoft.com',
  'learn.microsoft.com',
  'mozilla.org',
  'w3.org',
  'ietf.org',
  'rfc-editor.org',
  'github.com',
  'kubernetes.io',
  'docker.com',
  'wikipedia.org',
];

const HIGH_SIGNAL_PREFIXES = ['docs.', 'developer.', 'learn.', 'wiki.'];

const SEO_PENALTY_TOKENS = ['top 10', 'best of', 'click here', 'buy now', 'sign up', 'subscribe'];

// In-process dedupe map: topicId -> last refresh attempt timestamp
const refreshCooldownMap = new Map<string, number>();

function sanitizeUrl(rawUrl: string): string | null {
  if (rawUrl.length > MAX_URL_LENGTH) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;

  if (PRIVATE_HOST_PATTERNS.some((p) => p.test(parsed.hostname))) return null;

  // Remove fragment for canonical form
  parsed.hash = '';
  return parsed.toString();
}

function scoreRelevance(
  title: string,
  url: string,
  topicName: string,
  category: string,
  subcategory: string
): number {
  let score = 0;
  const titleLower = title.toLowerCase();
  const urlLower = url.toLowerCase();

  const tokens = [topicName, category, subcategory]
    .join(' ')
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);

  for (const token of tokens) {
    if (titleLower.includes(token)) score += 2;
    if (urlLower.includes(token)) score += 1;
  }

  // Boost high-signal exact domains
  for (const domain of HIGH_SIGNAL_DOMAINS) {
    if (urlLower.includes(domain)) {
      score += 3;
      break;
    }
  }

  // Boost high-signal subdomain prefixes
  for (const prefix of HIGH_SIGNAL_PREFIXES) {
    if (urlLower.includes(`/${prefix}`) || urlLower.includes(`//${prefix}`)) {
      score += 2;
      break;
    }
  }

  // Penalize generic SEO content
  for (const seo of SEO_PENALTY_TOKENS) {
    if (titleLower.includes(seo)) {
      score -= 3;
    }
  }

  return score;
}

const VERIFY_TIMEOUT_MS = 1000;
const VERIFY_CANDIDATE_POOL = 8; // check more than 5 to have fallbacks

export class LinkResourceService {
  async getLearningResourcesForTopic(topicContext: TopicContext): Promise<LearningResource[]> {
    if (!env.BRAVE_API_KEY) {
      return [];
    }

    const query = `${topicContext.name} ${topicContext.subcategory} overview`;
    const results = await this.fetchBraveResults(query);
    if (!results) return [];

    const scored: Array<{ title: string; url: string; score: number }> = [];
    const seenUrls = new Set<string>();

    for (const result of results) {
      const url = sanitizeUrl(result.url);
      if (!url) continue;
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const title = result.title.slice(0, MAX_TITLE_LENGTH);
      const score = scoreRelevance(
        title,
        url,
        topicContext.name,
        topicContext.category,
        topicContext.subcategory
      );

      if (score > 0) {
        scored.push({ title, url, score });
      }
    }

    // Take a larger pool of candidates, verify reachability, then pick top 5
    const candidates = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, VERIFY_CANDIDATE_POOL);

    const verified = await this.verifyUrls(candidates);

    return verified
      .slice(0, 5)
      .map(({ title, url }) => ({ title, url }));
  }

  isStale(lastRefreshedAt: Date | null): boolean {
    if (!lastRefreshedAt) return true;
    return Date.now() - lastRefreshedAt.getTime() > FRESHNESS_TTL_MS;
  }

  hasCooldown(topicId: string): boolean {
    const lastAttempt = refreshCooldownMap.get(topicId);
    if (!lastAttempt) return false;
    return Date.now() - lastAttempt < COOLDOWN_MS;
  }

  recordRefreshAttempt(topicId: string): void {
    refreshCooldownMap.set(topicId, Date.now());
  }

  /**
   * Verify URLs are reachable via HEAD requests (parallel).
   * Returns only candidates that respond with a 2xx/3xx status.
   */
  private async verifyUrls(candidates: Array<{ title: string; url: string; score: number }>): Promise<Array<{ title: string; url: string; score: number }>> {
    const results = await Promise.allSettled(
      candidates.map(async (candidate) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
        try {
          const res = await fetch(candidate.url, {
            method: 'HEAD',
            signal: controller.signal,
            redirect: 'follow',
            headers: { 'User-Agent': 'Breadthwise/1.0 LinkChecker' },
          });
          // Accept 2xx and 3xx; treat 405 (Method Not Allowed) as potentially valid
          if (res.ok || res.status === 405) return candidate;
          return null;
        } catch {
          return null;
        } finally {
          clearTimeout(timeout);
        }
      })
    );

    return results
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter((v) => v !== null);
  }

  private async fetchBraveResults(
    query: string
  ): Promise<Array<{ title: string; url: string }> | null> {
    const apiUrl = env.BRAVE_API_URL ?? DEFAULT_BRAVE_API_URL;

    let attempt = 0;
    while (attempt < 2) {
      attempt++;
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), 5000);

      try {
        const url = `${apiUrl}?q=${encodeURIComponent(query)}&count=${MAX_RESULTS}&search_lang=en`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': env.BRAVE_API_KEY!,
          },
        });

        if (!response.ok) {
          if (attempt < 2 && response.status >= 500) continue;
          return null;
        }

        const json = await response.json();
        const parsed = BraveSearchResponseSchema.safeParse(json);
        if (!parsed.success) return null;

        return parsed.data.web?.results ?? [];
      } catch {
        if (attempt < 2) continue;
        return null;
      } finally {
        clearTimeout(timeoutHandle);
      }
    }

    return null;
  }
}

export const linkResourceService = new LinkResourceService();
