const STATUS_TEXT: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

/**
 * Machine-readable identifier from the response body's `error.code` field.
 *
 * Branch on this rather than on the human-readable `message`, which is free-form
 * text and may be reworded at any time. Codes added by later API versions are
 * passed through unchanged, so treat an unrecognised value as "unknown" instead
 * of assuming the list is exhaustive.
 */
export type ErrorCode =
  | "resource_missing"
  | "invalid_parameter"
  | "invalid_mmsi"
  | "invalid_imo"
  | "invalid_coordinates"
  | "invalid_time_range"
  | "bounding_box_too_dense"
  | "missing_parameter"
  | "invalid_api_key"
  | "rate_limit_exceeded"
  | "forbidden"
  | "conflict"
  | "notification_inactive"
  | "prefill_pending"
  | "insufficient_credits"
  | "feature_not_available"
  | "endpoint_retired"
  | "internal_error"
  | "database_error"
  | "service_unavailable";

/** Category of the error, from the response body's `error.type` field. */
export type ErrorType =
  | "invalid_request_error"
  | "api_error"
  | "authentication_error"
  | "rate_limit_error"
  | "forbidden_error"
  | "not_found_error"
  | "conflict_error"
  | "payment_required_error"
  | "service_unavailable_error"
  | "gone_error";

export class VesselAPIError extends Error {
  readonly statusCode: number;
  readonly body: Uint8Array;

  constructor(statusCode: number, message: string, body: Uint8Array = new Uint8Array()) {
    super(`vesselapi: ${message} (status ${statusCode})`);
    this.name = "VesselAPIError";
    this.statusCode = statusCode;
    this.body = body;
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  get isAuthError(): boolean {
    return this.statusCode === 401;
  }

  /** True for 402 Payment Required — the account is out of satellite credits. */
  get isPaymentRequired(): boolean {
    return this.statusCode === 402;
  }

  /**
   * True for 403 Forbidden — the API key is suspended for sustained quota abuse,
   * or the endpoint is not part of the caller's plan. Read `code` to tell those apart.
   */
  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  /**
   * The API's `error.code`, or undefined when the response carried none.
   * Stable across message rewordings, so prefer it for branching.
   */
  get code(): ErrorCode | undefined {
    return parseErrorDetail(this.body).code;
  }

  /** The API's `error.type`, or undefined when the response carried none. */
  get type(): ErrorType | undefined {
    return parseErrorDetail(this.body).type;
  }
}

export class VesselAuthError extends VesselAPIError {
  constructor(statusCode: number, message: string, body?: Uint8Array) {
    super(statusCode, message, body);
    this.name = "VesselAuthError";
  }
}

export class VesselNotFoundError extends VesselAPIError {
  constructor(statusCode: number, message: string, body?: Uint8Array) {
    super(statusCode, message, body);
    this.name = "VesselNotFoundError";
  }
}

export class VesselRateLimitError extends VesselAPIError {
  constructor(statusCode: number, message: string, body?: Uint8Array) {
    super(statusCode, message, body);
    this.name = "VesselRateLimitError";
  }
}

/**
 * 402 Payment Required — a satellite position was requested with no satellite
 * credits left and no stored position to fall back on. Top up credits, or retry
 * without the satellite fallback.
 */
export class VesselPaymentRequiredError extends VesselAPIError {
  constructor(statusCode: number, message: string, body?: Uint8Array) {
    super(statusCode, message, body);
    this.name = "VesselPaymentRequiredError";
  }
}

/**
 * 403 Forbidden — the API key is suspended for sustained quota abuse (see the
 * Retry-After header), or the feature is not on the caller's plan
 * (`code === "feature_not_available"`).
 */
export class VesselForbiddenError extends VesselAPIError {
  constructor(statusCode: number, message: string, body?: Uint8Array) {
    super(statusCode, message, body);
    this.name = "VesselForbiddenError";
  }
}

export class VesselServerError extends VesselAPIError {
  constructor(statusCode: number, message: string, body?: Uint8Array) {
    super(statusCode, message, body);
    this.name = "VesselServerError";
  }
}

function statusText(code: number): string {
  return STATUS_TEXT[code] ?? `HTTP ${code}`;
}

function getNestedString(data: unknown, ...keys: string[]): string | undefined {
  let current: unknown = data;
  for (const key of keys) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}

/** Pulls `error.code` / `error.type` out of a raw error body. */
function parseErrorDetail(body: Uint8Array): { code?: ErrorCode; type?: ErrorType } {
  if (body.length === 0) return {};
  try {
    const data: unknown = JSON.parse(new TextDecoder().decode(body));
    return {
      code: getNestedString(data, "error", "code") as ErrorCode | undefined,
      type: getNestedString(data, "error", "type") as ErrorType | undefined,
    };
  } catch {
    // JSON parse failed — no structured detail available.
    return {};
  }
}

export function errorFromResponse(status: number, body: Uint8Array): void {
  if (status >= 200 && status < 300) return;

  let msg = statusText(status);
  if (body.length > 0) {
    try {
      const text = new TextDecoder().decode(body);
      const data: unknown = JSON.parse(text);
      const nested = getNestedString(data, "error", "message");
      if (nested) {
        msg = nested;
      } else {
        const flat = getNestedString(data, "message");
        if (flat) msg = flat;
      }
    } catch {
      // JSON parse failed — keep HTTP status text.
    }
  }

  if (status === 401) throw new VesselAuthError(status, msg, body);
  if (status === 402) throw new VesselPaymentRequiredError(status, msg, body);
  if (status === 403) throw new VesselForbiddenError(status, msg, body);
  if (status === 404) throw new VesselNotFoundError(status, msg, body);
  if (status === 429) throw new VesselRateLimitError(status, msg, body);
  if (status >= 500) throw new VesselServerError(status, msg, body);
  throw new VesselAPIError(status, msg, body);
}
