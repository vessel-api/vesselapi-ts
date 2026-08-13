// ---------------------------------------------------------------------------
// Shared / helper sub-models
// ---------------------------------------------------------------------------

export interface GeoJSON {
  coordinates?: number[];
  type?: string;
}

export interface PortCountry {
  code?: string;
  name?: string;
}

export interface PortReference {
  country?: string;
  name?: string;
  unlo_code?: string;
}

export interface VesselReference {
  imo?: number;
  mmsi?: number;
  name?: string;
}

export interface VesselFormerName {
  name?: string;
  year_until?: string;
}


// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------












// ---------------------------------------------------------------------------
// Resolution metadata (ID fallback)
// ---------------------------------------------------------------------------

/** Metadata about ID resolution fallback. Present when the API resolved using a different ID type. */
export interface ResolutionMeta {
  requestedIdType?: string;
  resolvedIdType?: string;
  resolvedId?: number;
  /**
   * When set, hints that the caller may get a result by retrying with the
   * opposite identifier type. Emitted only on a total miss where the
   * counterpart id was neither supplied nor derivable.
   */
  suggestedIdType?: string;
}

/** Metadata about which fields a `q` search matched on. */
export interface VesselSearchMeta {
  /**
   * Maps the index of a vessel in the `vessels` array to the fields that
   * matched it, e.g. `{"0":["eni"],"1":["imo"]}`. Field order within an entry
   * is stable: eni, imo, mmsi, callsign, name.
   */
  matchedOn?: Record<string, string[]>;
  /** Echoes the `q` value the fields were matched against. */
  query?: string;
}

// ---------------------------------------------------------------------------
// Vessel models
// ---------------------------------------------------------------------------

export interface Vessel {
  breadth?: number;
  breadth_unit?: string;
  call_sign?: string;
  country?: string;
  country_code?: string;
  deadweight_tonnage?: number;
  draft?: number;
  draft_unit?: string;
  /** Mean reported draught (m) over the last 31 days of ETA messages. */
  draught_calculated_avg?: number;
  /** Peak reported draught (m) over the last 31 days of ETA messages. */
  draught_observed_max?: number;
  engine_model_name?: string;
  engine_type?: number;
  /** European Number of Identification for inland waterway vessels (8 digits). */
  eni?: string;
  former_names?: VesselFormerName[];
  gross_tonnage?: number;
  home_port?: string;
  imo?: number;
  kilowatt_power?: number;
  length?: number;
  length_unit?: string;
  mmsi?: number;
  name?: string;
  /** The name as currently broadcast on AIS; may differ from the registered name. */
  name_ais?: string;
  operating_status?: string;
  /** Mean speed-over-ground (kn) over the last 31 days of position reports. */
  speed_calculated_avg?: number;
  /** 99th-percentile peak speed-over-ground (kn) over the last 31 days. */
  speed_observed_max?: number;
  /** Maximum design draught (m), summer-load line. */
  summer_draught?: number;
  /** Twenty-foot equivalent unit container capacity. Container ships only. */
  teu?: number;
  vessel_type?: string;
  /** Finer-grained classification beyond vessel_type. */
  vessel_subtype?: string;
  year_built?: number;
}

export interface VesselResponse {
  vessel?: Vessel;
  _meta?: ResolutionMeta;
}

export interface VesselPosition {
  cog?: number;
  heading?: number;
  imo?: number;
  latitude?: number;
  location?: GeoJSON;
  longitude?: number;
  mmsi?: number;
  nav_status?: number;
  processed_timestamp?: string;
  sog?: number;
  suspected_glitch?: boolean;
  timestamp?: string;
  vessel_name?: string;
}

export interface VesselPositionResponse {
  vesselPosition?: VesselPosition;
  _meta?: ResolutionMeta;
}

export interface VesselPositionsResponse {
  vesselPositions?: VesselPosition[];
  nextToken?: string;
  _meta?: ResolutionMeta;
}

// ---------------------------------------------------------------------------
// Vessel sub-resource models
// ---------------------------------------------------------------------------

export interface MarineCasualty {
  atCoding?: string[];
  casualtyReportNr?: string;
  cfCoding?: string[];
  collectedAt?: string;
  competentAuthority?: string[];
  dateOfOccurrence?: string;
  deviation?: string[];
  eventType?: string[];
  finishedInvestigation?: boolean;
  imoNr?: string[];
  interimReport?: boolean;
  investigatingState?: string;
  livesLostTotal?: string;
  nameOfShip?: string[];
  occurrenceSeverity?: string;
  occurrenceUuid?: string;
  occurrenceWithPersons?: string[];
  occurrenceWithShips?: string[];
  peopleInjuredTotal?: string;
  pollution?: boolean;
  shipCraftType?: string[];
  srCoding?: string[];
}

export interface MarineCasualtiesResponse {
  casualties?: MarineCasualty[];
  nextToken?: string;
  _meta?: ResolutionMeta;
}



export interface VesselEmission {
  co2_emissions_at_berth?: number;
  co2_emissions_on_laden_voyages?: number;
  co2_emissions_total?: number;
  co2_per_distance?: number;
  co2_per_transport_work?: number;
  collected_at?: string;
  distance_through_ice?: number;
  doc_expiry_date?: string;
  doc_issue_date?: string;
  flag_code?: string;
  flag_name?: string;
  fuel_consumption_hfo?: number;
  fuel_consumption_lfo?: number;
  fuel_consumption_lng?: number;
  fuel_consumption_mdo?: number;
  fuel_consumption_mgo?: number;
  fuel_consumption_other?: number;
  fuel_consumption_total?: number;
  fuel_per_distance?: number;
  fuel_per_transport_work?: number;
  home_port?: string;
  ice_class?: string;
  imo?: number;
  monitoring_method_a?: string;
  monitoring_method_b?: string;
  monitoring_method_c?: string;
  monitoring_method_d?: string;
  name?: string;
  port_calls_outside_eu?: number;
  port_calls_within_eu?: number;
  reporting_period?: string;
  technical_efficiency?: string;
  technical_efficiency_value?: number;
  time_at_sea_through_ice?: number;
  total_time_at_sea?: number;
  unique_key?: string;
  verifier_accreditation?: string;
  verifier_address?: string;
  verifier_name?: string;
  vessel_type?: string;
}

export interface VesselEmissionsResponse {
  emissions?: VesselEmission[];
  nextToken?: string;
  _meta?: ResolutionMeta;
}

export interface VesselETA {
  destination?: string;
  destination_port?: string;
  draught?: number;
  eta?: string;
  imo?: number;
  mmsi?: number;
  timestamp?: string;
  vessel_name?: string;
}

export interface VesselETAResponse {
  vesselEta?: VesselETA;
  _meta?: ResolutionMeta;
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------






// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------



// ---------------------------------------------------------------------------
// Port models
// ---------------------------------------------------------------------------

export interface Port {
  anchorage_depth?: number;
  anchorage_depth_unit?: string;
  cargo_handling_depth?: number;
  cargo_handling_depth_unit?: string;
  channel_depth?: number;
  channel_depth_unit?: string;
  country?: PortCountry;
  garbage_disposal?: boolean;
  harbor_size?: string;
  harbor_type?: string;
  harbor_use?: string;
  has_drydock?: boolean;
  latitude?: number;
  location?: GeoJSON;
  longitude?: number;
  max_vessel_beam?: number;
  max_vessel_beam_unit?: string;
  max_vessel_draft?: number;
  max_vessel_draft_unit?: string;
  max_vessel_length?: number;
  max_vessel_length_unit?: string;
  medical_facilities?: boolean;
  name?: string;
  navigation_area?: string;
  pilotage_available?: boolean;
  pilotage_compulsory?: boolean;
  port_security?: boolean;
  region_name?: string;
  repair_capability?: string;
  shelter?: string;
  size?: string;
  supply_diesel?: boolean;
  supply_fuel?: boolean;
  supply_water?: boolean;
  traffic_separation_scheme?: boolean;
  tugs_available?: boolean;
  type?: string;
  unlo_code?: string;
  vessel_traffic_service?: boolean;
}

export interface PortResponse {
  port?: Port;
}

// ---------------------------------------------------------------------------
// Port event models
// ---------------------------------------------------------------------------

export interface PortEvent {
  event?: string;
  port?: PortReference;
  timestamp?: string;
  vessel?: VesselReference;
}

export interface PortEventsResponse {
  portEvents?: PortEvent[];
  nextToken?: string;
  _meta?: ResolutionMeta;
}

export interface PortEventResponse {
  portEvent?: PortEvent;
  _meta?: ResolutionMeta;
}

// ---------------------------------------------------------------------------
// Port inbound models
// ---------------------------------------------------------------------------

export interface PortInboundResponse {
  vesselETAs?: VesselETA[];
  nextToken?: string;
}

// ---------------------------------------------------------------------------
// Search models
// ---------------------------------------------------------------------------

export interface FindVesselsResponse {
  vessels?: Vessel[];
  nextToken?: string;
  _meta?: VesselSearchMeta;
}

export interface FindPortsResponse {
  ports?: Port[];
  nextToken?: string;
}

export interface DGPSStation {
  aid_type?: string;
  delete_flag?: string;
  feature_number?: number;
  frequency?: number;
  geopolitical_heading?: string;
  location?: GeoJSON;
  name?: string;
  notice_number?: number;
  notice_week?: string;
  notice_year?: string;
  position?: string;
  post_note?: string;
  preceding_note?: string;
  range?: number;
  region_heading?: string;
  remarks?: string;
  remove_from_list?: string;
  station_id?: string;
  transfer_rate?: number;
  volume_number?: string;
}

export interface FindDGPSStationsResponse {
  dgpsStations?: DGPSStation[];
  nextToken?: string;
}

export interface LightAid {
  aid_type?: string;
  characteristic?: string;
  characteristic_number?: number;
  delete_flag?: string;
  feature_number?: string;
  geopolitical_heading?: string;
  height_feet_meters?: string;
  local_heading?: string;
  location?: GeoJSON;
  name?: string;
  notice_number?: number;
  notice_week?: string;
  notice_year?: string;
  position?: string;
  post_note?: string;
  preceding_note?: string;
  range?: string;
  region_heading?: string;
  remarks?: string;
  remove_from_list?: string;
  structure?: string;
  subregion_heading?: string;
  volume_number?: string;
}

export interface FindLightAidsResponse {
  lightAids?: LightAid[];
  nextToken?: string;
}

export interface MODU {
  date?: string;
  distance?: number;
  latitude?: number;
  location?: GeoJSON;
  longitude?: number;
  name?: string;
  navigation_area?: string;
  position?: string;
  region?: number;
  rig_status?: string;
  special_status?: string;
  sub_region?: number;
}

export interface FindMODUsResponse {
  modus?: MODU[];
  nextToken?: string;
}

export interface RadioBeacon {
  aid_type?: string;
  characteristic?: string;
  delete_flag?: string;
  feature_number?: number;
  frequency?: string;
  geopolitical_heading?: string;
  location?: GeoJSON;
  name?: string;
  notice_number?: number;
  notice_week?: string;
  notice_year?: string;
  position?: string;
  post_note?: string;
  preceding_note?: string;
  range?: string;
  region_heading?: string;
  remove_from_list?: string;
  sequence_text?: string;
  station_remark?: string;
  volume_number?: string;
}

export interface FindRadioBeaconsResponse {
  radioBeacons?: RadioBeacon[];
  nextToken?: string;
}

// ---------------------------------------------------------------------------
// Location query response models
// ---------------------------------------------------------------------------

export interface VesselsWithinLocationResponse {
  vessels?: VesselPosition[];
  nextToken?: string;
}

export interface PortsWithinLocationResponse {
  ports?: Port[];
  nextToken?: string;
}

export interface DGPSStationsWithinLocationResponse {
  dgpsStations?: DGPSStation[];
  nextToken?: string;
}

export interface LightAidsWithinLocationResponse {
  lightAids?: LightAid[];
  nextToken?: string;
}

export interface MODUsWithinLocationResponse {
  modus?: MODU[];
  nextToken?: string;
}

export interface RadioBeaconsWithinLocationResponse {
  radioBeacons?: RadioBeacon[];
  nextToken?: string;
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------


