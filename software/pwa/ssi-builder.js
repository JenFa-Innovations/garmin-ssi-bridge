import { formatDatetime, fmt1 } from "./fit-parser.js";

/**
 * Builds the SSI QR code string from dive data + user input.
 * Format reverse-engineered from a real Garmin MK3i SSI QR code.
 *
 * Example output:
 * dive;noid;dive_type:0;divetime:27.0;datetime:202604051740;depth_m:20.1;
 * site:83913;var_weather_id:1;...;user_master_id:123456;user_firstname:Max;
 * user_lastname:Musterman;user_leader_id:1234567;watertemp_c:25.0;airtemp_c:24.0;
 * vis_m:20.0;watertemp_max_c:26.0
 */
export function buildSsiString(dive, profile, extras = {}) {
  const {
    siteId         = "",
    visMeter       = "",
    varWeatherId   = "1",
    varEntryId     = "35",
    varWaterBodyId = "52",
    varWaterTypeId = "4",
    varCurrentId   = "6",
    varSurfaceId   = "10",
    varDiveTypeId  = "24",
  } = extras;

  const parts = [
    "dive",
    "noid",
    "dive_type:0",
    `divetime:${(dive.durationSeconds / 60).toFixed(1)}`,
    `datetime:${formatDatetime(dive.startTimeUnix)}`,
    `depth_m:${dive.maxDepthMeters.toFixed(1)}`,
  ];

  if (siteId) parts.push(`site:${siteId}`);

  parts.push(
    `var_weather_id:${varWeatherId}`,
    `var_entry_id:${varEntryId}`,
    `var_water_body_id:${varWaterBodyId}`,
    `var_watertype_id:${varWaterTypeId}`,
    `var_current_id:${varCurrentId}`,
    `var_surface_id:${varSurfaceId}`,
    `var_divetype_id:${varDiveTypeId}`,
    `user_master_id:${profile.userId}`,
    `user_firstname:${profile.firstName}`,
    `user_lastname:${profile.lastName}`,
    "user_leader_id:",
    `watertemp_c:${fmt1(dive.waterTempCelsius)}`,
  );

  if (!isNaN(dive.airTempCelsius))
    parts.push(`airtemp_c:${fmt1(dive.airTempCelsius)}`);

  if (visMeter)
    parts.push(`vis_m:${visMeter}`);

  parts.push(`watertemp_max_c:${fmt1(dive.waterTempMaxCelsius, dive.waterTempCelsius || 20)}`);

  return parts.join(";");
}
