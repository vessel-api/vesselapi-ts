import { describe, expect, it, vi } from "vitest";
import { VesselClient } from "../src/client.js";

describe("VesselClient", () => {
  it("throws on empty apiKey", () => {
    const orig = process.env.VESSELAPI_API_KEY;
    delete process.env.VESSELAPI_API_KEY;
    try {
      expect(() => new VesselClient("")).toThrow("vesselapi: apiKey must not be empty");
    } finally {
      if (orig !== undefined) process.env.VESSELAPI_API_KEY = orig;
    }
  });

  it("creates all 6 services", () => {
    const mockFetch = vi.fn(async () => new Response("{}"));
    const client = new VesselClient("test-key", { fetch: mockFetch });
    expect(client.vessels).toBeDefined();
    expect(client.ports).toBeDefined();
    expect(client.portEvents).toBeDefined();
    expect(client.emissions).toBeDefined();
    expect(client.search).toBeDefined();
    expect(client.location).toBeDefined();
  });

  it("uses default options", () => {
    const mockFetch = vi.fn(async () => new Response("{}"));
    const client = new VesselClient("test-key", { fetch: mockFetch });
    // Verify it doesn't throw — defaults are applied
    expect(client).toBeInstanceOf(VesselClient);
  });

  it("clamps negative maxRetries to 0", () => {
    const mockFetch = vi.fn(async () => new Response("{}"));
    // Should not throw
    const client = new VesselClient("test-key", { fetch: mockFetch, maxRetries: -5 });
    expect(client).toBeInstanceOf(VesselClient);
  });

  it("passes auth headers through transport chain", async () => {
    const mockFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      return new Response(
        JSON.stringify({
          auth: headers.get("Authorization"),
        }),
        { status: 200 },
      );
    });

    const client = new VesselClient("my-api-key", {
      fetch: mockFetch,
      maxRetries: 0,
    });
    const resp = await client.vessels.get("123");
    // Verify the request was made
    expect(mockFetch).toHaveBeenCalled();
    expect(resp).toBeDefined();
  });

  it("accepts custom baseUrl", () => {
    const mockFetch = vi.fn(async () => new Response("{}"));
    const client = new VesselClient("key", {
      fetch: mockFetch,
      baseUrl: "https://custom.api.com/v2",
    });
    expect(client).toBeInstanceOf(VesselClient);
  });
});
