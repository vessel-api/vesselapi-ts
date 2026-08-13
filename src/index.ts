export { VesselClient } from "./client.js";
export type { ClientOptions } from "./client.js";
export { VERSION, DEFAULT_BASE_URL } from "./constants.js";
export {
  VesselAPIError,
  VesselAuthError,
  VesselNotFoundError,
  VesselPaymentRequiredError,
  VesselForbiddenError,
  VesselRateLimitError,
  VesselServerError,
  errorFromResponse,
} from "./errors.js";
export type { ErrorCode, ErrorType } from "./errors.js";
export { PageIterator } from "./iterator.js";
export type { FetchPage } from "./iterator.js";
export {
  VesselsService,
  PortsService,
  PortEventsService,
  EmissionsService,
  SearchService,
  LocationService,
} from "./services.js";
export type { EventType, IdType, MultiFilter, SortOrder } from "./services.js";

// Re-export all model types
export type {
  GeoJSON,
  PortCountry,
  PortReference,
  VesselReference,
  VesselFormerName,
  Vessel,
  VesselResponse,
  VesselPosition,
  VesselPositionResponse,
  VesselPositionsResponse,
  MarineCasualty,
  MarineCasualtiesResponse,
  VesselEmission,
  VesselEmissionsResponse,
  ResolutionMeta,
  VesselSearchMeta,
  VesselETA,
  VesselETAResponse,
  Port,
  PortResponse,
  PortEvent,
  PortEventsResponse,
  PortEventResponse,
  PortInboundResponse,
  FindVesselsResponse,
  FindPortsResponse,
  DGPSStation,
  FindDGPSStationsResponse,
  LightAid,
  FindLightAidsResponse,
  MODU,
  FindMODUsResponse,
  RadioBeacon,
  FindRadioBeaconsResponse,
  VesselsWithinLocationResponse,
  PortsWithinLocationResponse,
  DGPSStationsWithinLocationResponse,
  LightAidsWithinLocationResponse,
  MODUsWithinLocationResponse,
  RadioBeaconsWithinLocationResponse,
} from "./models.js";
