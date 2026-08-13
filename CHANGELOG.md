# Changelog

All notable changes to this package are documented here.
This project follows [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-08-13

Vessel ownership, classification and inspection data, and NAVTEX messages, were
retired from the VesselAPI service on **10 August 2026**. This release removes
the corresponding client surface and brings the SDK back in line with the API.

### Removed (breaking)

These endpoints no longer exist. Calling them returned HTTP 410 from 10 August
2026 onward; the methods are now gone so the failure surfaces at compile time
instead of at runtime.

| Removed | Replacement |
|---|---|
| `vessels.classification()` | none |
| `vessels.inspections()`, `vessels.allInspections()` | none |
| `vessels.inspectionDetail()` | none |
| `vessels.ownership()` | none |
| `client.navtex` (whole service: `list()`, `listAll()`) | none |

Also removed:

- **Search filters** `filterClassSociety` and `filterOwner` on
  `search.vessels()`. The API began rejecting both with HTTP 400, so any call
  passing them was already failing.
- **Vessel fields** `builder`, `class_society`, `owner_name` and `manager_name`.
  The API no longer returns them.
- **`VesselEmission.source_url`**, which the API does not define and has never
  populated. Reading it always produced `undefined`.
- **Types** for the removed endpoints: `ClassificationResponse`,
  `OwnershipResponse`, `InspectionsResponse`, `InspectionDetailResponse`,
  `Navtex`, `NavtexMessagesResponse` and their nested models (23 in total).

**Migrating from 1.x:** delete calls to the methods above. There is no
alternative source for that data through this API. Remove `filterClassSociety`
and `filterOwner` from any search call. If you read `owner_name`, `manager_name`,
`builder` or `class_society` from a vessel, those properties are gone.

### Added

- **Search**: `q` (free-text across name, IMO, MMSI, ENI and callsign) and
  `filterEni` on `search.vessels()`.
- **Repeatable filters.** `filterFlag` and `filterVesselType` on
  `search.vessels()`, and `filterCountry`, `filterPortType`, `filterSize`,
  `filterHarborSize` and `filterHarborUse` on `search.ports()`, now accept
  `string | string[]`. An array matches any of the values. Passing a single
  string behaves exactly as before.
- **`filterSat`** on `vessels.position()`. ⚠️ Satellite lookups draw on a
  prepaid balance and are charged per call. Omit it to serve stored positions.
- **`timeFrom` / `timeTo`** on `portEvents.byPort()`, `byPorts()`, `byVessels()`
  and their iterators.
- **Vessel fields**: `eni`, `teu`, `vessel_subtype`, `name_ais`,
  `summer_draught`, `draught_calculated_avg`, `draught_observed_max`,
  `speed_calculated_avg`, `speed_observed_max`. All are returned by the API
  but were previously discarded by the client.
- **Search metadata**: `FindVesselsResponse._meta` (`matchedOn`, `query`), and
  `suggestedIdType` on resolution metadata, a hint to retry with the other
  identifier type when a lookup misses.
- **Error handling**: `VesselPaymentRequiredError` (402, satellite credits
  exhausted) and `VesselForbiddenError` (403, key suspended or feature not on
  your plan), plus `isPaymentRequired` / `isForbidden` accessors. All errors now
  expose the API's machine-readable `code` and `type`. Branch on those rather
  than on `message`, which may be reworded.

### Changed (breaking)

- **Parameters the API requires are now required in TypeScript too.** A call
  that omitted one used to compile and then fail with HTTP 400 at runtime. It
  now fails to compile, so the mistake surfaces in your editor.
  - `location.*BoundingBox()` and `location.all*BoundingBox()`: `latMin`,
    `latMax`, `lonMin`, `lonMax`.
  - `location.*Radius()` and `location.all*Radius()`: `latitude`, `longitude`,
    `radius`.
  - `search.dgps()`, `search.lightAids()`, `search.modus()`,
    `search.radioBeacons()` and their `all*` variants: `filterName`.
  - `portEvents.byPorts()` / `allByPorts()`: `filterPortName`.
    `portEvents.byVessels()` / `allByVessels()`: `filterVesselName`.
  - `vessels.positions()` / `allPositions()`: `filterIds`.
- On those 38 methods the options argument itself is no longer optional.
  Pagination, time bounds and `filterIdType` stay optional within it.
- `search.vessels()` and `search.ports()` are unaffected: the API marks their
  `filterName` optional, and it stays optional here.
- `filterIdType` remains optional and still defaults to `"imo"`, so you pass it
  only to look a vessel up by MMSI. Its type has changed, see below.
- **Parameters with a fixed set of values are now unions, not `string`.** The
  API rejects anything outside the set, so a typo such as `filterIdType: "IMO"`
  used to compile and then fail with HTTP 400. It now fails to compile.
  - `filterIdType`: `IdType` (`"imo" | "mmsi"`), on 12 methods.
  - `filterEventType`: `EventType` (`"arrival" | "departure" | "all"`).
  - `filterSortOrder`: `SortOrder` (`"asc" | "desc"`).
  - All three types are exported, so you can annotate your own variables with
    them. A `string` variable passed to one of these now needs a narrower type
    or an assertion.

**Migrating from 1.x:** pass the values you were already passing. Any call that
compiled without them was returning HTTP 400 rather than data. If you hold one
of the enum values in a `string` variable, type it as `IdType`, `EventType` or
`SortOrder`.

### Fixed

- **`vessels.allPositions()` silently ignored `timeFrom` and `timeTo`.** It
  accepted both and dropped them, so a time-bounded iteration returned the
  unbounded stream. If you relied on this iterator with time bounds, your
  results were wider than you asked for.
- **`ports.inbound()` and `ports.allInbound()` required an ETA window** they
  should not have. Both bounds have been optional in the API since these methods
  were added in 1.1.0, and the service defaults to now and 72 hours ahead. You
  can now omit them.
- **Auto-paginating iterators stopped early on an empty page.** Every `all*()`
  and `listAll()` iterator ended as soon as a page came back with no items, even
  when that page carried a `nextToken`. Any remaining pages were dropped
  silently, with no error, so a partial result was indistinguishable from a
  complete one. They now continue until the service stops issuing a token.
- **Identifiers are escaped before they are put in the path.** A vessel id or
  UN/LOCODE containing `/`, `?` or `#` could change which endpoint was called.
  Passing unvalidated input, such as the contents of a search box, sent an
  authenticated request to a different path whose response was then parsed as
  the wrong shape. Nine of the ten path builders were affected.
- The User-Agent reported `1.0.0` regardless of the installed version, so
  version-specific support questions could not be answered accurately.

### Attribution

Emissions and casualty data: © European Union. Source: European Maritime Safety
Agency (EMSA), THETIS-MRV (EU MRV, Regulation (EU) 2015/757) and the European
Marine Casualty Information Platform (EMCIP). See the README.
