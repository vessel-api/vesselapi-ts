import { describe, expect, it, vi } from "vitest";
import { VesselAPIError } from "../src/errors.js";
import {
  VesselsService,
  PortsService,
  PortEventsService,
  EmissionsService,
  SearchService,
  LocationService,
  NavtexService,
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
    await svc.classification("123");
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("filter.idType=imo");
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
});

describe("LocationService", () => {
  it("vesselsBoundingBox() constructs correct params", async () => {
    const fetch = createMockFetch({ vessels: [] });
    const svc = new LocationService(fetch, BASE);
    await svc.vesselsBoundingBox({ latMin: 10, latMax: 20, lonMin: 30, lonMax: 40 });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("filter.latBottom=10");
    expect(url).toContain("filter.latTop=20");
    expect(url).toContain("filter.lonLeft=30");
    expect(url).toContain("filter.lonRight=40");
  });

  it("vesselsRadius() constructs correct params", async () => {
    const fetch = createMockFetch({ vessels: [] });
    const svc = new LocationService(fetch, BASE);
    await svc.vesselsRadius({ latitude: 51.9, longitude: 4.5, radius: 10 });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("filter.latitude=51.9");
    expect(url).toContain("filter.longitude=4.5");
    expect(url).toContain("filter.radius=10");
  });
});

describe("NavtexService", () => {
  it("list() passes time params", async () => {
    const fetch = createMockFetch({ navtexMessages: [] });
    const svc = new NavtexService(fetch, BASE);
    await svc.list({ timeFrom: "2024-01-01", timeTo: "2024-12-31" });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(url).toContain("time.from=2024-01-01");
    expect(url).toContain("time.to=2024-12-31");
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
