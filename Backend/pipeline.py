# ============================================================
# SIH-2026 INDUSTRIAL FIRE DETECTION PIPELINE
# ============================================================

import os
import pandas as pd
import numpy as np
import requests
import getpass
import json

from io import StringIO
from pathlib import Path


# ============================================================
# PROJECT CONFIGURATION
# ============================================================

PROJECT_NAME = "SIH Industrial Fire Detection"

# NASA FIRMS
FIRMS_SOURCE = "VIIRS_NOAA21_NRT"

# Gujarat bounding box
# west, south, east, north
FIRMS_AREA = "68,20,74,25"

# Target detection period
TARGET_START_DATE = "2026-08-27"
TARGET_END_DATE = "2026-09-25"


# ============================================================
# DATA DIRECTORIES
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "data"
OSM_CACHE_DIR = DATA_DIR / "osm_cache"
MODEL_DIR = BASE_DIR / "models"

DATA_DIR.mkdir(exist_ok=True)
OSM_CACHE_DIR.mkdir(exist_ok=True)
MODEL_DIR.mkdir(exist_ok=True)


# ============================================================
# OUTPUT FILES
# ============================================================

FIRMS_HISTORY_FILE = DATA_DIR / "firms_history.csv"
RESULTS_FILE = DATA_DIR / "fire_detection_results.csv"
MODEL_FILE = MODEL_DIR / "industrial_fire_model.joblib"


print("=" * 60)
print(PROJECT_NAME)
print("=" * 60)

print(f"FIRMS source : {FIRMS_SOURCE}")
print(f"FIRMS area   : {FIRMS_AREA}")
print(f"Target dates : {TARGET_START_DATE} → {TARGET_END_DATE}")

print()
print("Data directory :", DATA_DIR)
print("OSM cache      :", OSM_CACHE_DIR)
print("Model file     :", MODEL_FILE)
print("Results file   :", RESULTS_FILE)

print()
print("Pipeline configuration ready.")

# ============================================================
# NASA FIRMS DATA DOWNLOAD
# ============================================================

# ============================================================
# NASA FIRMS DATA DOWNLOAD
# ============================================================

def get_firms_map_key():
    """
    Get NASA FIRMS MAP_KEY securely.
    """

    map_key = os.getenv("FIRMS_MAP_KEY")

    if not map_key:
        map_key = getpass.getpass(
            "Enter NASA FIRMS MAP_KEY: "
        )

    if not map_key:
        raise ValueError(
            "NASA FIRMS MAP_KEY was not provided."
        )

    return map_key


def download_firms_data(
    start_date,
    end_date,
    area=FIRMS_AREA,
    source=FIRMS_SOURCE
):
    """
    Download FIRMS data in chunks of maximum 5 days.

    NASA FIRMS Area API accepts:
    MAP_KEY / SOURCE / AREA / DAY_RANGE / DATE
    """

    map_key = get_firms_map_key()

    start = pd.Timestamp(start_date)
    end = pd.Timestamp(end_date)

    all_data = []

    current_date = start

    print()
    print("Downloading NASA FIRMS data...")
    print(f"Source : {source}")
    print(f"Area   : {area}")
    print(f"Period : {start_date} → {end_date}")

    while current_date <= end:

        remaining_days = (
            end - current_date
        ).days + 1

        day_range = min(
            5,
            remaining_days
        )

        date_string = current_date.strftime(
            "%Y-%m-%d"
        )

        url = (
            "https://firms.modaps.eosdis.nasa.gov/"
            f"api/area/csv/{map_key}/"
            f"{source}/{area}/{day_range}/"
            f"{date_string}"
        )

        print(
            f"  Downloading {date_string} "
            f"({day_range} days)..."
        )

        response = requests.get(
            url,
            timeout=120
        )

        response.raise_for_status()

        chunk = pd.read_csv(
            StringIO(response.text)
        )

        all_data.append(chunk)

        current_date += pd.Timedelta(
            days=day_range
        )

    if not all_data:
        return pd.DataFrame()

    df = pd.concat(
        all_data,
        ignore_index=True
    )

    print()
    print(
        f"Downloaded {len(df)} FIRMS detections."
    )

    return df

# ============================================================
# TEMPORAL FEATURE EXTRACTION
# ============================================================

def haversine_distance_km(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two geographic coordinates.
    """

    R = 6371.0

    lat1 = np.radians(lat1)
    lat2 = np.radians(lat2)

    dlat = lat2 - lat1
    dlon = np.radians(lon2) - np.radians(lon1)

    a = (
        np.sin(dlat / 2) ** 2
        + np.cos(lat1)
        * np.cos(lat2)
        * np.sin(dlon / 2) ** 2
    )

    return 2 * R * np.arcsin(np.sqrt(a))


def extract_temporal_features(
    detection,
    historical_firms,
    radius_km=1.0
):
    """
    Extract leakage-aware temporal features.

    Only observations from the detection date and
    previous 29 days are used.
    """

    detection_date = pd.to_datetime(
        detection["acq_date"]
    )

    lat = float(detection["latitude"])
    lon = float(detection["longitude"])

    # --------------------------------------------------------
    # 30-day temporal window
    # --------------------------------------------------------

    window_start = detection_date - pd.Timedelta(days=29)

    historical = historical_firms.copy()

    historical["acq_date"] = pd.to_datetime(
        historical["acq_date"]
    )

    historical = historical[
        (historical["acq_date"] >= window_start)
        & (historical["acq_date"] <= detection_date)
    ].copy()

    # --------------------------------------------------------
    # Spatial filtering
    # --------------------------------------------------------

    if len(historical) > 0:

        historical["distance_km"] = haversine_distance_km(
            lat,
            lon,
            historical["latitude"].values,
            historical["longitude"].values
        )

        nearby = historical[
            historical["distance_km"] <= radius_km
        ].copy()

    else:

        nearby = pd.DataFrame()

    # --------------------------------------------------------
    # Default values
    # --------------------------------------------------------

    active_days_30d = 0
    total_detections_30d = 0
    max_frp_30d = 0.0
    mean_frp_30d = 0.0

    recent_active_days_7d = 0
    recent_detections_7d = 0
    recent_mean_frp_7d = 0.0

    # --------------------------------------------------------
    # 30-day features
    # --------------------------------------------------------

    if not nearby.empty:

        active_days_30d = (
            nearby["acq_date"]
            .dt.date
            .nunique()
        )

        total_detections_30d = len(nearby)

        max_frp_30d = float(
            nearby["frp"].max()
        )

        mean_frp_30d = float(
            nearby["frp"].mean()
        )

        # ----------------------------------------------------
        # Recent 7-day features
        # ----------------------------------------------------

        recent_start = detection_date - pd.Timedelta(days=6)

        recent = nearby[
            nearby["acq_date"] >= recent_start
        ]

        if not recent.empty:

            recent_active_days_7d = (
                recent["acq_date"]
                .dt.date
                .nunique()
            )

            recent_detections_7d = len(recent)

            recent_mean_frp_7d = float(
                recent["frp"].mean()
            )

    return {
        "active_days_30d": active_days_30d,
        "active_day_ratio_30d": (
            active_days_30d / 30.0
        ),
        "total_detections_30d": total_detections_30d,
        "max_frp_30d": max_frp_30d,
        "mean_frp_30d": mean_frp_30d,
        "recent_active_days_7d": recent_active_days_7d,
        "recent_detections_7d": recent_detections_7d,
        "recent_mean_frp_7d": recent_mean_frp_7d,
    }

    # ============================================================
# ============================================================
# OPENSTREETMAP GRID CACHE
# ============================================================

OVERPASS_URLS = [
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
]

FAILED_OSM_GRIDS = []


def get_grid_bounds(lat, lon, grid_size=0.1):
    """
    Create a geographic grid cell around a point.
    """

    grid_lat = round(lat / grid_size) * grid_size
    grid_lon = round(lon / grid_size) * grid_size

    south = grid_lat - grid_size / 2
    north = grid_lat + grid_size / 2
    west = grid_lon - grid_size / 2
    east = grid_lon + grid_size / 2

    return south, west, north, east


def calculate_point_distance_km(
    lat1,
    lon1,
    lat2,
    lon2
):
    """
    Calculate distance between two geographic points.
    """

    return float(
        haversine_distance_km(
            lat1,
            lon1,
            lat2,
            lon2
        )
    )


def get_osm_grid_features(south, west, north, east):
    """
    Query Overpass for infrastructure features in one grid.
    Tries multiple public Overpass servers.
    """

    query = f"""
    [out:json][timeout:60];

    (
      nwr["landuse"="industrial"]({south},{west},{north},{east});
      nwr["industrial"]({south},{west},{north},{east});
      nwr["power"="plant"]({south},{west},{north},{east});
      nwr["man_made"="storage_tank"]({south},{west},{north},{east});
      nwr["man_made"="chimney"]({south},{west},{north},{east});
      nwr["power"="substation"]({south},{west},{north},{east});
    );

    out center;
    """

    headers = {
        "User-Agent": "SIH-Industrial-Fire-Detection/1.0",
        "Referer": "https://www.openstreetmap.org/"
    }

    for url in OVERPASS_URLS:

        print(f"    Trying OSM server: {url}")

        try:
            response = requests.post(
                url,
                data={"data": query},
                headers=headers,
                timeout=120
            )

            response.raise_for_status()

            data = response.json()
            elements = data.get("elements", [])

            print(
                f"    OSM request successful: "
                f"{len(elements)} elements"
            )

            return elements

        except requests.exceptions.RequestException as error:

            print(
                f"    Server failed: "
                f"{type(error).__name__}"
            )

    print(
        "    WARNING: All Overpass servers failed "
        "for this grid."
    )

    return None


def extract_osm_features_for_detection(
    latitude,
    longitude,
    osm_elements,
    radius_km=2.0
):
    """
    Convert cached OSM elements into numerical
    infrastructure features for one FIRMS detection.
    """

    industrial_distances = []
    power_plant_distances = []
    storage_tank_distances = []
    chimney_distances = []

    storage_tank_count = 0
    chimney_count = 0
    substation_count = 0

    for element in osm_elements:

        tags = element.get("tags", {})

        if "lat" in element and "lon" in element:
            element_lat = element["lat"]
            element_lon = element["lon"]

        elif "center" in element:
            element_lat = element["center"].get("lat")
            element_lon = element["center"].get("lon")

        else:
            continue

        if element_lat is None or element_lon is None:
            continue

        distance = calculate_point_distance_km(
            latitude,
            longitude,
            element_lat,
            element_lon
        )

        if (
            tags.get("landuse") == "industrial"
            or "industrial" in tags
        ):
            industrial_distances.append(distance)

        if tags.get("power") == "plant":
            power_plant_distances.append(distance)

        if tags.get("man_made") == "storage_tank":
            if distance <= radius_km:
                storage_tank_count += 1
            storage_tank_distances.append(distance)

        if tags.get("man_made") == "chimney":
            if distance <= radius_km:
                chimney_count += 1
            chimney_distances.append(distance)

        if tags.get("power") == "substation":
            if distance <= radius_km:
                substation_count += 1

    nearest_industrial_km = (
        min(industrial_distances)
        if industrial_distances
        else None
    )

    nearest_power_plant_km = (
        min(power_plant_distances)
        if power_plant_distances
        else None
    )

    nearest_storage_tank_km = (
        min(storage_tank_distances)
        if storage_tank_distances
        else None
    )

    nearest_chimney_km = (
        min(chimney_distances)
        if chimney_distances
        else None
    )

    return {
        "nearest_industrial_km": nearest_industrial_km,
        "nearest_power_plant_km": nearest_power_plant_km,
        "nearest_storage_tank_km": nearest_storage_tank_km,
        "nearest_chimney_km": nearest_chimney_km,
        "storage_tank_count_2km": storage_tank_count,
        "chimney_count_2km": chimney_count,
        "substation_count_2km": substation_count,
    }


def get_cached_osm_grid(
    latitude,
    longitude
):
    """
    Load OSM data from local cache if available.
    Otherwise query Overpass and save the result.
    """

    south, west, north, east = get_grid_bounds(
        latitude,
        longitude
    )

    cache_name = (
        f"{south:.1f}_{west:.1f}_"
        f"{north:.1f}_{east:.1f}.json"
    )

    cache_file = OSM_CACHE_DIR / cache_name

    # --------------------------------------------------------
    # Load existing cache
    # --------------------------------------------------------

    if cache_file.exists():

        with open(
            cache_file,
            "r",
            encoding="utf-8"
        ) as file:

            return json.load(file)

    # --------------------------------------------------------
    # Query OpenStreetMap
    # --------------------------------------------------------

    print(
        f"  Querying OSM grid: "
        f"{south:.1f}, {west:.1f}, "
        f"{north:.1f}, {east:.1f}"
    )

    elements = get_osm_grid_features(
        south,
        west,
        north,
        east
    )

    # --------------------------------------------------------
    # Handle temporary Overpass failure
    # --------------------------------------------------------

    if elements is None:

        grid_id = (
            f"{south:.1f}_{west:.1f}_"
            f"{north:.1f}_{east:.1f}"
        )

        FAILED_OSM_GRIDS.append(grid_id)

        print(
            f"  OSM data unavailable for grid: {grid_id}"
        )

        # Do not crash the complete pipeline.
        # The caller will receive an empty OSM result.
        return []

    # --------------------------------------------------------
    # Save successful response to cache
    # --------------------------------------------------------

    with open(
        cache_file,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(elements, file)

    print(
        f"  Cached {len(elements)} OSM elements."
    )

    return elements


# FIRMS DOWNLOAD 
# ============================================================

if __name__ == "__main__":

    firms_test = download_firms_data(
        TARGET_START_DATE,
        TARGET_END_DATE
    )

    print()

    if firms_test.empty:

        print("No FIRMS detections found.")

    else:

        # ----------------------------------------------------
        # Save FIRMS history
        # ----------------------------------------------------

        firms_test.to_csv(
            FIRMS_HISTORY_FILE,
            index=False
        )

        print("FIRMS data saved successfully.")
        print(f"File : {FIRMS_HISTORY_FILE}")
        print(f"Rows : {len(firms_test)}")

        # ----------------------------------------------------
        # Temporal feature extraction
        # ----------------------------------------------------

        print()
        print(
            "Calculating temporal features..."
        )

        temporal_features = []

        for index, detection in firms_test.iterrows():

            features = extract_temporal_features(
                detection,
                firms_test,
                radius_km=1.0
            )

            temporal_features.append(features)

        temporal_df = pd.DataFrame(
            temporal_features
        )

        # ----------------------------------------------------
        # Combine FIRMS + temporal features
        # ----------------------------------------------------

        combined_df = pd.concat(
            [
                firms_test.reset_index(drop=True),
                temporal_df.reset_index(drop=True)
            ],
            axis=1
        )

        print()
        print(
            "Temporal analysis completed."
        )

        print(
            f"Rows : {len(combined_df)}"
        )

        print()
        print(
            "Temporal feature columns:"
        )

        print(
            temporal_df.columns.tolist()
        )

        print()
        print(
            "Sample temporal features:"
        )

        print(
            combined_df[
                [
                    "latitude",
                    "longitude",
                    "acq_date",
                    "frp",
                    "active_days_30d",
                    "total_detections_30d",
                    "max_frp_30d",
                    "mean_frp_30d",
                    "recent_active_days_7d",
                    "recent_detections_7d",
                    "recent_mean_frp_7d",
                ]
            ].head()
        )

      # ============================================================
# ============================================================
        # PROCESS OSM FEATURES FOR ALL FIRMS DETECTIONS
        # ============================================================

        print()
        print("=" * 60)
        print("Calculating OSM infrastructure features...")
        print("=" * 60)

        osm_rows = []
        FAILED_OSM_GRIDS.clear()

        for index, detection in firms_test.iterrows():

            if index % 25 == 0:
                print(
                    f"Processing detection {index + 1} "
                    f"of {len(firms_test)}..."
                )

            latitude = float(detection["latitude"])
            longitude = float(detection["longitude"])

            osm_elements = get_cached_osm_grid(
                latitude,
                longitude
            )

            features = extract_osm_features_for_detection(
                latitude,
                longitude,
                osm_elements
            )

            osm_rows.append(features)

        # Convert results to DataFrame
        osm_df = pd.DataFrame(osm_rows)

        print()
        print("=" * 60)
        print("OSM processing completed.")
        print("=" * 60)

        print()
        print(
            "OSM failed grids:",
            len(FAILED_OSM_GRIDS)
        )

        if FAILED_OSM_GRIDS:
            print()
            print("Failed grid IDs:")

            for grid in sorted(set(FAILED_OSM_GRIDS)):
                print(" -", grid)
        else:
            print("All OSM grids processed successfully.")

        print()
        print("Rows :", len(osm_df))

        print()
        print("OSM feature columns:")
        print(osm_df.columns.tolist())

        print()
        print("Sample OSM features:")
        print(osm_df.head())

        # ----------------------------------------------------
        # Combine FIRMS + temporal + OSM features
        # ----------------------------------------------------

        final_features_df = pd.concat(
            [
                combined_df.reset_index(drop=True),
                osm_df.reset_index(drop=True)
            ],
            axis=1
        )

        print()
        print("=" * 60)
        print("FINAL FEATURE DATASET READY")
        print("=" * 60)

        print("Rows    :", len(final_features_df))
        print("Columns :", len(final_features_df.columns))

        print()
        print("Final feature columns:")
        print(final_features_df.columns.tolist())

        print()
        print("Sample final dataset:")
        print(final_features_df.head())

        # Save intermediate combined dataset
        FINAL_FEATURES_FILE = DATA_DIR / "final_features.csv"

        final_features_df.to_csv(
            FINAL_FEATURES_FILE,
            index=False
        )

        print()
        print(
            f"Final feature dataset saved to:"
            f" {FINAL_FEATURES_FILE}"
        )



        # Check missing OSM values
osm_cols = [
    "nearest_industrial_km",
    "nearest_power_plant_km",
    "nearest_storage_tank_km",
    "nearest_chimney_km",
    "storage_tank_count_2km",
    "chimney_count_2km",
    "substation_count_2km"
]

missing_osm = final_features_df[osm_cols].isna().any(axis=1)

print("============================================================")
print("OSM DATA QUALITY CHECK")
print("============================================================")

print("Total detections:", len(final_features_df))
print("Complete OSM rows:", (~missing_osm).sum())
print("Rows with missing OSM:", missing_osm.sum())
print("Missing percentage:", round(missing_osm.mean() * 100, 2), "%")

print("\nMissing values by feature:")
print(final_features_df[osm_cols].isna().sum())
