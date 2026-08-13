# Changelog

All notable changes to this package are documented here.
This project follows [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-08-13

Vessel ownership, classification and inspection data, and NAVTEX messages were
retired from the VesselAPI service on **10 August 2026**. This release removes
the corresponding client surface.

### Removed (breaking)

Calling these returned HTTP 410 from that date onward.

| Removed | Replacement |
|---|---|
| `vessels.classification()` | none |
| `vessels.inspections()`, `vessels.allInspections()` | none |
| `vessels.inspectionDetail()` | none |
| `vessels.ownership()` | none |
| `client.navtex` (whole service: `list()`, `listAll()`) | none |

Also removed:

- **Search filters** `filterClassSociety` and `filterOwner` on
  `search.vessels()`. The API rejects both with HTTP 400.
- **Vessel fields** `builder`, `class_society`, `owner_name` and `manager_name`.
- **Types** for the removed endpoints and their nested models.

There is no alternative source for this data through the API.

### Added

- **Search**: `q` (free-text across name, IMO, MMSI, ENI and callsign) and
  `filterEni` on `search.vessels()`.
- **Repeatable filters.** `filterFlag` and `filterVesselType` on
  `search.vessels()`, and `filterCountry`, `filterPortType`, `filterSize`,
  `filterHarborSize` and `filterHarborUse` on `search.ports()`, now accept
  `string | string[]`. An array matches any of the values.
- **`filterSat`** on `vessels.position()`. ⚠️ Satellite lookups are charged per
  call against a prepaid balance. Omit it to serve stored positions.
- **`timeFrom` / `timeTo`** on `portEvents.byPort()`, `byPorts()`, `byVessels()`
  and their iterators.
- **Vessel fields**: `eni`, `teu`, `vessel_subtype`, `name_ais`,
  `summer_draught`, `draught_calculated_avg`, `draught_observed_max`,
  `speed_calculated_avg`, `speed_observed_max`.
- **Search metadata**: `FindVesselsResponse._meta` (`matchedOn`, `query`), and
  `suggestedIdType`, a hint to retry with the other identifier type.
- **Error handling**: `VesselPaymentRequiredError` (402, satellite credits
  exhausted) and `VesselForbiddenError` (403, key suspended or feature not on
  your plan), plus `isPaymentRequired` / `isForbidden`. All errors expose the
  API's `code` and `type`, which stay stable when a `message` is reworded.

### Changed (breaking)

- **Parameters the API requires are now required in TypeScript too.** On these
  methods the `options` argument is required as well.
  - `location.*BoundingBox()` and `location.all*BoundingBox()`: `latMin`,
    `latMax`, `lonMin`, `lonMax`.
  - `location.*Radius()` and `location.all*Radius()`: `latitude`, `longitude`,
    `radius`.
  - `search.dgps()`, `search.lightAids()`, `search.modus()`,
    `search.radioBeacons()` and their `all*` variants: `filterName`.
  - `portEvents.byPorts()` / `allByPorts()`: `filterPortName`.
    `portEvents.byVessels()` / `allByVessels()`: `filterVesselName`.
  - `vessels.positions()` / `allPositions()`: `filterIds`.
  - `search.vessels()` and `search.ports()` are unchanged.
- **Parameters with a fixed set of values are now unions**, all three exported.
  A `string` variable needs the matching type or an assertion.
  - `filterIdType`: `IdType` (`"imo" | "mmsi"`), still optional, still
    defaulting to `"imo"`.
  - `filterEventType`: `EventType` (`"arrival" | "departure" | "all"`).
  - `filterSortOrder`: `SortOrder` (`"asc" | "desc"`).

### Fixed

- **Auto-paginating iterators stopped early on an empty page.** Every `all*()`
  and `listAll()` iterator ended on the first page with no items, even when that
  page carried a `nextToken`, so results could be silently short. They now
  continue until the service stops issuing a token.
- **Identifiers are escaped before they go in the path.** A vessel id or
  UN/LOCODE containing `/`, `?` or `#` could change which endpoint was called,
  and the response was then parsed as the wrong shape. Worth upgrading if you
  pass user input as an identifier.
- **`vessels.allPositions()` ignored `timeFrom` and `timeTo`**, so a
  time-bounded iteration returned the unbounded stream.
- **`ports.inbound()` and `ports.allInbound()` no longer require an ETA window.**
  The API defaults to now and 72 hours ahead.
- The User-Agent reported `1.0.0` regardless of the installed version.

### Attribution

Emissions and casualty data: © European Union. Source: European Maritime Safety
Agency (EMSA), THETIS-MRV (EU MRV, Regulation (EU) 2015/757) and the European
Marine Casualty Information Platform (EMCIP). See the README.
