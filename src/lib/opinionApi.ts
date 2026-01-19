const DEFAULT_BASE_URL = "https://openapi.opinion.trade/openapi";

export type FetchOptions = {
  method?: string;
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  signal?: AbortSignal;
};

const API_TIMEOUT_MS = 10_000;
const RETRY_BACKOFF_MS = 400;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildUrl = (path: string, query?: FetchOptions["query"]) => {
  const baseUrl = process.env.OPINION_API_BASE || DEFAULT_BASE_URL;
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }
  return url;
};

const shouldRetry = (status: number) => status === 429 || (status >= 500 && status <= 599);

export async function opinionFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const apiKey = process.env.OPINION_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPINION_API_KEY env var");
  }

  const url = buildUrl(path, options.query);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey
  };

  const attempt = async (retrying: boolean) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal ?? controller.signal
      });

      if (!response.ok) {
        const text = await response.text();
        if (!retrying && shouldRetry(response.status)) {
          await sleep(RETRY_BACKOFF_MS);
          return attempt(true);
        }
        throw new Error(`Opinion API error ${response.status}: ${text}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  };

  return attempt(false);
}
