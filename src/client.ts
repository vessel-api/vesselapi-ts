import {
  DEFAULT_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
} from "./constants.js";
import {
  EmissionsService,
  LocationService,
  PortEventsService,
  PortsService,
  SearchService,
  VesselsService,
} from "./services.js";
import { createAuthFetch, createRetryFetch } from "./transport.js";

export interface ClientOptions {
  baseUrl?: string;
  maxRetries?: number;
  timeoutMs?: number;
  userAgent?: string;
  fetch?: typeof globalThis.fetch;
}

export class VesselClient {
  readonly vessels: VesselsService;
  readonly ports: PortsService;
  readonly portEvents: PortEventsService;
  readonly emissions: EmissionsService;
  readonly search: SearchService;
  readonly location: LocationService;

  constructor(apiKey?: string, options?: ClientOptions) {
    const resolvedKey = apiKey || process.env.VESSELAPI_API_KEY || "";
    if (!resolvedKey) {
      throw new Error("vesselapi: apiKey must not be empty — pass it directly or set VESSELAPI_API_KEY");
    }

    const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
    const maxRetries = Math.max(options?.maxRetries ?? DEFAULT_MAX_RETRIES, 0);
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;
    const baseFetch = options?.fetch ?? globalThis.fetch;

    // Compose transport: retry(auth(baseFetch))
    const withTimeout: typeof globalThis.fetch = (input, init) => {
      const signal = init?.signal;
      if (signal) {
        return baseFetch(input, init);
      }
      return baseFetch(input, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
    };
    const authFetch = createAuthFetch(withTimeout, resolvedKey, userAgent);
    const retryFetch = createRetryFetch(authFetch, maxRetries);

    this.vessels = new VesselsService(retryFetch, baseUrl);
    this.ports = new PortsService(retryFetch, baseUrl);
    this.portEvents = new PortEventsService(retryFetch, baseUrl);
    this.emissions = new EmissionsService(retryFetch, baseUrl);
    this.search = new SearchService(retryFetch, baseUrl);
    this.location = new LocationService(retryFetch, baseUrl);
  }
}
