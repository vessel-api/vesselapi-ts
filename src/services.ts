import { VesselAPIError, errorFromResponse } from "./errors.js";
import { PageIterator } from "./iterator.js";
import type {
  DGPSStation,
  DGPSStationsWithinLocationResponse,
  FindDGPSStationsResponse,
  FindLightAidsResponse,
  FindMODUsResponse,
  FindPortsResponse,
  FindRadioBeaconsResponse,
  FindVesselsResponse,
  LightAid,
  LightAidsWithinLocationResponse,
  MODU,
  MODUsWithinLocationResponse,
  MarineCasualtiesResponse,
  MarineCasualty,
  Port,
  PortEvent,
  PortEventResponse,
  PortEventsResponse,
  PortInboundResponse,
  PortResponse,
  PortsWithinLocationResponse,
  RadioBeacon,
  RadioBeaconsWithinLocationResponse,
  Vessel,
  VesselEmission,
  VesselEmissionsResponse,
  VesselETA,
  VesselETAResponse,
  VesselPosition,
  VesselPositionResponse,
  VesselPositionsResponse,
  VesselResponse,
  VesselsWithinLocationResponse,
} from "./models.js";

type FetchFn = typeof globalThis.fetch;

/**
 * A filter the API declares as repeatable (`collectionFormat: multi`).
 *
 * Pass a single string for one value, or an array to match several — the array
 * is sent as a repeated query parameter, not a comma-joined string.
 */
export type MultiFilter = string | string[];

/**
 * Which identifier a vessel lookup is keyed on. Defaults to `"imo"`.
 *
 * The API rejects anything else, so this is a union rather than a string: a
 * typo such as `"IMO"` fails to compile instead of returning HTTP 400.
 */
export type IdType = "imo" | "mmsi";

/** Which port events to return. Omit to get both arrivals and departures. */
export type EventType = "arrival" | "departure" | "all";

/** Sort direction for endpoints that accept one. */
export type SortOrder = "asc" | "desc";

/**
 * Drops null/undefined params and coerces the rest to strings.
 *
 * Array values are kept as arrays so `request()` can repeat the parameter
 * (Swagger `collectionFormat: multi`); null/undefined elements are dropped and
 * an array that ends up empty is omitted entirely.
 */
function stripNone(params: Record<string, unknown>): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      const items = v.filter((e) => e != null).map((e) => String(e));
      if (items.length > 0) result[k] = items;
      continue;
    }
    result[k] = String(v);
  }
  return result;
}

async function request<T>(
  fetchFn: FetchFn,
  baseUrl: string,
  path: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const url = new URL(baseUrl + path);
  if (params) {
    const cleaned = stripNone(params);
    for (const [k, v] of Object.entries(cleaned)) {
      if (Array.isArray(v)) {
        // Repeat the parameter once per element (?filter.flag=PA&filter.flag=LR).
        for (const item of v) url.searchParams.append(k, item);
      } else {
        url.searchParams.set(k, v);
      }
    }
  }
  const response = await fetchFn(url.toString());
  const body = new Uint8Array(await response.arrayBuffer());
  errorFromResponse(response.status, body);
  if (body.length === 0) {
    throw new VesselAPIError(response.status, "unexpected empty response", body);
  }
  const text = new TextDecoder().decode(body);
  return JSON.parse(text) as T;
}

// ===================================================================
// VesselsService
// ===================================================================

export class VesselsService {
  constructor(
    private readonly fetchFn: FetchFn,
    private readonly baseUrl: string,
  ) {}

  async get(vesselId: string, options?: { filterIdType?: IdType }): Promise<VesselResponse> {
    return request(this.fetchFn, this.baseUrl, `/vessel/${encodeURIComponent(vesselId)}`, {
      "filter.idType": options?.filterIdType ?? "imo",
    });
  }

  async position(
    vesselId: string,
    options?: {
      filterIdType?: IdType;
      /** Enable satellite AIS fallback. Defaults server-side to false. */
      filterSat?: boolean;
    },
  ): Promise<VesselPositionResponse> {
    return request(this.fetchFn, this.baseUrl, `/vessel/${encodeURIComponent(vesselId)}/position`, {
      "filter.idType": options?.filterIdType ?? "imo",
      "filter.sat": options?.filterSat,
    });
  }

  async casualties(
    vesselId: string,
    options?: { filterIdType?: IdType; paginationLimit?: number; paginationNextToken?: string },
  ): Promise<MarineCasualtiesResponse> {
    return request(this.fetchFn, this.baseUrl, `/vessel/${encodeURIComponent(vesselId)}/casualties`, {
      "filter.idType": options?.filterIdType ?? "imo",
      "pagination.limit": options?.paginationLimit,
      "pagination.nextToken": options?.paginationNextToken,
    });
  }


  async emissions(
    vesselId: string,
    options?: { filterIdType?: IdType; paginationLimit?: number; paginationNextToken?: string },
  ): Promise<VesselEmissionsResponse> {
    return request(this.fetchFn, this.baseUrl, `/vessel/${encodeURIComponent(vesselId)}/emissions`, {
      "filter.idType": options?.filterIdType ?? "imo",
      "pagination.limit": options?.paginationLimit,
      "pagination.nextToken": options?.paginationNextToken,
    });
  }

  async eta(vesselId: string, options?: { filterIdType?: IdType }): Promise<VesselETAResponse> {
    return request(this.fetchFn, this.baseUrl, `/vessel/${encodeURIComponent(vesselId)}/eta`, {
      "filter.idType": options?.filterIdType ?? "imo",
    });
  }




  async positions(options: {
    /**
     * MMSI or IMO number(s). Required. Pass a comma-separated string, or an
     * array to repeat the parameter.
     */
    filterIds: MultiFilter;
    filterIdType?: IdType;
    timeFrom?: string;
    timeTo?: string;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<VesselPositionsResponse> {
    return request(this.fetchFn, this.baseUrl, "/vessels/positions", {
      "filter.idType": options.filterIdType ?? "imo",
      "filter.ids": options.filterIds,
      "time.from": options.timeFrom,
      "time.to": options.timeTo,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  // --- Iterators ---

  allCasualties(
    vesselId: string,
    options?: { filterIdType?: IdType; paginationLimit?: number },
  ): PageIterator<MarineCasualty> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.casualties(vesselId, {
        filterIdType: options?.filterIdType,
        paginationLimit: options?.paginationLimit,
        paginationNextToken: token,
      });
      token = resp.nextToken ?? undefined;
      return { items: resp.casualties ?? [], nextToken: resp.nextToken };
    });
  }

  allEmissions(
    vesselId: string,
    options?: { filterIdType?: IdType; paginationLimit?: number },
  ): PageIterator<VesselEmission> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.emissions(vesselId, {
        filterIdType: options?.filterIdType,
        paginationLimit: options?.paginationLimit,
        paginationNextToken: token,
      });
      token = resp.nextToken ?? undefined;
      return { items: resp.emissions ?? [], nextToken: resp.nextToken };
    });
  }

  allPositions(options: {
    /**
     * MMSI or IMO number(s). Required. Pass a comma-separated string, or an
     * array to repeat the parameter.
     */
    filterIds: MultiFilter;
    filterIdType?: IdType;
    timeFrom?: string;
    timeTo?: string;
    paginationLimit?: number;
  }): PageIterator<VesselPosition> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.positions({
        filterIdType: options.filterIdType,
        filterIds: options.filterIds,
        timeFrom: options.timeFrom,
        timeTo: options.timeTo,
        paginationLimit: options.paginationLimit,
        paginationNextToken: token,
      });
      token = resp.nextToken ?? undefined;
      return { items: resp.vesselPositions ?? [], nextToken: resp.nextToken };
    });
  }

}

// ===================================================================
// PortsService
// ===================================================================

export class PortsService {
  constructor(
    private readonly fetchFn: FetchFn,
    private readonly baseUrl: string,
  ) {}

  async get(unlocode: string): Promise<PortResponse> {
    return request(this.fetchFn, this.baseUrl, `/port/${encodeURIComponent(unlocode)}`);
  }

  async inbound(
    unlocode: string,
    options?: {
      /** Defaults server-side to now if omitted. */
      filterEtaFrom?: string;
      /** Defaults server-side to 72 hours ahead if omitted. */
      filterEtaTo?: string;
      timeFrom?: string;
      timeTo?: string;
      paginationLimit?: number;
      paginationNextToken?: string;
    },
  ): Promise<PortInboundResponse> {
    return request(this.fetchFn, this.baseUrl, `/port/${encodeURIComponent(unlocode)}/inbound`, {
      "filter.etaFrom": options?.filterEtaFrom,
      "filter.etaTo": options?.filterEtaTo,
      "time.from": options?.timeFrom,
      "time.to": options?.timeTo,
      "pagination.limit": options?.paginationLimit,
      "pagination.nextToken": options?.paginationNextToken,
    });
  }

  allInbound(
    unlocode: string,
    options?: {
      /** Defaults server-side to now if omitted. */
      filterEtaFrom?: string;
      /** Defaults server-side to 72 hours ahead if omitted. */
      filterEtaTo?: string;
      timeFrom?: string;
      timeTo?: string;
      paginationLimit?: number;
    },
  ): PageIterator<VesselETA> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.inbound(unlocode, { ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.vesselETAs ?? [], nextToken: resp.nextToken };
    });
  }
}

// ===================================================================
// PortEventsService
// ===================================================================

export class PortEventsService {
  constructor(
    private readonly fetchFn: FetchFn,
    private readonly baseUrl: string,
  ) {}

  async list(options?: {
    timeFrom?: string;
    timeTo?: string;
    filterCountry?: string;
    filterUnlocode?: string;
    filterEventType?: EventType;
    filterVesselName?: string;
    filterPortName?: string;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<PortEventsResponse> {
    return request(this.fetchFn, this.baseUrl, "/portevents", {
      "time.from": options?.timeFrom,
      "time.to": options?.timeTo,
      "filter.country": options?.filterCountry,
      "filter.unlocode": options?.filterUnlocode,
      "filter.eventType": options?.filterEventType,
      "filter.vesselName": options?.filterVesselName,
      "filter.portName": options?.filterPortName,
      "pagination.limit": options?.paginationLimit,
      "pagination.nextToken": options?.paginationNextToken,
    });
  }

  async byPort(
    unlocode: string,
    options?: {
      /** RFC3339. Defaults server-side to 2 hours ago. */
      timeFrom?: string;
      /** RFC3339. Defaults server-side to now. */
      timeTo?: string;
      paginationLimit?: number;
      paginationNextToken?: string;
    },
  ): Promise<PortEventsResponse> {
    return request(this.fetchFn, this.baseUrl, `/portevents/port/${encodeURIComponent(unlocode)}`, {
      "time.from": options?.timeFrom,
      "time.to": options?.timeTo,
      "pagination.limit": options?.paginationLimit,
      "pagination.nextToken": options?.paginationNextToken,
    });
  }

  async byPorts(options: {
    filterPortName: string;
    /** RFC3339. Defaults server-side to 2 hours ago. */
    timeFrom?: string;
    /** RFC3339. Defaults server-side to now. */
    timeTo?: string;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<PortEventsResponse> {
    return request(this.fetchFn, this.baseUrl, "/portevents/ports", {
      "filter.portName": options.filterPortName,
      "time.from": options.timeFrom,
      "time.to": options.timeTo,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  async byVessel(
    vesselId: string,
    options?: {
      filterIdType?: IdType;
      filterEventType?: EventType;
      filterSortOrder?: SortOrder;
      timeFrom?: string;
      timeTo?: string;
      paginationLimit?: number;
      paginationNextToken?: string;
    },
  ): Promise<PortEventsResponse> {
    return request(this.fetchFn, this.baseUrl, `/portevents/vessel/${encodeURIComponent(vesselId)}`, {
      "filter.idType": options?.filterIdType ?? "imo",
      "filter.eventType": options?.filterEventType,
      "filter.sortOrder": options?.filterSortOrder,
      "time.from": options?.timeFrom,
      "time.to": options?.timeTo,
      "pagination.limit": options?.paginationLimit,
      "pagination.nextToken": options?.paginationNextToken,
    });
  }

  async lastByVessel(
    vesselId: string,
    options?: { filterIdType?: IdType },
  ): Promise<PortEventResponse> {
    return request(this.fetchFn, this.baseUrl, `/portevents/vessel/${encodeURIComponent(vesselId)}/last`, {
      "filter.idType": options?.filterIdType ?? "imo",
    });
  }

  async byVessels(options: {
    filterVesselName: string;
    /** RFC3339. Defaults server-side to 2 hours ago. */
    timeFrom?: string;
    /** RFC3339. Defaults server-side to now. */
    timeTo?: string;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<PortEventsResponse> {
    return request(this.fetchFn, this.baseUrl, "/portevents/vessels", {
      "filter.vesselName": options.filterVesselName,
      "time.from": options.timeFrom,
      "time.to": options.timeTo,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  // --- Iterators ---

  listAll(options?: {
    timeFrom?: string;
    timeTo?: string;
    filterCountry?: string;
    filterUnlocode?: string;
    filterEventType?: EventType;
    filterVesselName?: string;
    filterPortName?: string;
    paginationLimit?: number;
  }): PageIterator<PortEvent> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.list({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.portEvents ?? [], nextToken: resp.nextToken };
    });
  }

  allByPort(
    unlocode: string,
    options?: {
      /** RFC3339. Defaults server-side to 2 hours ago. */
      timeFrom?: string;
      /** RFC3339. Defaults server-side to now. */
      timeTo?: string;
      paginationLimit?: number;
    },
  ): PageIterator<PortEvent> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.byPort(unlocode, { ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.portEvents ?? [], nextToken: resp.nextToken };
    });
  }

  allByPorts(options: {
    filterPortName: string;
    /** RFC3339. Defaults server-side to 2 hours ago. */
    timeFrom?: string;
    /** RFC3339. Defaults server-side to now. */
    timeTo?: string;
    paginationLimit?: number;
  }): PageIterator<PortEvent> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.byPorts({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.portEvents ?? [], nextToken: resp.nextToken };
    });
  }

  allByVessel(
    vesselId: string,
    options?: {
      filterIdType?: IdType;
      filterEventType?: EventType;
      filterSortOrder?: SortOrder;
      timeFrom?: string;
      timeTo?: string;
      paginationLimit?: number;
    },
  ): PageIterator<PortEvent> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.byVessel(vesselId, { ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.portEvents ?? [], nextToken: resp.nextToken };
    });
  }

  allByVessels(options: {
    filterVesselName: string;
    /** RFC3339. Defaults server-side to 2 hours ago. */
    timeFrom?: string;
    /** RFC3339. Defaults server-side to now. */
    timeTo?: string;
    paginationLimit?: number;
  }): PageIterator<PortEvent> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.byVessels({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.portEvents ?? [], nextToken: resp.nextToken };
    });
  }
}

// ===================================================================
// EmissionsService
// ===================================================================

export class EmissionsService {
  constructor(
    private readonly fetchFn: FetchFn,
    private readonly baseUrl: string,
  ) {}

  async list(options?: {
    filterPeriod?: number;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<VesselEmissionsResponse> {
    return request(this.fetchFn, this.baseUrl, "/emissions", {
      "filter.period": options?.filterPeriod,
      "pagination.limit": options?.paginationLimit,
      "pagination.nextToken": options?.paginationNextToken,
    });
  }

  listAll(options?: {
    filterPeriod?: number;
    paginationLimit?: number;
  }): PageIterator<VesselEmission> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.list({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.emissions ?? [], nextToken: resp.nextToken };
    });
  }
}

// ===================================================================
// SearchService
// ===================================================================

export class SearchService {
  constructor(
    private readonly fetchFn: FetchFn,
    private readonly baseUrl: string,
  ) {}

  async vessels(options?: {
    /**
     * Unified search across IMO, MMSI, ENI, callsign and vessel name. One value
     * can return more than one vessel; `_meta.matchedOn` names the fields that
     * matched. Name and callsign accept SQL LIKE wildcards (% and _).
     * Can be combined with the filter* options.
     */
    q?: string;
    filterName?: string;
    filterImo?: number | string;
    filterMmsi?: number | string;
    /** European Number of Identification. Leading zeros optional. */
    filterEni?: string;
    /** ISO 2-letter flag state code(s). Pass an array to match several. */
    filterFlag?: MultiFilter;
    /** Vessel type classification(s). Pass an array to match several. */
    filterVesselType?: MultiFilter;
    filterCallsign?: string;
    filterYearBuiltMin?: number;
    filterYearBuiltMax?: number;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<FindVesselsResponse> {
    return request(this.fetchFn, this.baseUrl, "/search/vessels", {
      q: options?.q,
      "filter.name": options?.filterName,
      "filter.imo": options?.filterImo,
      "filter.mmsi": options?.filterMmsi,
      "filter.eni": options?.filterEni,
      "filter.flag": options?.filterFlag,
      "filter.vesselType": options?.filterVesselType,
      "filter.callsign": options?.filterCallsign,
      "filter.yearBuiltMin": options?.filterYearBuiltMin,
      "filter.yearBuiltMax": options?.filterYearBuiltMax,
      "pagination.limit": options?.paginationLimit,
      "pagination.nextToken": options?.paginationNextToken,
    });
  }

  async ports(options?: {
    filterName?: string;
    /** ISO 2-letter country code(s) or name(s). Pass an array to match several. */
    filterCountry?: MultiFilter;
    /** Port type classification(s). Pass an array to match several. */
    filterPortType?: MultiFilter;
    /** Port size classification(s). Pass an array to match several. */
    filterSize?: MultiFilter;
    filterRegion?: string;
    /** Harbor size classification(s). Pass an array to match several. */
    filterHarborSize?: MultiFilter;
    /** Primary harbor use(s). Pass an array to match several. */
    filterHarborUse?: MultiFilter;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<FindPortsResponse> {
    return request(this.fetchFn, this.baseUrl, "/search/ports", {
      "filter.name": options?.filterName,
      "filter.country": options?.filterCountry,
      "filter.type": options?.filterPortType,
      "filter.size": options?.filterSize,
      "filter.region": options?.filterRegion,
      "filter.harborSize": options?.filterHarborSize,
      "filter.harborUse": options?.filterHarborUse,
      "pagination.limit": options?.paginationLimit,
      "pagination.nextToken": options?.paginationNextToken,
    });
  }

  async dgps(options: {
    filterName: string;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<FindDGPSStationsResponse> {
    return request(this.fetchFn, this.baseUrl, "/search/dgps", {
      "filter.name": options.filterName,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  async lightAids(options: {
    filterName: string;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<FindLightAidsResponse> {
    return request(this.fetchFn, this.baseUrl, "/search/lightaids", {
      "filter.name": options.filterName,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  async modus(options: {
    filterName: string;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<FindMODUsResponse> {
    return request(this.fetchFn, this.baseUrl, "/search/modus", {
      "filter.name": options.filterName,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  async radioBeacons(options: {
    filterName: string;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<FindRadioBeaconsResponse> {
    return request(this.fetchFn, this.baseUrl, "/search/radiobeacons", {
      "filter.name": options.filterName,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  // --- Iterators ---

  allVessels(options?: {
    /** Unified search across IMO, MMSI, ENI, callsign and vessel name. */
    q?: string;
    filterName?: string;
    filterImo?: number | string;
    filterMmsi?: number | string;
    /** European Number of Identification. Leading zeros optional. */
    filterEni?: string;
    /** ISO 2-letter flag state code(s). Pass an array to match several. */
    filterFlag?: MultiFilter;
    /** Vessel type classification(s). Pass an array to match several. */
    filterVesselType?: MultiFilter;
    filterCallsign?: string;
    filterYearBuiltMin?: number;
    filterYearBuiltMax?: number;
    paginationLimit?: number;
  }): PageIterator<Vessel> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.vessels({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.vessels ?? [], nextToken: resp.nextToken };
    });
  }

  allPorts(options?: {
    filterName?: string;
    /** ISO 2-letter country code(s) or name(s). Pass an array to match several. */
    filterCountry?: MultiFilter;
    /** Port type classification(s). Pass an array to match several. */
    filterPortType?: MultiFilter;
    /** Port size classification(s). Pass an array to match several. */
    filterSize?: MultiFilter;
    filterRegion?: string;
    /** Harbor size classification(s). Pass an array to match several. */
    filterHarborSize?: MultiFilter;
    /** Primary harbor use(s). Pass an array to match several. */
    filterHarborUse?: MultiFilter;
    paginationLimit?: number;
  }): PageIterator<Port> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.ports({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.ports ?? [], nextToken: resp.nextToken };
    });
  }

  allDgps(options: {
    filterName: string;
    paginationLimit?: number;
  }): PageIterator<DGPSStation> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.dgps({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.dgpsStations ?? [], nextToken: resp.nextToken };
    });
  }

  allLightAids(options: {
    filterName: string;
    paginationLimit?: number;
  }): PageIterator<LightAid> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.lightAids({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.lightAids ?? [], nextToken: resp.nextToken };
    });
  }

  allModus(options: {
    filterName: string;
    paginationLimit?: number;
  }): PageIterator<MODU> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.modus({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.modus ?? [], nextToken: resp.nextToken };
    });
  }

  allRadioBeacons(options: {
    filterName: string;
    paginationLimit?: number;
  }): PageIterator<RadioBeacon> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.radioBeacons({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.radioBeacons ?? [], nextToken: resp.nextToken };
    });
  }
}

// ===================================================================
// LocationService
// ===================================================================

export class LocationService {
  constructor(
    private readonly fetchFn: FetchFn,
    private readonly baseUrl: string,
  ) {}

  // --- Vessels ---

  async vesselsBoundingBox(options: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    timeFrom?: string;
    timeTo?: string;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<VesselsWithinLocationResponse> {
    return request(this.fetchFn, this.baseUrl, "/location/vessels/bounding-box", {
      "filter.latBottom": options.latMin,
      "filter.latTop": options.latMax,
      "filter.lonLeft": options.lonMin,
      "filter.lonRight": options.lonMax,
      "time.from": options.timeFrom,
      "time.to": options.timeTo,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  async vesselsRadius(options: {
    latitude: number;
    longitude: number;
    radius: number;
    timeFrom?: string;
    timeTo?: string;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<VesselsWithinLocationResponse> {
    return request(this.fetchFn, this.baseUrl, "/location/vessels/radius", {
      "filter.latitude": options.latitude,
      "filter.longitude": options.longitude,
      "filter.radius": options.radius,
      "time.from": options.timeFrom,
      "time.to": options.timeTo,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  // --- Ports ---

  async portsBoundingBox(options: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<PortsWithinLocationResponse> {
    return request(this.fetchFn, this.baseUrl, "/location/ports/bounding-box", {
      "filter.latBottom": options.latMin,
      "filter.latTop": options.latMax,
      "filter.lonLeft": options.lonMin,
      "filter.lonRight": options.lonMax,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  async portsRadius(options: {
    latitude: number;
    longitude: number;
    radius: number;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<PortsWithinLocationResponse> {
    return request(this.fetchFn, this.baseUrl, "/location/ports/radius", {
      "filter.latitude": options.latitude,
      "filter.longitude": options.longitude,
      "filter.radius": options.radius,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  // --- DGPS ---

  async dgpsBoundingBox(options: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<DGPSStationsWithinLocationResponse> {
    return request(this.fetchFn, this.baseUrl, "/location/dgps/bounding-box", {
      "filter.latBottom": options.latMin,
      "filter.latTop": options.latMax,
      "filter.lonLeft": options.lonMin,
      "filter.lonRight": options.lonMax,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  async dgpsRadius(options: {
    latitude: number;
    longitude: number;
    radius: number;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<DGPSStationsWithinLocationResponse> {
    return request(this.fetchFn, this.baseUrl, "/location/dgps/radius", {
      "filter.latitude": options.latitude,
      "filter.longitude": options.longitude,
      "filter.radius": options.radius,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  // --- Light Aids ---

  async lightAidsBoundingBox(options: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<LightAidsWithinLocationResponse> {
    return request(this.fetchFn, this.baseUrl, "/location/lightaids/bounding-box", {
      "filter.latBottom": options.latMin,
      "filter.latTop": options.latMax,
      "filter.lonLeft": options.lonMin,
      "filter.lonRight": options.lonMax,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  async lightAidsRadius(options: {
    latitude: number;
    longitude: number;
    radius: number;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<LightAidsWithinLocationResponse> {
    return request(this.fetchFn, this.baseUrl, "/location/lightaids/radius", {
      "filter.latitude": options.latitude,
      "filter.longitude": options.longitude,
      "filter.radius": options.radius,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  // --- MODUs ---

  async modusBoundingBox(options: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<MODUsWithinLocationResponse> {
    return request(this.fetchFn, this.baseUrl, "/location/modu/bounding-box", {
      "filter.latBottom": options.latMin,
      "filter.latTop": options.latMax,
      "filter.lonLeft": options.lonMin,
      "filter.lonRight": options.lonMax,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  async modusRadius(options: {
    latitude: number;
    longitude: number;
    radius: number;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<MODUsWithinLocationResponse> {
    return request(this.fetchFn, this.baseUrl, "/location/modu/radius", {
      "filter.latitude": options.latitude,
      "filter.longitude": options.longitude,
      "filter.radius": options.radius,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  // --- Radio Beacons ---

  async radioBeaconsBoundingBox(options: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<RadioBeaconsWithinLocationResponse> {
    return request(this.fetchFn, this.baseUrl, "/location/radiobeacons/bounding-box", {
      "filter.latBottom": options.latMin,
      "filter.latTop": options.latMax,
      "filter.lonLeft": options.lonMin,
      "filter.lonRight": options.lonMax,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  async radioBeaconsRadius(options: {
    latitude: number;
    longitude: number;
    radius: number;
    paginationLimit?: number;
    paginationNextToken?: string;
  }): Promise<RadioBeaconsWithinLocationResponse> {
    return request(this.fetchFn, this.baseUrl, "/location/radiobeacons/radius", {
      "filter.latitude": options.latitude,
      "filter.longitude": options.longitude,
      "filter.radius": options.radius,
      "pagination.limit": options.paginationLimit,
      "pagination.nextToken": options.paginationNextToken,
    });
  }

  // --- Iterators ---

  allVesselsBoundingBox(options: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    timeFrom?: string;
    timeTo?: string;
    paginationLimit?: number;
  }): PageIterator<VesselPosition> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.vesselsBoundingBox({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.vessels ?? [], nextToken: resp.nextToken };
    });
  }

  allVesselsRadius(options: {
    latitude: number;
    longitude: number;
    radius: number;
    timeFrom?: string;
    timeTo?: string;
    paginationLimit?: number;
  }): PageIterator<VesselPosition> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.vesselsRadius({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.vessels ?? [], nextToken: resp.nextToken };
    });
  }

  allPortsBoundingBox(options: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    paginationLimit?: number;
  }): PageIterator<Port> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.portsBoundingBox({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.ports ?? [], nextToken: resp.nextToken };
    });
  }

  allPortsRadius(options: {
    latitude: number;
    longitude: number;
    radius: number;
    paginationLimit?: number;
  }): PageIterator<Port> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.portsRadius({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.ports ?? [], nextToken: resp.nextToken };
    });
  }

  allDgpsBoundingBox(options: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    paginationLimit?: number;
  }): PageIterator<DGPSStation> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.dgpsBoundingBox({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.dgpsStations ?? [], nextToken: resp.nextToken };
    });
  }

  allDgpsRadius(options: {
    latitude: number;
    longitude: number;
    radius: number;
    paginationLimit?: number;
  }): PageIterator<DGPSStation> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.dgpsRadius({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.dgpsStations ?? [], nextToken: resp.nextToken };
    });
  }

  allLightAidsBoundingBox(options: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    paginationLimit?: number;
  }): PageIterator<LightAid> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.lightAidsBoundingBox({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.lightAids ?? [], nextToken: resp.nextToken };
    });
  }

  allLightAidsRadius(options: {
    latitude: number;
    longitude: number;
    radius: number;
    paginationLimit?: number;
  }): PageIterator<LightAid> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.lightAidsRadius({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.lightAids ?? [], nextToken: resp.nextToken };
    });
  }

  allModusBoundingBox(options: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    paginationLimit?: number;
  }): PageIterator<MODU> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.modusBoundingBox({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.modus ?? [], nextToken: resp.nextToken };
    });
  }

  allModusRadius(options: {
    latitude: number;
    longitude: number;
    radius: number;
    paginationLimit?: number;
  }): PageIterator<MODU> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.modusRadius({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.modus ?? [], nextToken: resp.nextToken };
    });
  }

  allRadioBeaconsBoundingBox(options: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    paginationLimit?: number;
  }): PageIterator<RadioBeacon> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.radioBeaconsBoundingBox({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.radioBeacons ?? [], nextToken: resp.nextToken };
    });
  }

  allRadioBeaconsRadius(options: {
    latitude: number;
    longitude: number;
    radius: number;
    paginationLimit?: number;
  }): PageIterator<RadioBeacon> {
    let token: string | undefined;
    return new PageIterator(async () => {
      const resp = await this.radioBeaconsRadius({ ...options, paginationNextToken: token });
      token = resp.nextToken ?? undefined;
      return { items: resp.radioBeacons ?? [], nextToken: resp.nextToken };
    });
  }
}

