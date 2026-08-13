import { beforeAll, describe, expect, it } from "vitest";
import { VesselClient } from "../src/client.js";

const API_KEY = process.env.VESSELAPI_API_KEY;
const SMOKE = process.env.SMOKE === "1";

const IMO = "9363728"; // Ever Given
const UNLOCODE = "NLRTM"; // Rotterdam
const BBOX = { latMin: 51.5, latMax: 52.5, lonMin: 3.5, lonMax: 5.0 };
const RADIUS = { latitude: 51.9, longitude: 4.5, radius: 50 };

// These hit the live service over the network, so they need a longer budget
// than the 5 second default used by the unit tests. `/port/{unlocode}/inbound`
// currently answers in 3.4 to 4.6 seconds, which sits close enough to 5 that
// the suite failed intermittently and hid real regressions behind the noise.
// This raises the ceiling; it does not make that endpoint any faster.
const SMOKE_TIMEOUT_MS = 20_000;

describe.skipIf(!SMOKE || !API_KEY)("smoke tests (live API)", () => {
  let client: VesselClient;
  beforeAll(() => {
    client = new VesselClient(API_KEY!);
  });

  // ================================================================
  // VesselsService
  // ================================================================

  it("vessels.get", async () => {
    const r = await client.vessels.get(IMO);
    expect(r.vessel).toBeDefined();
    expect(r.vessel?.imo).toBe(9363728);
  });

  it("vessels.position", async () => {
    const r = await client.vessels.position(IMO);
    expect(r.vesselPosition).toBeDefined();
  });

  it("vessels.casualties", async () => {
    const r = await client.vessels.casualties(IMO, { paginationLimit: 2 });
    expect(r.casualties).toBeDefined();
  });

  it("vessels.emissions", async () => {
    const r = await client.vessels.emissions(IMO, { paginationLimit: 2 });
    expect(r.emissions).toBeDefined();
  });

  it("vessels.eta", async () => {
    const r = await client.vessels.eta(IMO);
    expect(r.vesselEta).toBeDefined();
  });

  it("vessels.positions", async () => {
    const r = await client.vessels.positions({ filterIds: IMO, paginationLimit: 2 });
    expect(r.vesselPositions).toBeDefined();
  });

  it("vessels.allCasualties (iterator)", async () => {
    let count = 0;
    for await (const item of client.vessels.allCasualties(IMO, { paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("vessels.allEmissions (iterator)", async () => {
    let count = 0;
    for await (const item of client.vessels.allEmissions(IMO, { paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("vessels.allPositions (iterator)", async () => {
    let count = 0;
    for await (const item of client.vessels.allPositions({ filterIds: IMO, paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  // ================================================================
  // PortsService
  // ================================================================

  it("ports.get", async () => {
    const r = await client.ports.get(UNLOCODE);
    expect(r.port).toBeDefined();
    expect(r.port?.name).toBeDefined();
  });

  it("ports.inbound", async () => {
    const now = new Date();
    const later = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const r = await client.ports.inbound(UNLOCODE, {
      filterEtaFrom: now.toISOString(),
      filterEtaTo: later.toISOString(),
      paginationLimit: 5,
    });
    expect(r.vesselETAs).toBeDefined();
  });

  it("vessels.eta destination_port field deserializes", async () => {
    // CMA CGM KHAO SOK — known to have active ETA with destination_port
    const r = await client.vessels.eta("9925837");
    expect(r.vesselEta).toBeDefined();
    expect(typeof r.vesselEta!.destination_port).toBe("string");
    expect(r.vesselEta!.destination_port!.length).toBeGreaterThan(0);
  });

  it("vessels.get with wrong idType triggers _meta fallback", async () => {
    // Use an MMSI value but claim it's an IMO — API should fallback
    const r = await client.vessels.get("477045900", { filterIdType: "imo" });
    // If fallback worked, we get a vessel and _meta
    if (r.vessel) {
      expect(r._meta).toBeDefined();
      expect(r._meta?.resolvedIdType).toBe("mmsi");
    }
  });

  // ================================================================
  // PortEventsService
  // ================================================================

  it("portEvents.list", async () => {
    const r = await client.portEvents.list({ paginationLimit: 2 });
    expect(r.portEvents).toBeDefined();
  });

  it("portEvents.byPort", async () => {
    const r = await client.portEvents.byPort(UNLOCODE, { paginationLimit: 2 });
    expect(r.portEvents).toBeDefined();
  });

  it("portEvents.byPorts", async () => {
    const r = await client.portEvents.byPorts({ filterPortName: "Rotterdam", paginationLimit: 2 });
    expect(r.portEvents).toBeDefined();
  });

  it("portEvents.byVessel", async () => {
    const r = await client.portEvents.byVessel(IMO, { paginationLimit: 2 });
    expect(r.portEvents).toBeDefined();
  });

  it("portEvents.lastByVessel", async () => {
    const r = await client.portEvents.lastByVessel(IMO);
    expect(r.portEvent).toBeDefined();
  });

  it("portEvents.byVessels", async () => {
    const r = await client.portEvents.byVessels({ filterVesselName: "Ever", paginationLimit: 2 });
    expect(r.portEvents).toBeDefined();
  });

  it("portEvents.listAll (iterator)", async () => {
    let count = 0;
    for await (const item of client.portEvents.listAll({ paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("portEvents.allByPort (iterator)", async () => {
    let count = 0;
    for await (const item of client.portEvents.allByPort(UNLOCODE, { paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("portEvents.allByPorts (iterator)", async () => {
    let count = 0;
    for await (const item of client.portEvents.allByPorts({ filterPortName: "Rotterdam", paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("portEvents.allByVessel (iterator)", async () => {
    let count = 0;
    for await (const item of client.portEvents.allByVessel(IMO, { paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("portEvents.allByVessels (iterator)", async () => {
    let count = 0;
    for await (const item of client.portEvents.allByVessels({ filterVesselName: "Ever", paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  // ================================================================
  // EmissionsService
  // ================================================================

  it("emissions.list", async () => {
    const r = await client.emissions.list({ paginationLimit: 2 });
    expect(r.emissions).toBeDefined();
  });

  it("emissions.listAll (iterator)", async () => {
    let count = 0;
    for await (const item of client.emissions.listAll({ paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  // ================================================================
  // SearchService
  // ================================================================

  it("search.vessels", async () => {
    const r = await client.search.vessels({ filterName: "Ever", paginationLimit: 2 });
    expect(r.vessels).toBeDefined();
  });

  it("search.ports", async () => {
    const r = await client.search.ports({ filterName: "Rotterdam", paginationLimit: 2 });
    expect(r.ports).toBeDefined();
  });

  it("search.dgps", async () => {
    const r = await client.search.dgps({ filterName: "a", paginationLimit: 2 });
    expect(r.dgpsStations).toBeDefined();
  });

  it("search.lightAids", async () => {
    const r = await client.search.lightAids({ filterName: "a", paginationLimit: 2 });
    expect(r.lightAids).toBeDefined();
  });

  it("search.modus", async () => {
    const r = await client.search.modus({ filterName: "a", paginationLimit: 2 });
    expect(r.modus).toBeDefined();
  });

  it("search.radioBeacons", async () => {
    const r = await client.search.radioBeacons({ filterName: "a", paginationLimit: 2 });
    expect(r.radioBeacons).toBeDefined();
  });

  it("search.allVessels (iterator)", async () => {
    let count = 0;
    for await (const item of client.search.allVessels({ filterName: "Ever", paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("search.allPorts (iterator)", async () => {
    let count = 0;
    for await (const item of client.search.allPorts({ filterName: "port", paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("search.allDgps (iterator)", async () => {
    let count = 0;
    for await (const item of client.search.allDgps({ filterName: "a", paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("search.allLightAids (iterator)", async () => {
    let count = 0;
    for await (const item of client.search.allLightAids({ filterName: "a", paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("search.allModus (iterator)", async () => {
    let count = 0;
    for await (const item of client.search.allModus({ filterName: "a", paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("search.allRadioBeacons (iterator)", async () => {
    let count = 0;
    for await (const item of client.search.allRadioBeacons({ filterName: "a", paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  // ================================================================
  // LocationService
  // ================================================================

  it("location.vesselsBoundingBox", async () => {
    const r = await client.location.vesselsBoundingBox({ ...BBOX, paginationLimit: 2 });
    expect(r.vessels).toBeDefined();
  });

  it("location.vesselsRadius", async () => {
    const r = await client.location.vesselsRadius({ ...RADIUS, paginationLimit: 2 });
    expect(r.vessels).toBeDefined();
  });

  it("location.portsBoundingBox", async () => {
    const r = await client.location.portsBoundingBox({ ...BBOX, paginationLimit: 2 });
    expect(r.ports).toBeDefined();
  });

  it("location.portsRadius", async () => {
    const r = await client.location.portsRadius({ ...RADIUS, paginationLimit: 2 });
    expect(r.ports).toBeDefined();
  });

  it("location.dgpsBoundingBox", async () => {
    const r = await client.location.dgpsBoundingBox({ ...BBOX, paginationLimit: 2 });
    expect(r.dgpsStations).toBeDefined();
  });

  it("location.dgpsRadius", async () => {
    const r = await client.location.dgpsRadius({ ...RADIUS, paginationLimit: 2 });
    expect(r.dgpsStations).toBeDefined();
  });

  it("location.lightAidsBoundingBox", async () => {
    const r = await client.location.lightAidsBoundingBox({ ...BBOX, paginationLimit: 2 });
    expect(r.lightAids).toBeDefined();
  });

  it("location.lightAidsRadius", async () => {
    const r = await client.location.lightAidsRadius({ ...RADIUS, paginationLimit: 2 });
    expect(r.lightAids).toBeDefined();
  });

  it("location.modusBoundingBox", async () => {
    const r = await client.location.modusBoundingBox({ ...BBOX, paginationLimit: 2 });
    expect(r.modus).toBeDefined();
  });

  it("location.modusRadius", async () => {
    const r = await client.location.modusRadius({ ...RADIUS, paginationLimit: 2 });
    expect(r.modus).toBeDefined();
  });

  it("location.radioBeaconsBoundingBox", async () => {
    const r = await client.location.radioBeaconsBoundingBox({ ...BBOX, paginationLimit: 2 });
    expect(r.radioBeacons).toBeDefined();
  });

  it("location.radioBeaconsRadius", async () => {
    const r = await client.location.radioBeaconsRadius({ ...RADIUS, paginationLimit: 2 });
    expect(r.radioBeacons).toBeDefined();
  });

  it("location.allVesselsBoundingBox (iterator)", async () => {
    let count = 0;
    for await (const item of client.location.allVesselsBoundingBox({ ...BBOX, paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("location.allVesselsRadius (iterator)", async () => {
    let count = 0;
    for await (const item of client.location.allVesselsRadius({ ...RADIUS, paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("location.allPortsBoundingBox (iterator)", async () => {
    let count = 0;
    for await (const item of client.location.allPortsBoundingBox({ ...BBOX, paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("location.allPortsRadius (iterator)", async () => {
    let count = 0;
    for await (const item of client.location.allPortsRadius({ ...RADIUS, paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("location.allDgpsBoundingBox (iterator)", async () => {
    let count = 0;
    for await (const item of client.location.allDgpsBoundingBox({ ...BBOX, paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("location.allDgpsRadius (iterator)", async () => {
    let count = 0;
    for await (const item of client.location.allDgpsRadius({ ...RADIUS, paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("location.allLightAidsBoundingBox (iterator)", async () => {
    let count = 0;
    for await (const item of client.location.allLightAidsBoundingBox({ ...BBOX, paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("location.allLightAidsRadius (iterator)", async () => {
    let count = 0;
    for await (const item of client.location.allLightAidsRadius({ ...RADIUS, paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("location.allModusBoundingBox (iterator)", async () => {
    let count = 0;
    for await (const item of client.location.allModusBoundingBox({ ...BBOX, paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("location.allModusRadius (iterator)", async () => {
    let count = 0;
    for await (const item of client.location.allModusRadius({ ...RADIUS, paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("location.allRadioBeaconsBoundingBox (iterator)", async () => {
    let count = 0;
    for await (const item of client.location.allRadioBeaconsBoundingBox({ ...BBOX, paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  it("location.allRadioBeaconsRadius (iterator)", async () => {
    let count = 0;
    for await (const item of client.location.allRadioBeaconsRadius({ ...RADIUS, paginationLimit: 2 })) {
      expect(item).toBeDefined();
      count++;
      if (count >= 3) break;
    }
  });

  // ================================================================
  // ================================================================
}, SMOKE_TIMEOUT_MS);
