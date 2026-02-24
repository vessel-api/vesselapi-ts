import { describe, expect, it, vi } from "vitest";
import { createAuthFetch, createRetryFetch } from "../src/transport.js";

function mockResponse(status: number, body = "", headers?: Record<string, string>): Response {
  return new Response(body, { status, headers });
}

function mockFetch(responses: Response[]): typeof globalThis.fetch {
  let index = 0;
  return vi.fn(async () => {
    const resp = responses[index++];
    if (!resp) throw new TypeError("fetch failed");
    return resp;
  });
}

describe("createAuthFetch", () => {
  it("adds Authorization and User-Agent headers", async () => {
    const base = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      return new Response(
        JSON.stringify({
          auth: headers.get("Authorization"),
          ua: headers.get("User-Agent"),
        }),
      );
    });

    const authFetch = createAuthFetch(base, "test-key", "test-agent/1.0");
    const resp = await authFetch("https://example.com");
    const data = await resp.json();
    expect(data.auth).toBe("Bearer test-key");
    expect(data.ua).toBe("test-agent/1.0");
  });
});

describe("createRetryFetch", () => {
  it("retries 429 for all methods including POST", async () => {
    const responses = [
      mockResponse(429, "", { "Retry-After": "0" }),
      mockResponse(200, '{"ok":true}'),
    ];
    const base = mockFetch(responses);
    const retryFetch = createRetryFetch(base, 3);

    const resp = await retryFetch("https://example.com", { method: "POST" });
    expect(resp.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it("retries 5xx only for idempotent methods", async () => {
    const responses = [
      mockResponse(500, "error"),
      mockResponse(200, '{"ok":true}'),
    ];
    const base = mockFetch(responses);
    const retryFetch = createRetryFetch(base, 3);

    const resp = await retryFetch("https://example.com", { method: "GET" });
    expect(resp.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry POST on 5xx", async () => {
    const responses = [mockResponse(500, "error")];
    const base = mockFetch(responses);
    const retryFetch = createRetryFetch(base, 3);

    const resp = await retryFetch("https://example.com", { method: "POST" });
    expect(resp.status).toBe(500);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it("respects Retry-After header as integer seconds", async () => {
    const responses = [
      mockResponse(429, "", { "Retry-After": "0" }),
      mockResponse(200, "ok"),
    ];
    const base = mockFetch(responses);
    const retryFetch = createRetryFetch(base, 1);

    const resp = await retryFetch("https://example.com");
    expect(resp.status).toBe(200);
  });

  it("respects Retry-After header as HTTP-date", async () => {
    const futureDate = new Date(Date.now() + 100).toUTCString();
    const responses = [
      mockResponse(429, "", { "Retry-After": futureDate }),
      mockResponse(200, "ok"),
    ];
    const base = mockFetch(responses);
    const retryFetch = createRetryFetch(base, 1);

    const resp = await retryFetch("https://example.com");
    expect(resp.status).toBe(200);
  });

  it("retries network errors for idempotent methods", async () => {
    let callCount = 0;
    const base: typeof globalThis.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) throw new TypeError("fetch failed");
      return mockResponse(200, "ok");
    });
    const retryFetch = createRetryFetch(base, 3);

    const resp = await retryFetch("https://example.com", { method: "GET" });
    expect(resp.status).toBe(200);
    expect(callCount).toBe(2);
  });

  it("does NOT retry network errors for POST", async () => {
    const base: typeof globalThis.fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const retryFetch = createRetryFetch(base, 3);

    await expect(retryFetch("https://example.com", { method: "POST" })).rejects.toThrow("fetch failed");
    expect(base).toHaveBeenCalledTimes(1);
  });

  it("respects AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();
    const responses = [
      mockResponse(429, "", { "Retry-After": "10" }),
      mockResponse(200, "ok"),
    ];
    const base = mockFetch(responses);
    const retryFetch = createRetryFetch(base, 3);

    await expect(
      retryFetch("https://example.com", { signal: controller.signal }),
    ).rejects.toThrow();
  });

  it("stops after maxRetries", async () => {
    const responses = [
      mockResponse(429, "", { "Retry-After": "0" }),
      mockResponse(429, "", { "Retry-After": "0" }),
    ];
    const base = mockFetch(responses);
    const retryFetch = createRetryFetch(base, 1);

    const resp = await retryFetch("https://example.com");
    expect(resp.status).toBe(429);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it("returns immediately for non-retryable status", async () => {
    const responses = [mockResponse(400, "bad request")];
    const base = mockFetch(responses);
    const retryFetch = createRetryFetch(base, 3);

    const resp = await retryFetch("https://example.com");
    expect(resp.status).toBe(400);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it("maxRetries=0 means no retries", async () => {
    const responses = [mockResponse(429, "")];
    const base = mockFetch(responses);
    const retryFetch = createRetryFetch(base, 0);

    const resp = await retryFetch("https://example.com");
    expect(resp.status).toBe(429);
    expect(base).toHaveBeenCalledTimes(1);
  });
});
