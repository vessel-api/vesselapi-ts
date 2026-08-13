import { describe, expect, it } from "vitest";
import {
  VesselAPIError,
  VesselAuthError,
  VesselForbiddenError,
  VesselNotFoundError,
  VesselPaymentRequiredError,
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

describe("payment required (402)", () => {
  it("throws VesselPaymentRequiredError on 402", () => {
    expect(() => errorFromResponse(402, new Uint8Array())).toThrow(VesselPaymentRequiredError);
    expect(() => errorFromResponse(402, new Uint8Array())).toThrow(VesselAPIError);
  });

  it("exposes the insufficient_credits code and payment_required_error type", () => {
    const body = encode(
      JSON.stringify({
        error: {
          code: "insufficient_credits",
          message: "insufficient satellite credits",
          type: "payment_required_error",
        },
      }),
    );
    try {
      errorFromResponse(402, body);
      expect.unreachable("expected errorFromResponse to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(VesselPaymentRequiredError);
      const e = err as VesselAPIError;
      expect(e.code).toBe("insufficient_credits");
      expect(e.type).toBe("payment_required_error");
      expect(e.isPaymentRequired).toBe(true);
      expect(e.isForbidden).toBe(false);
      expect(e.name).toBe("VesselPaymentRequiredError");
      expect(e.message).toBe("vesselapi: insufficient satellite credits (status 402)");
    }
  });

  it("falls back to HTTP status text for an empty 402 body", () => {
    try {
      errorFromResponse(402, new Uint8Array());
    } catch (err) {
      const e = err as VesselAPIError;
      expect(e.message).toBe("vesselapi: Payment Required (status 402)");
      expect(e.code).toBeUndefined();
      expect(e.type).toBeUndefined();
    }
  });
});

describe("forbidden (403)", () => {
  it("throws VesselForbiddenError on 403", () => {
    expect(() => errorFromResponse(403, new Uint8Array())).toThrow(VesselForbiddenError);
    expect(() => errorFromResponse(403, new Uint8Array())).toThrow(VesselAPIError);
  });

  it("exposes feature_not_available for a plan restriction", () => {
    const body = encode(
      JSON.stringify({
        error: {
          code: "feature_not_available",
          message: 'this feature is not available on the "free" plan',
          type: "forbidden_error",
        },
      }),
    );
    try {
      errorFromResponse(403, body);
      expect.unreachable("expected errorFromResponse to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(VesselForbiddenError);
      const e = err as VesselAPIError;
      expect(e.code).toBe("feature_not_available");
      expect(e.type).toBe("forbidden_error");
      expect(e.isForbidden).toBe(true);
      expect(e.isPaymentRequired).toBe(false);
      expect(e.isAuthError).toBe(false);
      expect(e.name).toBe("VesselForbiddenError");
    }
  });

  it("exposes forbidden for a suspended key", () => {
    const body = encode(
      JSON.stringify({
        error: {
          code: "forbidden",
          message: "api key temporarily suspended",
          type: "forbidden_error",
        },
      }),
    );
    try {
      errorFromResponse(403, body);
    } catch (err) {
      const e = err as VesselAPIError;
      expect(e.code).toBe("forbidden");
      expect(e.isRateLimited).toBe(false);
    }
  });

  it("keeps 402 and 403 distinct", () => {
    expect(() => errorFromResponse(403, new Uint8Array())).not.toThrow(VesselPaymentRequiredError);
    expect(() => errorFromResponse(402, new Uint8Array())).not.toThrow(VesselForbiddenError);
  });
});

describe("error code / type on existing statuses", () => {
  it("parses code and type for 401/404/429 without changing their classes", () => {
    const cases: [number, string, string, new (...args: never[]) => VesselAPIError][] = [
      [401, "invalid_api_key", "authentication_error", VesselAuthError],
      [404, "resource_missing", "not_found_error", VesselNotFoundError],
      [429, "rate_limit_exceeded", "rate_limit_error", VesselRateLimitError],
    ];
    for (const [status, code, type, cls] of cases) {
      const body = encode(JSON.stringify({ error: { code, message: "boom", type } }));
      try {
        errorFromResponse(status, body);
        expect.unreachable("expected errorFromResponse to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(cls);
        const e = err as VesselAPIError;
        expect(e.code).toBe(code);
        expect(e.type).toBe(type);
        expect(e.isPaymentRequired).toBe(false);
        expect(e.isForbidden).toBe(false);
      }
    }
  });

  it("leaves code and type undefined for an unparseable body", () => {
    const err = new VesselAPIError(500, "boom", encode("not json"));
    expect(err.code).toBeUndefined();
    expect(err.type).toBeUndefined();
  });

  it("leaves code and type undefined when the body has no error object", () => {
    const err = new VesselAPIError(400, "boom", encode(JSON.stringify({ message: "boom" })));
    expect(err.code).toBeUndefined();
    expect(err.type).toBeUndefined();
  });
});
