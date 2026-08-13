import { describe, expect, it, vi } from "vitest";
import {
  VesselAPIError,
  VesselForbiddenError,
  VesselNotFoundError,
  VesselPaymentRequiredError,
} from "../src/errors.js";
import {
  VesselsService,
  PortsService,
  PortEventsService,
  EmissionsService,
  SearchService,
  LocationService,
} from "../src/services.js";

function createMockFetch(responseBody: unknown, expectedUrl?: string): typeof globalThis.fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    if (expectedUrl) {
      const url = typeof input === "string" ? input : input.toString();
      expect(url).toContain(expectedUrl);
    }
    return new Response(JSON.stringify(responseBody), { status: 200 });
  });
}

const BASE = "https://api.vesselapi.com/v1";

/** Query params of the nth (default: first) call made to a mock fetch. */
function queryOf(fetch: typeof globalThis.fetch, call = 0): URLSearchParams {
  const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[call]![0] as string;
  return new URL(url).searchParams;
}

describe("VesselsService", () => {
  it("get() constructs correct URL with default filterIdType", async () => {
    const fetch = createMockFetch({ vessel: { imo: 9363728 } });
    const svc = new VesselsService(fetch, BASE);
    const resp = await svc.get("9363728");
    expect(resp.vessel?.imo).toBe(9363728);
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("/vessel/9363728");
    expect(url).toContain("filter.idType=imo");
  });

  it("position() constructs correct URL", async () => {
    const fetch = createMockFetch({ vesselPosition: { latitude: 1.0 } });
    const svc = new VesselsService(fetch, BASE);
    const resp = await svc.position("9363728");
    expect(resp.vesselPosition?.latitude).toBe(1.0);
  });

  it("position() sends filter.sat when requested", async () => {
    const fetch = createMockFetch({ vesselPosition: { latitude: 1.0 } });
    const svc = new VesselsService(fetch, BASE);
    await svc.position("9363728", { filterSat: true });
    expect(queryOf(fetch).get("filter.sat")).toBe("true");
  });

  it("position() sends filter.sat=false explicitly when disabled", async () => {
    const fetch = createMockFetch({ vesselPosition: {} });
    const svc = new VesselsService(fetch, BASE);
    await svc.position("9363728", { filterSat: false });
    expect(queryOf(fetch).get("filter.sat")).toBe("false");
  });

  it("position() omits filter.sat when not given", async () => {
    const fetch = createMockFetch({ vesselPosition: {} });
    const svc = new VesselsService(fetch, BASE);
    await svc.position("9363728");
    expect(queryOf(fetch).has("filter.sat")).toBe(false);
  });

  it("casualties() passes pagination params", async () => {
    const fetch = createMockFetch({ casualties: [], nextToken: "abc" });
    const svc = new VesselsService(fetch, BASE);
    await svc.casualties("123", { paginationLimit: 10, paginationNextToken: "tok" });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("pagination.limit=10");
    expect(url).toContain("pagination.nextToken=tok");
  });

  it("defaults filterIdType to imo", async () => {
    const fetch = createMockFetch({});
    const svc = new VesselsService(fetch, BASE);
    await svc.get("123");
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("filter.idType=imo");
  });

  it("positions() accepts filterIds as a comma-separated string or a repeated array", async () => {
    const fetch = createMockFetch({ vesselPositions: [] });
    const svc = new VesselsService(fetch, BASE);
    await svc.positions({ filterIds: "232003239,246497000" });
    expect(queryOf(fetch).getAll("filter.ids")).toEqual(["232003239,246497000"]);
    await svc.positions({ filterIds: ["232003239", "246497000"] });
    expect(queryOf(fetch, 1).getAll("filter.ids")).toEqual(["232003239", "246497000"]);
  });

  it("allPositions() forwards a repeated filterIds array", async () => {
    const fetch = createMockFetch({ vesselPositions: [] });
    const svc = new VesselsService(fetch, BASE);
    await svc.allPositions({ filterIds: ["232003239", "246497000"], timeFrom: "2026-08-01T00:00:00Z" }).collect();
    const q = queryOf(fetch);
    expect(q.getAll("filter.ids")).toEqual(["232003239", "246497000"]);
    expect(q.get("time.from")).toBe("2026-08-01T00:00:00Z");
  });

  it("throws on empty response body", async () => {
    const fetch = vi.fn(async () => new Response("", { status: 200 }));
    const svc = new VesselsService(fetch, BASE);
    await expect(svc.get("123")).rejects.toThrow(VesselAPIError);
    await expect(svc.get("123")).rejects.toThrow("unexpected empty response");
  });
});

describe("PortsService", () => {
  it("get() constructs correct URL", async () => {
    const fetch = createMockFetch({ port: { name: "Rotterdam" } });
    const svc = new PortsService(fetch, BASE);
    const resp = await svc.get("NLRTM");
    expect(resp.port?.name).toBe("Rotterdam");
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("/port/NLRTM");
  });

  it("inbound() constructs correct URL and params", async () => {
    const fetch = createMockFetch({
      vesselETAs: [{ imo: 9363728, destination: "ROTTERDAM", destination_port: "NLRTM" }],
    });
    const svc = new PortsService(fetch, BASE);
    const resp = await svc.inbound("NLRTM", {
      filterEtaFrom: "2026-03-07T00:00:00Z",
      filterEtaTo: "2026-03-09T00:00:00Z",
      paginationLimit: 10,
    });
    expect(resp.vesselETAs).toHaveLength(1);
    expect(resp.vesselETAs?.[0]?.destination_port).toBe("NLRTM");
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("/port/NLRTM/inbound");
    expect(url).toContain("filter.etaFrom=");
    expect(url).toContain("filter.etaTo=");
    expect(url).toContain("pagination.limit=10");
  });
});

describe("ResolutionMeta (_meta)", () => {
  it("deserializes _meta on VesselResponse", async () => {
    const fetch = createMockFetch({
      vessel: { imo: 9363728 },
      _meta: { requestedIdType: "mmsi", resolvedIdType: "imo", resolvedId: 9363728 },
    });
    const svc = new VesselsService(fetch, BASE);
    const resp = await svc.get("477045900", { filterIdType: "mmsi" });
    expect(resp._meta).toBeDefined();
    expect(resp._meta?.requestedIdType).toBe("mmsi");
    expect(resp._meta?.resolvedIdType).toBe("imo");
    expect(resp._meta?.resolvedId).toBe(9363728);
  });

  it("deserializes suggestedIdType on VesselResponse", async () => {
    const fetch = createMockFetch({
      vessel: {},
      _meta: { requestedIdType: "imo", suggestedIdType: "mmsi" },
    });
    const svc = new VesselsService(fetch, BASE);
    const resp = await svc.get("123");
    expect(resp._meta?.suggestedIdType).toBe("mmsi");
  });

  it("deserializes VesselSearchMeta on FindVesselsResponse", async () => {
    const fetch = createMockFetch({
      vessels: [{ eni: "04606770" }],
      _meta: { query: "4606770", matchedOn: { "0": ["eni"] } },
    });
    const svc = new SearchService(fetch, BASE);
    const resp = await svc.vessels({ q: "4606770" });
    expect(resp._meta?.query).toBe("4606770");
    expect(resp._meta?.matchedOn?.["0"]).toEqual(["eni"]);
    expect(resp.vessels?.[0]?.eni).toBe("04606770");
  });
});

describe("PortEventsService", () => {
  it("list() constructs correct URL", async () => {
    const fetch = createMockFetch({ portEvents: [] });
    const svc = new PortEventsService(fetch, BASE);
    await svc.list({ filterCountry: "NL" });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("/portevents");
    expect(url).toContain("filter.country=NL");
  });

  it("byVessel() defaults filterIdType to imo", async () => {
    const fetch = createMockFetch({ portEvents: [] });
    const svc = new PortEventsService(fetch, BASE);
    await svc.byVessel("123");
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("filter.idType=imo");
  });

  it("lastByVessel() constructs correct URL", async () => {
    const fetch = createMockFetch({ portEvent: { event: "arrival" } });
    const svc = new PortEventsService(fetch, BASE);
    const resp = await svc.lastByVessel("123");
    expect(resp.portEvent?.event).toBe("arrival");
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("/portevents/vessel/123/last");
  });

  const FROM = "2026-08-01T00:00:00Z";
  const TO = "2026-08-02T00:00:00Z";

  it("byPort() sends the time window", async () => {
    const fetch = createMockFetch({ portEvents: [] });
    const svc = new PortEventsService(fetch, BASE);
    await svc.byPort("NLRTM", { timeFrom: FROM, timeTo: TO });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("/portevents/port/NLRTM");
    const q = queryOf(fetch);
    expect(q.get("time.from")).toBe(FROM);
    expect(q.get("time.to")).toBe(TO);
  });

  it("byPorts() sends the time window", async () => {
    const fetch = createMockFetch({ portEvents: [] });
    const svc = new PortEventsService(fetch, BASE);
    await svc.byPorts({ filterPortName: "Rotterdam", timeFrom: FROM, timeTo: TO });
    const q = queryOf(fetch);
    expect(q.get("filter.portName")).toBe("Rotterdam");
    expect(q.get("time.from")).toBe(FROM);
    expect(q.get("time.to")).toBe(TO);
  });

  it("byVessels() sends the time window", async () => {
    const fetch = createMockFetch({ portEvents: [] });
    const svc = new PortEventsService(fetch, BASE);
    await svc.byVessels({ filterVesselName: "strangford 2", timeFrom: FROM, timeTo: TO });
    const q = queryOf(fetch);
    expect(q.get("filter.vesselName")).toBe("strangford 2");
    expect(q.get("time.from")).toBe(FROM);
    expect(q.get("time.to")).toBe(TO);
  });

  it("allByPort() forwards the time window", async () => {
    const fetch = createMockFetch({ portEvents: [] });
    const svc = new PortEventsService(fetch, BASE);
    await svc.allByPort("NLRTM", { timeFrom: FROM, timeTo: TO }).collect();
    const q = queryOf(fetch);
    expect(q.get("time.from")).toBe(FROM);
    expect(q.get("time.to")).toBe(TO);
  });

  it("allByPorts() forwards the time window", async () => {
    const fetch = createMockFetch({ portEvents: [] });
    const svc = new PortEventsService(fetch, BASE);
    await svc.allByPorts({ filterPortName: "Rotterdam", timeFrom: FROM, timeTo: TO }).collect();
    const q = queryOf(fetch);
    expect(q.get("filter.portName")).toBe("Rotterdam");
    expect(q.get("time.from")).toBe(FROM);
    expect(q.get("time.to")).toBe(TO);
  });

  it("allByVessels() forwards the time window", async () => {
    const fetch = createMockFetch({ portEvents: [] });
    const svc = new PortEventsService(fetch, BASE);
    await svc.allByVessels({ filterVesselName: "strangford 2", timeFrom: FROM, timeTo: TO }).collect();
    const q = queryOf(fetch);
    expect(q.get("filter.vesselName")).toBe("strangford 2");
    expect(q.get("time.from")).toBe(FROM);
    expect(q.get("time.to")).toBe(TO);
  });
});

describe("EmissionsService", () => {
  it("list() passes filter params", async () => {
    const fetch = createMockFetch({ emissions: [] });
    const svc = new EmissionsService(fetch, BASE);
    await svc.list({ filterPeriod: 2024 });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("filter.period=2024");
  });
});

describe("SearchService", () => {
  it("vessels() passes filter params", async () => {
    const fetch = createMockFetch({ vessels: [] });
    const svc = new SearchService(fetch, BASE);
    await svc.vessels({ filterName: "Ever" });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("filter.name=Ever");
  });

  it("ports() passes filter params", async () => {
    const fetch = createMockFetch({ ports: [] });
    const svc = new SearchService(fetch, BASE);
    await svc.ports({ filterCountry: "US" });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("filter.country=US");
  });

  it("vessels() sends q and filter.eni", async () => {
    const fetch = createMockFetch({ vessels: [] });
    const svc = new SearchService(fetch, BASE);
    await svc.vessels({ q: "4606770", filterEni: "04606770" });
    const q = queryOf(fetch);
    expect(q.get("q")).toBe("4606770");
    expect(q.get("filter.eni")).toBe("04606770");
  });

  it("vessels() accepts numeric imo/mmsi as the spec declares", async () => {
    const fetch = createMockFetch({ vessels: [] });
    const svc = new SearchService(fetch, BASE);
    await svc.vessels({ filterImo: 9321483, filterMmsi: 477045900 });
    const q = queryOf(fetch);
    expect(q.get("filter.imo")).toBe("9321483");
    expect(q.get("filter.mmsi")).toBe("477045900");
  });

  it("vessels() still accepts string imo/mmsi", async () => {
    const fetch = createMockFetch({ vessels: [] });
    const svc = new SearchService(fetch, BASE);
    await svc.vessels({ filterImo: "9321483", filterMmsi: "477045900" });
    const q = queryOf(fetch);
    expect(q.get("filter.imo")).toBe("9321483");
    expect(q.get("filter.mmsi")).toBe("477045900");
  });

  it("vessels() repeats array filters instead of overwriting", async () => {
    const fetch = createMockFetch({ vessels: [] });
    const svc = new SearchService(fetch, BASE);
    await svc.vessels({
      filterFlag: ["PA", "LR", "MH"],
      filterVesselType: ["Container Ship", "Bulk Carrier"],
    });
    const q = queryOf(fetch);
    expect(q.getAll("filter.flag")).toEqual(["PA", "LR", "MH"]);
    expect(q.getAll("filter.vesselType")).toEqual(["Container Ship", "Bulk Carrier"]);
  });

  it("vessels() sends a single string filter exactly once", async () => {
    const fetch = createMockFetch({ vessels: [] });
    const svc = new SearchService(fetch, BASE);
    await svc.vessels({ filterFlag: "PA", filterVesselType: "Container Ship" });
    const q = queryOf(fetch);
    expect(q.getAll("filter.flag")).toEqual(["PA"]);
    expect(q.getAll("filter.vesselType")).toEqual(["Container Ship"]);
  });

  it("vessels() omits an empty array filter", async () => {
    const fetch = createMockFetch({ vessels: [] });
    const svc = new SearchService(fetch, BASE);
    await svc.vessels({ filterFlag: [], filterName: "Ever" });
    const q = queryOf(fetch);
    expect(q.has("filter.flag")).toBe(false);
    expect(q.get("filter.name")).toBe("Ever");
  });

  it("ports() repeats every multi-valued filter", async () => {
    const fetch = createMockFetch({ ports: [] });
    const svc = new SearchService(fetch, BASE);
    await svc.ports({
      filterCountry: ["NL", "BE"],
      filterPortType: ["Port"],
      filterSize: ["Large", "Medium"],
      filterHarborSize: ["Large", "Small"],
      filterHarborUse: ["CARGO", "FISHING"],
      filterRegion: "Europe",
    });
    const q = queryOf(fetch);
    expect(q.getAll("filter.country")).toEqual(["NL", "BE"]);
    expect(q.getAll("filter.type")).toEqual(["Port"]);
    expect(q.getAll("filter.size")).toEqual(["Large", "Medium"]);
    expect(q.getAll("filter.harborSize")).toEqual(["Large", "Small"]);
    expect(q.getAll("filter.harborUse")).toEqual(["CARGO", "FISHING"]);
    expect(q.get("filter.region")).toBe("Europe");
  });

  it("allVessels() forwards q, eni and array filters to the wire", async () => {
    const fetch = createMockFetch({ vessels: [] });
    const svc = new SearchService(fetch, BASE);
    await svc.allVessels({ q: "EVER", filterEni: "04606770", filterFlag: ["PA", "LR"] }).collect();
    const q = queryOf(fetch);
    expect(q.get("q")).toBe("EVER");
    expect(q.get("filter.eni")).toBe("04606770");
    expect(q.getAll("filter.flag")).toEqual(["PA", "LR"]);
  });

  it("allPorts() forwards array filters to the wire", async () => {
    const fetch = createMockFetch({ ports: [] });
    const svc = new SearchService(fetch, BASE);
    await svc.allPorts({ filterCountry: ["NL", "BE"], filterHarborUse: ["CARGO"] }).collect();
    const q = queryOf(fetch);
    expect(q.getAll("filter.country")).toEqual(["NL", "BE"]);
    expect(q.getAll("filter.harborUse")).toEqual(["CARGO"]);
  });

  // filter.name is required on these four paths, unlike on ports and vessels.
  type NameCall = (svc: SearchService, name: string) => Promise<unknown>;
  const named: Array<[string, string, NameCall]> = [
    ["dgps", "/search/dgps", (s, n) => s.dgps({ filterName: n })],
    ["lightAids", "/search/lightaids", (s, n) => s.lightAids({ filterName: n })],
    ["modus", "/search/modus", (s, n) => s.modus({ filterName: n })],
    ["radioBeacons", "/search/radiobeacons", (s, n) => s.radioBeacons({ filterName: n })],
    ["allDgps", "/search/dgps", (s, n) => s.allDgps({ filterName: n }).collect()],
    ["allLightAids", "/search/lightaids", (s, n) => s.allLightAids({ filterName: n }).collect()],
    ["allModus", "/search/modus", (s, n) => s.allModus({ filterName: n }).collect()],
    ["allRadioBeacons", "/search/radiobeacons", (s, n) => s.allRadioBeacons({ filterName: n }).collect()],
  ];

  it.each(named)("%s() sends the required filter.name", async (_name, path, call) => {
    const fetch = createMockFetch({}, path);
    await call(new SearchService(fetch, BASE), "Rotterdam");
    expect(queryOf(fetch).get("filter.name")).toBe("Rotterdam");
  });
});

describe("LocationService", () => {
  const BBOX = { latMin: 10, latMax: 20, lonMin: 30, lonMax: 40 };
  const RADIUS = { latitude: 51.9, longitude: 4.5, radius: 10 };

  type BBoxCall = (svc: LocationService, bbox: typeof BBOX) => Promise<unknown>;
  type RadiusCall = (svc: LocationService, centre: typeof RADIUS) => Promise<unknown>;

  // The spec marks the four edges required on every bounding-box path, so each
  // method must take them as a required argument and put all four on the wire.
  const boundingBox: Array<[string, string, BBoxCall]> = [
    ["vesselsBoundingBox", "/location/vessels/bounding-box", (s, b) => s.vesselsBoundingBox(b)],
    ["portsBoundingBox", "/location/ports/bounding-box", (s, b) => s.portsBoundingBox(b)],
    ["dgpsBoundingBox", "/location/dgps/bounding-box", (s, b) => s.dgpsBoundingBox(b)],
    ["lightAidsBoundingBox", "/location/lightaids/bounding-box", (s, b) => s.lightAidsBoundingBox(b)],
    ["modusBoundingBox", "/location/modu/bounding-box", (s, b) => s.modusBoundingBox(b)],
    ["radioBeaconsBoundingBox", "/location/radiobeacons/bounding-box", (s, b) => s.radioBeaconsBoundingBox(b)],
    ["allVesselsBoundingBox", "/location/vessels/bounding-box", (s, b) => s.allVesselsBoundingBox(b).collect()],
    ["allPortsBoundingBox", "/location/ports/bounding-box", (s, b) => s.allPortsBoundingBox(b).collect()],
    ["allDgpsBoundingBox", "/location/dgps/bounding-box", (s, b) => s.allDgpsBoundingBox(b).collect()],
    ["allLightAidsBoundingBox", "/location/lightaids/bounding-box", (s, b) => s.allLightAidsBoundingBox(b).collect()],
    ["allModusBoundingBox", "/location/modu/bounding-box", (s, b) => s.allModusBoundingBox(b).collect()],
    ["allRadioBeaconsBoundingBox", "/location/radiobeacons/bounding-box", (s, b) => s.allRadioBeaconsBoundingBox(b).collect()],
  ];

  const radius: Array<[string, string, RadiusCall]> = [
    ["vesselsRadius", "/location/vessels/radius", (s, r) => s.vesselsRadius(r)],
    ["portsRadius", "/location/ports/radius", (s, r) => s.portsRadius(r)],
    ["dgpsRadius", "/location/dgps/radius", (s, r) => s.dgpsRadius(r)],
    ["lightAidsRadius", "/location/lightaids/radius", (s, r) => s.lightAidsRadius(r)],
    ["modusRadius", "/location/modu/radius", (s, r) => s.modusRadius(r)],
    ["radioBeaconsRadius", "/location/radiobeacons/radius", (s, r) => s.radioBeaconsRadius(r)],
    ["allVesselsRadius", "/location/vessels/radius", (s, r) => s.allVesselsRadius(r).collect()],
    ["allPortsRadius", "/location/ports/radius", (s, r) => s.allPortsRadius(r).collect()],
    ["allDgpsRadius", "/location/dgps/radius", (s, r) => s.allDgpsRadius(r).collect()],
    ["allLightAidsRadius", "/location/lightaids/radius", (s, r) => s.allLightAidsRadius(r).collect()],
    ["allModusRadius", "/location/modu/radius", (s, r) => s.allModusRadius(r).collect()],
    ["allRadioBeaconsRadius", "/location/radiobeacons/radius", (s, r) => s.allRadioBeaconsRadius(r).collect()],
  ];

  it.each(boundingBox)("%s() sends all four required edges", async (_name, path, call) => {
    const fetch = createMockFetch({}, path);
    await call(new LocationService(fetch, BASE), BBOX);
    const q = queryOf(fetch);
    expect(q.get("filter.latBottom")).toBe("10");
    expect(q.get("filter.latTop")).toBe("20");
    expect(q.get("filter.lonLeft")).toBe("30");
    expect(q.get("filter.lonRight")).toBe("40");
  });

  it.each(radius)("%s() sends the required centre and radius", async (_name, path, call) => {
    const fetch = createMockFetch({}, path);
    await call(new LocationService(fetch, BASE), RADIUS);
    const q = queryOf(fetch);
    expect(q.get("filter.latitude")).toBe("51.9");
    expect(q.get("filter.longitude")).toBe("4.5");
    expect(q.get("filter.radius")).toBe("10");
  });

  it("vesselsBoundingBox() keeps the time window optional", async () => {
    const fetch = createMockFetch({ vessels: [] });
    const svc = new LocationService(fetch, BASE);
    await svc.vesselsBoundingBox(BBOX);
    const q = queryOf(fetch);
    expect(q.has("time.from")).toBe(false);
    expect(q.has("pagination.limit")).toBe(false);
  });
});

describe("error responses", () => {
  function createErrorFetch(status: number, body: unknown): typeof globalThis.fetch {
    return vi.fn(async () => new Response(JSON.stringify(body), { status }));
  }

  it("position() throws VesselPaymentRequiredError on 402", async () => {
    const fetch = createErrorFetch(402, {
      error: {
        code: "insufficient_credits",
        message: "insufficient satellite credits",
        type: "payment_required_error",
      },
    });
    const svc = new VesselsService(fetch, BASE);
    await expect(svc.position("9363728", { filterSat: true })).rejects.toBeInstanceOf(
      VesselPaymentRequiredError,
    );
  });

  it("throws VesselForbiddenError on 403 and exposes the code", async () => {
    const fetch = createErrorFetch(403, {
      error: {
        code: "feature_not_available",
        message: 'this feature is not available on the "free" plan',
        type: "forbidden_error",
      },
    });
    const svc = new EmissionsService(fetch, BASE);
    try {
      await svc.list();
      expect.unreachable("expected list() to reject");
    } catch (err) {
      expect(err).toBeInstanceOf(VesselForbiddenError);
      const e = err as VesselAPIError;
      expect(e.statusCode).toBe(403);
      expect(e.code).toBe("feature_not_available");
      expect(e.type).toBe("forbidden_error");
    }
  });

  it("still throws VesselNotFoundError on 404", async () => {
    const fetch = createErrorFetch(404, {
      error: { code: "resource_missing", message: "Port not found", type: "not_found_error" },
    });
    const svc = new PortsService(fetch, BASE);
    await expect(svc.get("ZZZZZ")).rejects.toBeInstanceOf(VesselNotFoundError);
  });
});

describe("null response guard", () => {
  it("strips null/undefined query params", async () => {
    const fetch = createMockFetch({});
    const svc = new VesselsService(fetch, BASE);
    await svc.casualties("123");
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    // Should not contain pagination params when not provided
    expect(url).not.toContain("pagination.limit");
    expect(url).not.toContain("pagination.nextToken");
  });
});

describe("path parameters are escaped", () => {
  it("keeps a hostile identifier inside its own path segment", async () => {
    const calls: string[] = [];
    const spy: typeof globalThis.fetch = async (url) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ vessel: {}, port: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const base = "https://api.vesselapi.com/v1";

    await new VesselsService(spy, base).get("123/../../search/vessels?filter.name=x");
    await new PortsService(spy, base).get("NLRTM/../../search/vessels?filter.name=x");
    await new PortEventsService(spy, base).byPort("NLRTM/../../search/vessels");

    for (const url of calls) {
      // The traversal must not escape into a different endpoint.
      expect(url).not.toContain("/v1/search/vessels?filter.name=x");
      expect(url.startsWith("https://api.vesselapi.com/v1/")).toBe(true);
    }
    expect(calls[0]).toContain("/vessel/123%2F..%2F..%2Fsearch%2Fvessels");
    expect(calls[1]).toContain("/port/NLRTM%2F..%2F..%2Fsearch%2Fvessels");
  });

  it("leaves ordinary identifiers readable", async () => {
    let seen = "";
    const spy: typeof globalThis.fetch = async (url) => {
      seen = String(url);
      return new Response(JSON.stringify({ vessel: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    await new VesselsService(spy, "https://api.vesselapi.com/v1").get("9321483");
    expect(seen).toContain("/v1/vessel/9321483?");
  });
});
