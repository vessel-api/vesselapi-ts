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

export interface BroadcastStation {
  country?: string;
  coverage?: string;
  latitude?: number;
  longitude?: number;
  name?: string;
  station_id?: string;
}

// ---------------------------------------------------------------------------
// Classification sub-models (camelCase per API wire format)
// ---------------------------------------------------------------------------

export interface ClassificationPurpose {
  description?: string;
  isMainPurpose?: boolean;
  purpose?: string;
}

export interface ClassificationCertificate {
  certificate?: string;
  code?: string;
  expires?: string;
  extUntil?: string;
  issued?: string;
  term?: string;
  type?: string;
}

export interface ClassificationCondition {
  condition?: string;
  dueDate?: string;
  imposedDate?: string;
}

export interface ClassificationDimensions {
  bm?: number;
  dm?: number;
  draught?: number;
  dwt?: number;
  grossTon69?: number;
  lbp?: number;
  lengthOverall?: number;
  netTon69?: number;
}

export interface ClassificationHull {
  decksNumber?: string;
}

export interface ClassificationIdentification {
  classStatusString?: string;
  flagCode?: string;
  flagName?: string;
  homePort?: string;
  imoNumber?: string;
  nonClassRelationString?: string;
  officialNumber?: string;
  operationalStatusString?: string;
  purposes?: ClassificationPurpose[];
  register?: string;
  signalLetters?: string;
  typeFormatted?: string;
  vesselId?: string;
  vesselName?: string;
}

export interface ClassificationInfo {
  classEntryDate?: string;
  classNotationString?: string;
  classNotationStringDesign?: string;
  classNotationStringInOperation?: string;
  classNotationStringMain?: string;
  constructionSymbol?: string;
  dualClass?: string;
  equipmentNumber?: string;
  lastClassificationSociety?: string;
  mainClass?: string;
  mainClassMachinery?: string;
  registerNotationString?: string;
}

export interface ClassificationMachinery {
  mainPropulsion?: string;
}

export interface ClassificationOwner {
  docHolderDnvId?: string;
  docHolderImoNumber?: string;
  docHolderName?: string;
  managerDnvId?: string;
  managerImoNumber?: string;
  managerName?: string;
  ownerDnvId?: string;
  ownerImoNumber?: string;
  ownerName?: string;
}

export interface ClassificationSurvey {
  category?: string;
  dueFrom?: string;
  dueTo?: string;
  lastDate?: string;
  location?: string;
  postponed?: string;
  survey?: string;
}

export interface ClassificationYard {
  contractedBuilder?: string;
  contractedBuilderBuildNo?: string;
  dateOfBuild?: string;
  hullYardBuildNo?: string;
  hullYardName?: string;
  keelDate?: string;
}

// ---------------------------------------------------------------------------
// Vessel models
// ---------------------------------------------------------------------------

export interface Vessel {
  breadth?: number;
  breadth_unit?: string;
  builder?: string;
  call_sign?: string;
  class_society?: string;
  country?: string;
  country_code?: string;
  deadweight_tonnage?: number;
  draft?: number;
  draft_unit?: string;
  engine_model_name?: string;
  engine_type?: number;
  former_names?: VesselFormerName[];
  gross_tonnage?: number;
  home_port?: string;
  imo?: number;
  kilowatt_power?: number;
  length?: number;
  length_unit?: string;
  manager_name?: string;
  mmsi?: number;
  name?: string;
  operating_status?: string;
  owner_name?: string;
  vessel_type?: string;
  year_built?: number;
}

export interface VesselResponse {
  vessel?: Vessel;
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
}

export interface VesselPositionsResponse {
  vesselPositions?: VesselPosition[];
  nextToken?: string;
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
}

export interface ClassificationVessel {
  certificates?: ClassificationCertificate[];
  classification?: ClassificationInfo;
  collectedAt?: string;
  conditions?: ClassificationCondition[];
  dimensions?: ClassificationDimensions;
  hull?: ClassificationHull;
  identification?: ClassificationIdentification;
  imo?: number;
  machinery?: ClassificationMachinery;
  owner?: ClassificationOwner;
  surveys?: ClassificationSurvey[];
  yard?: ClassificationYard;
}

export interface ClassificationResponse {
  classification?: ClassificationVessel;
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
  source_url?: string;
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
}

export interface VesselETA {
  destination?: string;
  draught?: number;
  eta?: string;
  imo?: number;
  mmsi?: number;
  timestamp?: string;
  vessel_name?: string;
}

export interface VesselETAResponse {
  vesselEta?: VesselETA;
}

// ---------------------------------------------------------------------------
// Inspection models
// ---------------------------------------------------------------------------

export interface InspectionRecord {
  authority?: string;
  deficiencies?: number;
  detail_id?: string;
  detained?: boolean;
  imo?: number;
  inspection_date?: string;
  inspection_type?: string;
  mou_region?: string;
  port?: string;
}

export interface InspectionDeficiency {
  category?: string;
  count?: number;
  deficiency?: string;
}

export interface InspectionDetailRecord {
  authority?: string;
  deficiencies?: InspectionDeficiency[];
  deficiency_count?: number;
  detail_id?: string;
  detained?: boolean;
  detention_grounds?: InspectionDeficiency[];
  imo?: number;
  inspection_date?: string;
  inspection_type?: string;
  mou_region?: string;
  port?: string;
}

export interface InspectionsResponse {
  cached_at?: string;
  imo?: number;
  inspection_count?: number;
  inspections?: InspectionRecord[];
  nextToken?: string;
}

export interface InspectionDetailResponse {
  cached_at?: string;
  detail_id?: string;
  imo?: number;
  inspection_detail?: InspectionDetailRecord;
}

// ---------------------------------------------------------------------------
// Ownership models
// ---------------------------------------------------------------------------

export interface VesselOwnership {
  doc_company?: string;
  doc_company_address?: string;
  imo?: number;
  registered_owner?: string;
  registered_owner_address?: string;
  ship_manager?: string;
  ship_manager_address?: string;
}

export interface OwnershipResponse {
  cached_at?: string;
  imo?: number;
  ownership?: VesselOwnership;
}

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
}

export interface PortEventResponse {
  portEvent?: PortEvent;
}

// ---------------------------------------------------------------------------
// Search models
// ---------------------------------------------------------------------------

export interface FindVesselsResponse {
  vessels?: Vessel[];
  nextToken?: string;
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
// Navtex models
// ---------------------------------------------------------------------------

export interface Navtex {
  issuing_office?: string;
  label?: string;
  lines?: string[];
  metarea_coordinator?: string;
  metarea_id?: string;
  metarea_name?: string;
  metarea_region?: string;
  metarea_stations?: BroadcastStation[];
  raw_content?: string;
  timestamp?: string;
  wmo_header?: string;
}

export interface NavtexMessagesResponse {
  navtexMessages?: Navtex[];
  nextToken?: string;
}
