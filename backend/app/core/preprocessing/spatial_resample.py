import pandas as pd

# ────────────────────────────────────────────────────────────────────────────
# Static geographic / land-cover features for each Traditional Authority zone.
# Values are derived from the training dataset and field surveys.
#   Elevation_m       – Mean elevation above sea level (m)
#   Slope_deg         – Mean terrain slope (degrees)
#   NDVI              – Baseline vegetation index (replaced by live GEE value)
#   Dist_River_m      – Mean distance from Shire River (m)
#   topographic_wet_index – TWI (ln(Ac / tan(β)))
#   elevation_to_river – Relative elevation above the river channel (m)
#   LC_codes          – Land-cover class code (training schema)
#   PS_codes          – Soil-type code (training schema)
# ────────────────────────────────────────────────────────────────────────────
TA_ZONE_PROFILES = {
    "TA Ngabu": {
        "Elevation_m": 45.0,
        "Slope_deg": 0.8,
        "Dist_River_m": 320.0,
        "topographic_wet_index": 12.4,
        "elevation_to_river": 1.2,
        "LC_codes": 12,   # Cropland / floodplain
        "PS_codes": 3,    # Vertisol – high clay, low permeability
    },
    "TA Makhwira": {
        "Elevation_m": 62.0,
        "Slope_deg": 1.5,
        "Dist_River_m": 850.0,
        "topographic_wet_index": 10.1,
        "elevation_to_river": 3.5,
        "LC_codes": 10,   # Grassland / savanna
        "PS_codes": 2,    # Luvisol
    },
    "TA Lundu": {
        "Elevation_m": 120.0,
        "Slope_deg": 3.2,
        "Dist_River_m": 2400.0,
        "topographic_wet_index": 7.8,
        "elevation_to_river": 8.0,
        "LC_codes": 50,   # Woodland
        "PS_codes": 1,    # Cambisol
    },
    "TA Kasisi": {
        "Elevation_m": 55.0,
        "Slope_deg": 1.1,
        "Dist_River_m": 620.0,
        "topographic_wet_index": 11.2,
        "elevation_to_river": 2.1,
        "LC_codes": 12,   # Cropland
        "PS_codes": 3,    # Vertisol
    },
    # Chapananga sits on hilly terrain well away from the Shire River.
    # Its flood exposure comes from flash-flood risk on steep slopes and
    # seasonal Ruo River tributaries — NOT from Shire inundation.
    # TWI and Dist_River corrected to match field survey data.
    "TA Chapananga": {
        "Elevation_m": 95.0,   # corrected — mixed lowland/upland
        "Slope_deg": 2.8,      # moderate slope
        "Dist_River_m": 1800.0,# closer to Ruo tributary influence
        "topographic_wet_index": 9.2,  # moderate wetness accumulation
        "elevation_to_river": 5.5,
        "LC_codes": 50,   # Woodland / hilly
        "PS_codes": 1,    # Cambisol
    },
}


def resample_to_grid(raw_data: dict, grid_geojson_path: str) -> pd.DataFrame:
    """
    Builds one feature row per Traditional Authority zone by combining:
      • Static geographic features from TA_ZONE_PROFILES (elevation, slope, etc.)
      • Live sensor readings from raw_data (rainfall, NDVI, river level, soil moisture)

    raw_data keys expected (all optional with sensible defaults):
      rainfall     – current rainfall (mm) from GPM (float or dict per TA)
      ndvi         – live NDVI from Sentinel-2 / MODIS (float or dict per TA)
      river_level  – Shire River level (m) from DAHITI (float)
      soil_moisture– volumetric water content from SMAP (0-1) (float or dict per TA)
    """
    live_river_m = raw_data.get("river_level", 0.0) or 0.0

    # ── Baseline dry-season river level at DAHITI station 12087 ─────────────
    RIVER_BASELINE_M = 3.5  # approximate Shire low-water stage (dry season)
    river_rise = max(0.0, live_river_m - RIVER_BASELINE_M)

    rows = []
    for ta_name, profile in TA_ZONE_PROFILES.items():
        static_elev_to_river = profile["elevation_to_river"]
        dynamic_elev_to_river = max(0.0, static_elev_to_river - river_rise)

        # Get TA-specific live values
        rainfall_data = raw_data.get("rainfall")
        ndvi_data = raw_data.get("ndvi")
        soil_data = raw_data.get("soil_moisture")
        
        live_rainfall = rainfall_data.get(ta_name, 0.0) if isinstance(rainfall_data, dict) else (rainfall_data or 0.0)
        live_ndvi = ndvi_data.get(ta_name, 0.45) if isinstance(ndvi_data, dict) else (ndvi_data or 0.45)
        live_soil = soil_data.get(ta_name, 0.0) if isinstance(soil_data, dict) else (soil_data or 0.0)

        # ── Soil moisture amplifies effective rainfall impact ────────────────────
        soil_amplification = 1.0 + (live_soil * 2.0)
        effective_rainfall = live_rainfall * soil_amplification

        row = {
            "grid_id":              ta_name,
            "Elevation_m":          profile["Elevation_m"],
            "Slope_deg":            profile["Slope_deg"],
            "NDVI":                 live_ndvi,
            "Rainfall_mm":          effective_rainfall,   # rainfall amplified by soil moisture
            "Dist_River_m":         profile["Dist_River_m"],
            "topographic_wet_index":profile["topographic_wet_index"],
            "elevation_to_river":   dynamic_elev_to_river,  # shrinks as river rises
            "LC_codes":             profile["LC_codes"],
            "PS_codes":             profile["PS_codes"],
        }
        rows.append(row)

    df = pd.DataFrame(rows).set_index("grid_id")
    return df
