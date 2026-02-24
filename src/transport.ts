import { MAX_BACKOFF_MS } from "./constants.js";

type FetchFn = typeof globalThis.fetch;

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS", "PUT", "DELETE"]);

function isIdempotent(method: string): boolean {
  return IDEMPOTENT_METHODS.has(method.toUpperCase());
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function calcExpBackoff(attempt: number): number {
  const base = Math.pow(2, attempt);
  const jitter = Math.random() * base;
  const duration = (base + jitter) * 0.5;
  return Math.min(duration * 1000, MAX_BACKOFF_MS);
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;

  // Try integer seconds first.
  const seconds = Number(header);
  if (Number.isFinite(seconds) && /^\d+$/.test(header.trim())) {
    return Math.max(0, Math.min(seconds * 1000, MAX_BACKOFF_MS));
  }

  // Try HTTP-date (RFC 7231).
  const date = new Date(header);
  if (!isNaN(date.getTime())) {
    const delta = date.getTime() - Date.now();
    return Math.max(0, Math.min(delta, MAX_BACKOFF_MS));
  }

  return undefined;
}

function calcBackoff(attempt: number, response: Response): number {
  const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
  if (retryAfter !== undefined) return retryAfter;
  return calcExpBackoff(attempt);
}

function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("The operation was aborted.", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException("The operation was aborted.", "AbortError"));
      },
      { once: true },
    );
  });
}

const MAX_DRAIN_BYTES = 1024 * 1024; // 1MB

async function drainBody(response: Response): Promise<void> {
  if (!response.body) return;
  try {
    const reader = response.body.getReader();
    let read = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      read += value.byteLength;
      if (read >= MAX_DRAIN_BYTES) {
        await reader.cancel();
        break;
      }
    }
  } catch {
    // Ignore drain errors.
  }
}

export function createAuthFetch(
  baseFetch: FetchFn,
  apiKey: string,
  userAgent: string,
): FetchFn {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${apiKey}`);
    headers.set("User-Agent", userAgent);
    return baseFetch(input, { ...init, headers });
  };
}

export function createRetryFetch(baseFetch: FetchFn, maxRetries: number): FetchFn {
  const retries = Math.max(maxRetries, 0);

  return async (input, init) => {
    const method = init?.method?.toUpperCase() ?? "GET";
    const signal = init?.signal ?? null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      let response: Response;
      try {
        response = await baseFetch(input, init);
      } catch (err) {
        // Network errors (TypeError from fetch) — retry only idempotent.
        if (attempt >= retries || !isIdempotent(method)) throw err;
        await sleep(calcExpBackoff(attempt), signal);
        continue;
      }

      if (!isRetryable(response.status) || attempt >= retries) {
        return response;
      }

      // Don't retry non-idempotent methods on 5xx.
      if (response.status !== 429 && !isIdempotent(method)) {
        return response;
      }

      const wait = calcBackoff(attempt, response);
      await drainBody(response);
      await sleep(wait, signal);
    }

    // Unreachable.
    throw new Error("vesselapi: retry loop exited unexpectedly");
  };
}
