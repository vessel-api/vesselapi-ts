import { describe, expect, it } from "vitest";
import {
  VesselAPIError,
  VesselAuthError,
  VesselNotFoundError,
  VesselRateLimitError,
  VesselServerError,
  errorFromResponse,
} from "../src/errors.js";

const encode = (s: string) => new TextEncoder().encode(s);

describe("errorFromResponse", () => {
  it("does not throw on 2xx", () => {
    expect(() => errorFromResponse(200, new Uint8Array())).not.toThrow();
    expect(() => errorFromResponse(201, new Uint8Array())).not.toThrow();
    expect(() => errorFromResponse(204, new Uint8Array())).not.toThrow();
  });

  it("throws VesselAuthError on 401", () => {
    expect(() => errorFromResponse(401, new Uint8Array())).toThrow(VesselAuthError);
  });

  it("throws VesselNotFoundError on 404", () => {
    expect(() => errorFromResponse(404, new Uint8Array())).toThrow(VesselNotFoundError);
  });

  it("throws VesselRateLimitError on 429", () => {
    expect(() => errorFromResponse(429, new Uint8Array())).toThrow(VesselRateLimitError);
  });

  it("throws VesselServerError on 5xx", () => {
    expect(() => errorFromResponse(500, new Uint8Array())).toThrow(VesselServerError);
    expect(() => errorFromResponse(503, new Uint8Array())).toThrow(VesselServerError);
  });

  it("throws VesselAPIError on other non-2xx", () => {
    expect(() => errorFromResponse(400, new Uint8Array())).toThrow(VesselAPIError);
    expect(() => errorFromResponse(403, new Uint8Array())).toThrow(VesselAPIError);
  });

  it('parses {"error":{"message":"..."}} shape', () => {
    const body = encode(JSON.stringify({ error: { message: "rate limit exceeded" } }));
    try {
      errorFromResponse(429, body);
    } catch (err) {
      expect(err).toBeInstanceOf(VesselRateLimitError);
      expect((err as VesselAPIError).message).toBe("vesselapi: rate limit exceeded (status 429)");
    }
  });

  it('parses {"message":"..."} shape', () => {
    const body = encode(JSON.stringify({ message: "not found" }));
    try {
      errorFromResponse(404, body);
    } catch (err) {
      expect(err).toBeInstanceOf(VesselNotFoundError);
      expect((err as VesselAPIError).message).toBe("vesselapi: not found (status 404)");
    }
  });

  it("falls back to HTTP status text for unparseable body", () => {
    const body = encode("not json");
    try {
      errorFromResponse(500, body);
    } catch (err) {
      expect(err).toBeInstanceOf(VesselServerError);
      expect((err as VesselAPIError).message).toBe("vesselapi: Internal Server Error (status 500)");
    }
  });

  it("falls back to HTTP status text for empty body", () => {
    try {
      errorFromResponse(401, new Uint8Array());
    } catch (err) {
      expect((err as VesselAPIError).message).toBe("vesselapi: Unauthorized (status 401)");
    }
  });

  it("preserves raw body bytes", () => {
    const body = encode('{"error":{"message":"oops"}}');
    try {
      errorFromResponse(500, body);
    } catch (err) {
      expect((err as VesselAPIError).body).toEqual(body);
    }
  });

  it("all messages have vesselapi: prefix", () => {
    try {
      errorFromResponse(400, new Uint8Array());
    } catch (err) {
      expect((err as VesselAPIError).message).toMatch(/^vesselapi:/);
    }
  });
});

describe("VesselAPIError properties", () => {
  it("isNotFound is true for 404", () => {
    const err = new VesselAPIError(404, "not found");
    expect(err.isNotFound).toBe(true);
    expect(err.isRateLimited).toBe(false);
    expect(err.isAuthError).toBe(false);
  });

  it("isRateLimited is true for 429", () => {
    const err = new VesselAPIError(429, "rate limited");
    expect(err.isRateLimited).toBe(true);
  });

  it("isAuthError is true for 401", () => {
    const err = new VesselAPIError(401, "auth error");
    expect(err.isAuthError).toBe(true);
  });
});

describe("error class hierarchy", () => {
  it("subclasses are instanceof VesselAPIError", () => {
    expect(new VesselAuthError(401, "x")).toBeInstanceOf(VesselAPIError);
    expect(new VesselNotFoundError(404, "x")).toBeInstanceOf(VesselAPIError);
    expect(new VesselRateLimitError(429, "x")).toBeInstanceOf(VesselAPIError);
    expect(new VesselServerError(500, "x")).toBeInstanceOf(VesselAPIError);
  });

  it("subclasses are instanceof Error", () => {
    expect(new VesselAuthError(401, "x")).toBeInstanceOf(Error);
  });
});
