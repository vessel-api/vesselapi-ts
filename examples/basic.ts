import { VesselClient, VesselAPIError } from "../src/index.js";

async function main() {
  const client = new VesselClient();

  // Search for vessels by name.
  console.log("--- Search Vessels ---");
  const searchResult = await client.search.vessels({ filterName: "Ever Given" });
  for (const v of searchResult.vessels ?? []) {
    console.log(`Vessel: ${v.name} (IMO: ${v.imo})`);
  }

  // Search for vessels by flag (e.g. Panama-flagged container ships).
  console.log("\n--- Search Vessels by Flag ---");
  const flagResult = await client.search.vessels({
    filterFlag: "PA",
    filterVesselType: "Container Ship",
    paginationLimit: 5,
  });
  for (const v of flagResult.vessels ?? []) {
    console.log(`Vessel: ${v.name} (IMO: ${v.imo}, Country: ${v.country})`);
  }

  // Search for ports by country.
  console.log("\n--- Search Ports by Country ---");
  const portSearch = await client.search.ports({ filterCountry: "NL", paginationLimit: 5 });
  for (const p of portSearch.ports ?? []) {
    console.log(`Port: ${p.name} (${p.unlo_code})`);
  }

  // Get a port by UNLOCODE.
  console.log("\n--- Get Port ---");
  const portResp = await client.ports.get("NLRTM");
  if (portResp.port) {
    console.log(`Port: ${portResp.port.name} (${portResp.port.unlo_code})`);
  }

  // Get vessel details by IMO number (defaults to IMO; pass filterIdType: "mmsi" for MMSI).
  console.log("\n--- Vessel by IMO ---");
  const vesselResp = await client.vessels.get("9811000");
  if (vesselResp.vessel) {
    console.log(`Vessel: ${vesselResp.vessel.name} (Type: ${vesselResp.vessel.vessel_type})`);
  }

  // Get the vessel's latest AIS position.
  console.log("\n--- Vessel Position ---");
  const posResp = await client.vessels.position("9811000");
  if (posResp.vesselPosition) {
    console.log(`Position: ${posResp.vesselPosition.latitude}, ${posResp.vesselPosition.longitude}`);
    console.log(`Speed: ${posResp.vesselPosition.sog} knots, Heading: ${posResp.vesselPosition.heading}`);
  }

  // Find vessels within 10 km of Rotterdam.
  console.log("\n--- Vessels Near Rotterdam ---");
  const nearby = await client.location.vesselsRadius({
    latitude: 51.9225,
    longitude: 4.47917,
    radius: 10000,
  });
  for (const v of nearby.vessels ?? []) {
    console.log(`${v.vessel_name} (IMO: ${v.imo}) at ${v.latitude}, ${v.longitude}`);
  }

  // Handle a not-found port gracefully.
  console.log("\n--- Not Found Handling ---");
  try {
    await client.ports.get("ZZZZZ");
  } catch (err) {
    if (err instanceof VesselAPIError) {
      if (err.isNotFound) {
        console.log(`Port ZZZZZ not found (status ${err.statusCode})`);
      } else if (err.isRateLimited) {
        console.log("Rate limited — try again later");
      } else {
        console.log(`API error: ${err.message} (status ${err.statusCode})`);
      }
    }
  }

  // Auto-paginate through port events.
  console.log("\n--- Port Events (paginated) ---");
  let count = 0;
  for await (const event of client.portEvents.listAll({ paginationLimit: 10 })) {
    console.log(`Event: ${event.event} at ${event.timestamp}`);
    count++;
    if (count >= 25) break;
  }
  console.log(`Total events shown: ${count}`);
}

main().catch(console.error);
