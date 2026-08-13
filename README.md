# vesselapi

[![CI](https://github.com/vessel-api/vesselapi-ts/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/vessel-api/vesselapi-ts/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/vesselapi.svg)](https://www.npmjs.com/package/vesselapi)
[![Node](https://img.shields.io/node/v/vesselapi.svg)](https://www.npmjs.com/package/vesselapi)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

TypeScript client for the [Vessel Tracking API](https://vesselapi.com): maritime vessel tracking, port events, emissions, and nautical infrastructure. Zero runtime dependencies, using native `fetch` only.

**Resources**: [Documentation](https://vesselapi.com/docs) | [API Explorer](https://vesselapi.com/api-reference) | [Dashboard](https://dashboard.vesselapi.com) | [Contact Support](mailto:support@vesselapi.com)

## Install

```bash
npm install vesselapi
```

Requires Node.js 18+.

## Quick Start

```typescript
import { VesselClient } from "vesselapi";

const client = new VesselClient("your-api-key");

// Search for a vessel by name.
const { vessels } = await client.search.vessels({ filterName: "Ever Given" });
for (const v of vessels ?? []) {
  console.log(`${v.name} (IMO ${v.imo})`);
}

// Get a port by UN/LOCODE.
const { port } = await client.ports.get("NLRTM");
console.log(port?.name);

// Auto-paginate through port events.
for await (const event of client.portEvents.listAll({ paginationLimit: 10 })) {
  console.log(`${event.event} at ${event.timestamp}`);
}
```

## Available Services

| Service | Methods | Description |
|---------|---------|-------------|
| `vessels` | `get`, `position`, `casualties`, `emissions`, `eta`, `positions` | Vessel details, positions, and records |
| `ports` | `get`, `inbound` | Port lookup by UN/LOCODE and inbound vessels |
| `portEvents` | `list`, `byPort`, `byPorts`, `byVessel`, `lastByVessel`, `byVessels` | Vessel arrival/departure events |
| `emissions` | `list` | EU MRV emissions data |
| `search` | `vessels`, `ports`, `dgps`, `lightAids`, `modus`, `radioBeacons` | Full-text search across entity types |
| `location` | `vesselsBoundingBox`, `vesselsRadius`, `portsBoundingBox`, `portsRadius`, `dgpsBoundingBox`, `dgpsRadius`, `lightAidsBoundingBox`, `lightAidsRadius`, `modusBoundingBox`, `modusRadius`, `radioBeaconsBoundingBox`, `radioBeaconsRadius` | Geo queries by bounding box or radius |

**33 methods total**, one per API endpoint, plus 28 auto-pagination iterators.

## Required Parameters

Where the API requires a query parameter, the SDK requires the argument, so a
missing value is a compile error instead of an HTTP 400 at runtime:

| Method(s) | Required |
|---|---|
| `location.*BoundingBox` and `location.all*BoundingBox` | `latMin`, `latMax`, `lonMin`, `lonMax` |
| `location.*Radius` and `location.all*Radius` | `latitude`, `longitude`, `radius` |
| `search.dgps`, `search.lightAids`, `search.modus`, `search.radioBeacons` and their `all*` variants | `filterName` |
| `portEvents.byPorts`, `portEvents.allByPorts` | `filterPortName` |
| `portEvents.byVessels`, `portEvents.allByVessels` | `filterVesselName` |
| `vessels.positions`, `vessels.allPositions` | `filterIds` |

Everything else on those methods stays optional, including pagination and time
bounds. `filterIdType` is also required by the API, but the SDK sends `"imo"`
unless you say otherwise, so you only pass it to look a vessel up by MMSI.

## Vessel Lookup & Location

```typescript
// Get vessel details by IMO number (defaults to IMO; pass filterIdType: "mmsi" for MMSI).
const { vessel } = await client.vessels.get("9811000");
console.log(`${vessel?.name} (${vessel?.vessel_type})`);

// Get the vessel's latest AIS position, falling back to satellite AIS.
const { vesselPosition } = await client.vessels.position("9811000", { filterSat: true });
console.log(`Position: ${vesselPosition?.latitude}, ${vesselPosition?.longitude}`);

// Find all vessels within 10 km of Rotterdam.
const nearby = await client.location.vesselsRadius({
  latitude: 51.9225,
  longitude: 4.47917,
  radius: 10000,
});
for (const v of nearby.vessels ?? []) {
  console.log(`${v.vessel_name} at ${v.latitude}, ${v.longitude}`);
}
```

## Search

`search.vessels` accepts `q`, a unified search across IMO, MMSI, ENI, callsign and
name. One value can return several vessels, and `_meta.matchedOn` maps each result's
index to the fields it matched on.

```typescript
const res = await client.search.vessels({ q: "4606770" });
console.log(res._meta?.matchedOn); // { "0": ["eni"] }
```

Filters the API declares as repeatable take either one value or an array. An array is
sent as a repeated query parameter, so the values are OR-ed:

```typescript
// ?filter.flag=PA&filter.flag=LR&filter.vesselType=Container%20Ship
await client.search.vessels({
  filterFlag: ["PA", "LR"],
  filterVesselType: "Container Ship",
});

await client.search.ports({ filterCountry: ["NL", "BE"], filterHarborUse: ["CARGO"] });
```

These are `filterFlag` and `filterVesselType` on `search.vessels`; `filterCountry`,
`filterPortType`, `filterSize`, `filterHarborSize` and `filterHarborUse` on
`search.ports`; and `filterIds` on `vessels.positions`.

## Error Handling

All methods throw specific error types on non-2xx responses:

```typescript
import {
  VesselAPIError,
  VesselForbiddenError,
  VesselNotFoundError,
  VesselPaymentRequiredError,
  VesselRateLimitError,
} from "vesselapi";

try {
  await client.ports.get("ZZZZZ");
} catch (err) {
  if (err instanceof VesselNotFoundError) {
    console.log("Port not found");
  } else if (err instanceof VesselRateLimitError) {
    console.log("Rate limited, backing off");
  } else if (err instanceof VesselPaymentRequiredError) {
    console.log("Out of satellite credits");
  } else if (err instanceof VesselForbiddenError) {
    console.log("Forbidden:", err.code);
  } else if (err instanceof VesselAPIError) {
    console.log(err.statusCode, err.message);
  }
}
```

| Status | Error class | Meaning |
|--------|-------------|---------|
| 401 | `VesselAuthError` | API key missing, invalid or revoked |
| 402 | `VesselPaymentRequiredError` | Out of satellite credits, with no stored position to fall back on |
| 403 | `VesselForbiddenError` | Key suspended for sustained quota abuse, or feature not on your plan |
| 404 | `VesselNotFoundError` | Resource does not exist |
| 429 | `VesselRateLimitError` | Rate or quota limit hit (retried automatically) |
| 5xx | `VesselServerError` | Server-side failure (retried automatically) |
| other | `VesselAPIError` | Any other non-2xx response |

Every error carries the API's machine-readable `code` and `type` alongside
`statusCode`, `message` and the raw `body`. Branch on `code` rather than on the
message text, which is free-form and may be reworded:

```typescript
try {
  await client.vessels.position("9811000", { filterSat: true });
} catch (err) {
  if (err instanceof VesselPaymentRequiredError) {
    // code === "insufficient_credits": top up, or retry with filterSat: false.
    const { vesselPosition } = await client.vessels.position("9811000");
    console.log(vesselPosition?.latitude);
  } else if (err instanceof VesselForbiddenError) {
    if (err.code === "feature_not_available") {
      console.log("Upgrade your plan to use this endpoint");
    } else {
      // code === "forbidden": key suspended; see the Retry-After header.
      console.log("Key suspended:", err.message);
    }
  }
}
```

402 is only returned by `vessels.position` when `filterSat: true`. 403 can come from
any endpoint. Neither status is retried, since retrying cannot succeed.

`code` values are typed as `ErrorCode` (`insufficient_credits`,
`feature_not_available`, `endpoint_retired`, `invalid_api_key`, …) and `type` as
`ErrorType` (`payment_required_error`, `forbidden_error`, …). Both are `undefined`
when a response carries no structured body.

## Auto-Pagination

Every list endpoint has an `all*` / `listAll` variant returning an async iterator:

```typescript
// Async iteration
for await (const vessel of client.search.allVessels({ filterVesselType: "Tanker" })) {
  console.log(vessel.name);
}

// Collect all pages into an array
const all = await client.search.allVessels({
  filterVesselType: "Tanker",
  paginationLimit: 50,
}).collect();

// Manual pagination
const page1 = await client.search.vessels({ filterName: "Ever Given" });
const page2 = await client.search.vessels({
  filterName: "Ever Given",
  paginationNextToken: page1.nextToken,
});
```

## Configuration

```typescript
const client = new VesselClient("your-api-key", {
  baseUrl: "https://api.vesselapi.com/v1", // default
  maxRetries: 3,    // default, retries on 429/5xx
  timeoutMs: 30000, // default, 30 seconds per attempt
  userAgent: "my-app/1.0",
});
```

`timeoutMs` applies to each attempt, not to the call as a whole. A request that
is retried the default three times can therefore run for about four times the
timeout, plus the backoff between attempts. Pass your own `signal` if you need a
deadline for the whole call: when a signal is supplied the client uses it and
does not apply `timeoutMs`.

The API key can also be provided via the `VESSELAPI_API_KEY` environment variable:

```typescript
const client = new VesselClient(); // reads from VESSELAPI_API_KEY
```

## Retry Logic

The SDK automatically retries failed requests with exponential backoff:

- **429 (Rate Limited)**: Retried for all HTTP methods
- **5xx (Server Error)**: Retried only for idempotent methods (GET, HEAD, PUT, DELETE, OPTIONS)
- **Network errors**: Retried only for idempotent methods
- **Retry-After header**: Respected (both integer seconds and HTTP-date formats)
- **Backoff**: Exponential with jitter, capped at 30 seconds

## Documentation

- [API Documentation](https://vesselapi.com/docs): endpoint guides, request/response schemas, and usage examples
- [API Explorer](https://vesselapi.com/api-reference): interactive API reference
- [Dashboard](https://dashboard.vesselapi.com): manage API keys and monitor usage

## Contributing & Support

Found a bug, have a feature request, or need help? You're welcome to [open an issue](https://github.com/vessel-api/vesselapi-ts/issues). For API-level bugs and feature requests, please use the [main VesselAPI repository](https://github.com/vessel-api/VesselApi/issues).

For security vulnerabilities, **do not** open a public issue. Email security@vesselapi.com instead.

## Data Sources & Attribution

Emissions and casualty data: © European Union. Source: European Maritime Safety Agency
(EMSA): THETIS-MRV (EU MRV, Regulation (EU) 2015/757) and the European Marine Casualty
Information Platform (EMCIP). Reused under the European Commission reuse notice
(Commission Decision 2011/833/EU), which authorises reuse for commercial and
non-commercial purposes with acknowledgement of the source. Data may be transformed and
combined; EMSA does not endorse this service.

## License

[MIT](LICENSE)
