const STATUS_TEXT: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

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
  if (status === 404) throw new VesselNotFoundError(status, msg, body);
  if (status === 429) throw new VesselRateLimitError(status, msg, body);
  if (status >= 500) throw new VesselServerError(status, msg, body);
  throw new VesselAPIError(status, msg, body);
}
