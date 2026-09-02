import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import os
import json
import joblib
import requests
import pandas as pd
import numpy as np
import datetime
import urllib3
from flask import Flask, request, jsonify
from flask_cors import CORS
from fire_spread import simulate_fire
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv
import ee
import rasterio

# Load environment variables from multiple standard locations
_base_dir = os.path.dirname(os.path.abspath(__file__))
for _env_candidate in [
    os.path.join(_base_dir, ".env"),
    os.path.join(_base_dir, "..", ".env"),
    os.path.join(_base_dir, "..", "..", ".env"),
    ".env"
]:
    if os.path.exists(_env_candidate):
        load_dotenv(_env_candidate, override=False)

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ✅ SERVICE ACCOUNT AUTH — robust initialization with multiple fallbacks
SERVICE_ACCOUNT = os.environ.get("GEE_SERVICE_ACCOUNT", os.environ.get("GEE_CLIENT_EMAIL", ""))
gee_initialized = False

try:
    _gee_key_data = None

    # Option 1: Full JSON string in env variable
    gee_json_env = os.environ.get("GEE_SERVICE_ACCOUNT_JSON", "").strip()
    if gee_json_env:
        try:
            import base64
            if gee_json_env.startswith("{"):
                _gee_key_data = json.loads(gee_json_env)
            else:
                _gee_key_data = json.loads(base64.b64decode(gee_json_env).decode('utf-8'))
        except Exception as err:
            print(f"Failed to parse GEE_SERVICE_ACCOUNT_JSON: {err}")

    # Option 2: Local json file if available
    if not _gee_key_data and os.path.exists("gee-service-account.json"):
        with open("gee-service-account.json", "r") as f:
            _gee_key_data = json.load(f)

    # Option 3: Construct from individual environment variables
    if not _gee_key_data:
        raw_key = os.environ.get("GEE_PRIVATE_KEY", "").strip()
        # Strip outer quotes if present
        if (raw_key.startswith('"') and raw_key.endswith('"')) or (raw_key.startswith("'") and raw_key.endswith("'")):
            raw_key = raw_key[1:-1]
        # Replace escaped newlines with real newlines
        raw_key = raw_key.replace("\\n", "\n").replace("\\r", "").strip()
        if raw_key and not raw_key.endswith("\n"):
            raw_key += "\n"

        client_email = os.environ.get("GEE_CLIENT_EMAIL", SERVICE_ACCOUNT)
        if raw_key and client_email:
            _gee_key_data = {
                "type": "service_account",
                "project_id": os.environ.get("GEE_PROJECT_ID", ""),
                "private_key_id": os.environ.get("GEE_PRIVATE_KEY_ID", ""),
                "private_key": raw_key,
                "client_email": client_email,
                "client_id": os.environ.get("GEE_CLIENT_ID", ""),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{client_email.replace('@', '%40')}",
                "universe_domain": "googleapis.com"
            }

    if _gee_key_data and _gee_key_data.get("private_key"):
        import tempfile
        _tmp_key_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        json.dump(_gee_key_data, _tmp_key_file)
        _tmp_key_file.flush()
        _tmp_key_file.close()

        proj_id = _gee_key_data.get("project_id") or os.environ.get("GEE_PROJECT_ID", "fire-483411")
        credentials = ee.ServiceAccountCredentials(
            _gee_key_data.get("client_email", SERVICE_ACCOUNT),
            _tmp_key_file.name
        )
        if proj_id:
            ee.Initialize(credentials, project=proj_id)
        else:
            ee.Initialize(credentials)
        gee_initialized = True
        print(f"✅ Google Earth Engine initialized successfully with project {proj_id}.")
    else:
        print("ℹ️ GEE credentials not provided. Using fallback NDVI values.")
except Exception as e:
    print(f"⚠️ GEE Initialization warning: {e}. App will continue with fallback NDVI.")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# ================= CONFIG =================
OPENWEATHER_KEY = (os.environ.get("OPENWEATHER_KEY") or os.environ.get("WEATHER_KEY") or "ecd93f6f1007423b6e190195e5f6eac2").strip()
AGRO_POLY_ID = (os.environ.get("AGRO_POLY_ID") or os.environ.get("POLY_ID") or "7a8b62b15a012aef7b2e51de41e5e332").strip()

FEATURE_COLS = [
    'LST_C', 'NDVI', 'aspect', 'era_precip', 'landcover',
    'slope', 'temp_c', 'RH', 'wind_speed', 'month', 'veg_dryness'
]
# ================= FIRE MODEL CLASS =================
class FireRiskModel:
    
    def __init__(self, model, bounds):
        self.model = model
        self.bounds = bounds
        
    def predict_proba(self, data):
        # 🚀 QUICK MASK FOR NO-MODEL BYPASS
        mask_80 = (data['landcover'] == 80).values
        probs = np.zeros(len(data))

        if not np.all(mask_80):
            # Only run model for valid vegetation/land points
            probs[~mask_80] = self.model.predict_proba(data[~mask_80])[:, 1]
        
        t_boost = np.maximum(0, data['temp_c'].values - self.bounds['temp_c']) * 0.025
        r_boost = np.maximum(0, self.bounds['RH'] - data['RH'].values) * 0.025
        w_boost = np.maximum(0, data['wind_speed'].values - self.bounds['wind_speed']) * 0.050
        v_boost = np.maximum(0, data['veg_dryness'].values - self.bounds['veg_dryness']) * 0.015
        
        seasonal_boost = np.where(
            (data['month'].isin([3,4,5])) & (data['RH'] < 45),
            0.03,
            0
        )
        
        combined_prob = probs + t_boost + r_boost + w_boost + v_boost + seasonal_boost
        
        final_probs = np.where(
            combined_prob >= 0.50,
            0.50 + (combined_prob - 0.50) * 1.5,
            combined_prob
        )
        
        final_probs = np.where(data['landcover'].values == 80, 0.0, final_probs)
        final_probs = np.clip(final_probs, 0, 1.0)
        
        return final_probs
    
    def predict(self, data, threshold=0.52):
        probs = self.predict_proba(data)
        return (probs >= threshold).astype(int)
# ================= LOAD MODEL =================
model = None
bounds = None
try:
    import sys
    setattr(sys.modules['__main__'], 'FireRiskModel', FireRiskModel)
    model = joblib.load("final_fire_model.pkl")
    bounds = joblib.load("training_frontiers.pkl")
    print("✅ ML Model loaded successfully.")
except Exception as e:
    print(f"Error loading model files: {e}")

# ================= LIVE DATA HELPERS =================
# ================= NEW FUNCTION (ADDED) =================

LANDCOVER_FILE = "landcover.tif"
LANDCOVER_DOWNLOAD_URL = os.environ.get("LANDCOVER_DOWNLOAD_URL", "")

def download_landcover(url, destination):
    import re
    print(f"Downloading {destination} from {url}...")
    if "drive.google.com" in url:
        match = re.search(r'/d/([a-zA-Z0-9_-]+)', url) or re.search(r'id=([a-zA-Z0-9_-]+)', url)
        file_id = match.group(1) if match else url
        session = requests.Session()
        direct_url = f"https://drive.usercontent.google.com/download?id={file_id}&export=download&authuser=0&confirm=t"
        response = session.get(direct_url, stream=True, timeout=120)
        if response.status_code != 200:
            gdrive_url = "https://docs.google.com/uc?export=download"
            response = session.get(gdrive_url, params={'id': file_id, 'confirm': 't'}, stream=True, timeout=120)
    else:
        response = requests.get(url, stream=True, timeout=120)
    
    response.raise_for_status()
    with open(destination, "wb") as f:
        for chunk in response.iter_content(chunk_size=65536):
            if chunk:
                f.write(chunk)
    
    if os.path.exists(destination):
        with open(destination, "rb") as f:
            header = f.read(50)
            if b"<html" in header.lower() or b"<!doctype" in header.lower():
                os.remove(destination)
                raise ValueError("Downloaded file is an HTML error page instead of a GeoTIFF.")
    print("Download complete.")

if os.path.exists(LANDCOVER_FILE):
    try:
        with rasterio.open(LANDCOVER_FILE) as _test_ds:
            pass
    except Exception:
        print(f"Existing {LANDCOVER_FILE} is invalid. Re-downloading...")
        try:
            os.remove(LANDCOVER_FILE)
        except Exception:
            pass

if not os.path.exists(LANDCOVER_FILE):
    if LANDCOVER_DOWNLOAD_URL:
        try:
            download_landcover(LANDCOVER_DOWNLOAD_URL, LANDCOVER_FILE)
        except Exception as e:
            print(f"Error downloading {LANDCOVER_FILE}: {e}")
    else:
        print(f"WARNING: {LANDCOVER_FILE} not found and LANDCOVER_DOWNLOAD_URL is not set.")

try:
    landcover_dataset = rasterio.open(LANDCOVER_FILE)
    print("✅ Landcover dataset opened successfully.")
except Exception as e:
    print(f"Error opening {LANDCOVER_FILE}: {e}")
    landcover_dataset = None



def get_landcover(lat, lon):
    """
    Optimized to use the globally opened landcover_dataset for speed.
    """
    try:
        if landcover_dataset is None:
            return 30
        for val in landcover_dataset.sample([(lon, lat)]):
            return int(val[0])
        return 30
    except Exception as e:
        print("❌ LC error:", e)
        return 30
    
 
@lru_cache(maxsize=100)
def get_live_ndvi(lat, lon):
    try:
        point = ee.Geometry.Point([lon, lat])

        today = datetime.date.today()
        start = str(today - datetime.timedelta(days=7))
        end = str(today)

        dataset = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                   .filterBounds(point)
                   .filterDate(start, end)
                   .sort('CLOUDY_PIXEL_PERCENTAGE')
                   .first())
        if dataset is None:
            return 0.45
        
        ndvi = dataset.normalizedDifference(['B8', 'B4']).rename('NDVI')

        value = ndvi.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=point,
            scale=10
        ).get('NDVI')

        ndvi_value = value.getInfo()

        print("🌿 NDVI VALUE:", ndvi_value)   # ✅ ADDED

        if ndvi_value is None:
            return 0.45
        return float(ndvi_value)

    except Exception as e:
        print("NDVI error:", e)
        return 0.45


def get_live_terrain(lat, lon):
    """
    Warning: Now used primarily for single-point prediction. 
    Grid prediction uses batch_elevation for 10x speedup.
    """
    try:
        elev_url = f"https://api.open-elevation.com/api/v1/lookup?locations={lat},{lon}"
        elev_resp = requests.get(elev_url, timeout=12, verify=False).json()
        elevation = elev_resp['results'][0]['elevation']

        terrain_data = {
            "slope": round(min(45, elevation / 50), 2),
            "aspect": round((lat * 100) % 360, 2),
            "landcover": get_landcover(lat, lon)
        }
        return terrain_data
    except Exception as e:
        print("⛰️ Terrain error:", e)
        return {"slope": 10.0, "aspect": 180.0, "landcover": 4.0}



@lru_cache(maxsize=100)
def get_live_weather(lat, lon):
    try:
        if lat is None or lon is None:
            print("❌ Missing lat/lon for weather")
            return None

        # 1. Primary: OpenWeatherMap API
        if OPENWEATHER_KEY:
            try:
                url = "https://api.openweathermap.org/data/2.5/weather"
                params = {
                    "lat": lat,
                    "lon": lon,
                    "appid": OPENWEATHER_KEY,
                    "units": "metric"
                }

                response = requests.get(url, params=params, timeout=8, verify=False)
                if response.status_code == 200:
                    data = response.json()
                    if str(data.get("cod")) == "200":
                        w_res = {
                            "temp_c": float(data.get("main", {}).get("temp", 30)),
                            "RH": float(data.get("main", {}).get("humidity", 50)),
                            "wind_speed": float(data.get("wind", {}).get("speed", 2)),
                            "era_precip": float(data.get("rain", {}).get("1h", 0))
                        }
                        print("🌐 OpenWeatherMap live weather:", w_res)
                        return w_res
                    else:
                        print("⚠️ OpenWeatherMap API cod error:", data)
                else:
                    print(f"⚠️ OpenWeatherMap returned HTTP {response.status_code}")
            except Exception as e:
                print(f"⚠️ OpenWeatherMap request exception: {e}")

        # 2. Secondary Fallback: Open-Meteo API (High-res, free, zero-auth)
        try:
            print("🔄 Fetching live weather from Open-Meteo fallback...")
            meteo_url = "https://api.open-meteo.com/v1/forecast"
            meteo_params = {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",
                "wind_speed_unit": "ms"
            }
            meteo_resp = requests.get(meteo_url, params=meteo_params, timeout=8, verify=False)
            if meteo_resp.status_code == 200:
                m_data = meteo_resp.json().get("current", {})
                w_res = {
                    "temp_c": float(m_data.get("temperature_2m", 30)),
                    "RH": float(m_data.get("relative_humidity_2m", 50)),
                    "wind_speed": float(m_data.get("wind_speed_10m", 2)),
                    "era_precip": float(m_data.get("precipitation", 0))
                }
                print("🌐 Open-Meteo fallback weather:", w_res)
                return w_res
            else:
                print(f"⚠️ Open-Meteo returned HTTP {meteo_resp.status_code}")
        except Exception as e:
            print(f"⚠️ Open-Meteo request exception: {e}")

        # 3. Tertiary Fallback: Regional Climatological Baseline (Zero Downtime)
        print("⚠️ All weather services unreachable. Using regional climatological baseline.")
        current_month = datetime.datetime.now().month
        base_temp = 35.0 if current_month in [3, 4, 5, 6] else 28.0
        base_rh = 42.0 if current_month in [3, 4, 5, 6] else 65.0
        return {
            "temp_c": base_temp,
            "RH": base_rh,
            "wind_speed": 3.0,
            "era_precip": 0.0
        }

    except Exception as e:
        print("❌ WEATHER EXCEPTION:", str(e))
        return {
            "temp_c": 30.0,
            "RH": 50.0,
            "wind_speed": 2.5,
            "era_precip": 0.0
        }

# ================= ROUTES =================

@app.route("/", methods=["GET", "HEAD"])
@app.route("/health", methods=["GET", "HEAD"])
def root():
    return jsonify({
        "status": "online",
        "service": "FireGuard AI Flask API",
        "model_loaded": model is not None,
        "gee_initialized": gee_initialized,
        "landcover_loaded": landcover_dataset is not None
    }), 200

@app.route("/search", methods=["GET"])
def proxy_search():
    try:
        # Pass all query parameters to Nominatim (format, q, lat, lon, etc.)
        params = dict(request.args)
        if "format" not in params:
            params["format"] = "json"
            
        # Nominatim requires a User-Agent
        headers = {
            "User-Agent": "FireGuardAI-Research/1.0 (contact: your-email@example.com)"
        }
        url = "https://nominatim.openstreetmap.org/search"
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        return jsonify(response.json())
    except Exception as e:
        print("❌ Search proxy error:", e)
        return jsonify({"error": str(e)}), 500

def predict_with_monotonic_logic(df):
    print("📊 INPUT DATAFRAME:\n", df)   # ✅ ADDED

    # 🚀 CORE BYPASS: Skip model for Landcover 80 (Water/Urban)
    # This ensures those points 'not even go through the model'
    mask_80 = (df['landcover'] == 80).values
    probs = np.zeros(len(df))

    if not np.all(mask_80):
        # Only predict for valid land/vegetation rows
        df_valid = df[~mask_80]
        probs_raw = model.predict_proba(df_valid)

        if len(probs_raw.shape) == 1:
            p_val = probs_raw
        else:
            p_val = probs_raw[:, 1]
        
        # Re-insert predictions into their original positions
        probs[~mask_80] = p_val

    final_prob = probs

    print("🔥 BASE PROB:", probs)           # ✅ ADDED
    print("🚨 FINAL PROB:", final_prob)    # ✅ ADDED

    return (final_prob >= 0.5).astype(int), final_prob

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        lat, lon = data.get("latitude"), data.get("longitude")

        print("\n📍 REQUEST RECEIVED:", lat, lon)   # ✅ ADDED
        
        # 🚀 QUICK EXIT FOR LANDCOVER 80 (WATER/URBAN/NO-FUEL)
        lc_check = get_landcover(lat, lon)
        if lc_check == 80:
            print(f"🎯 LANDCOVER 80 (Water/Urban) - Skipping Model & API Calls.")
            feat_exit = {
                "temp_c": 0, "RH": 0, "wind_speed": 0, "era_precip": 0,
                "slope": 0, "aspect": 0, "landcover": 80, "NDVI": 0,
                "LST_C": 0, "month": datetime.datetime.now().month, "veg_dryness": 0
            }
            return jsonify({
                "prediction": 0,
                "fire_probability": 0.0,
                "risk": "NO RISK",
                "features": feat_exit
            })

        # weather = get_live_weather(lat, lon)
        weather = get_live_weather(lat, lon)
        if weather is None:
            weather = {
                "temp_c": 30.0, "RH": 50.0, "wind_speed": 2.5, "era_precip": 0.0
            }
        ndvi = get_live_ndvi(lat, lon)
        terrain = get_live_terrain(lat, lon)


        feat = {**weather, **terrain, "NDVI": ndvi}
        feat["LST_C"] = feat["temp_c"] + 3.5
        feat["month"] = datetime.datetime.now().month
        feat["veg_dryness"] = feat["NDVI"] * (100 - feat["RH"])

        print("🧾 FINAL FEATURE VECTOR:", feat)   # ✅ ADDED

        df = pd.DataFrame([feat])[FEATURE_COLS]
        pred, prob = predict_with_monotonic_logic(df)
        
        prob_val = float(prob[0])
        # 🎯 SYNC: Updated to include NO RISK status
        risk = "HIGH" if prob_val >= 0.70 else "MODERATE" if prob_val >= 0.35 else "LOW" if prob_val > 0 else "NO RISK"

        print("🎯 RESULT:", risk, prob_val)   # ✅ ADDED

        return jsonify({
            "prediction": int(pred[0]),
            "fire_probability": round(prob_val, 4),
            "risk": risk,
            "features": feat
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/predict-grid", methods=["POST"])
def predict_grid():
    try:
        data = request.get_json()
        c_lat, c_lon = data.get("latitude"), data.get("longitude")

        print("\n📍 GRID REQUEST:", c_lat, c_lon)   # ✅ ADDED

        grid_size, step = 5, 0.002

        lats = [c_lat + i * step for i in range(-grid_size, grid_size + 1)]
        lons = [c_lon + j * step for j in range(-grid_size, grid_size + 1)]
        coords = [(lat, lon) for lat in lats for lon in lons]

        # 🚀 IMMEDIATE CENTRAL BYPASS (WATER/URBAN)
        if get_landcover(c_lat, c_lon) == 80:
            print(f"🎯 GRID BYPASS: Center {c_lat}, {c_lon} is Landcover 80.")
            grid_data = [{"lat": lt, "lon": ln, "risk": 0.0} for lt, ln in coords]
            timeseries = [{"hour": t, "data": grid_data} for t in range(13)]
            return jsonify({
                "status": "success", "initial": timeseries[0]["data"],
                "timeseries": timeseries, "is_high_risk": False
            })

        base_ndvi = get_live_ndvi(c_lat, c_lon)
        weather = get_live_weather(c_lat, c_lon) 

        if weather is None:
            weather = {
                "temp_c": 30.0, "RH": 50.0, "wind_speed": 2.5, "era_precip": 0.0
            }

        print("🌿 BASE NDVI:", base_ndvi)   # ✅ ADDED
        print("🌦️ BASE WEATHER:", weather) # ✅ ADDED

        # 🚀 PERFORMANCE OPTIMIZATION: Batch Processing
        # instead of ThreadPoolExecutor calling API 121 times, we batch everything.

        # 1. Batch Landcover (Fast local I/O)
        lcs = [get_landcover(lat, lon) for lat, lon in coords]

        # 2. Batch Elevation (One single API call for the whole grid)
        print("📡 FETCHING BATCH ELEVATION...")
        batch_locs = [{"latitude": lat, "longitude": lon} for lat, lon in coords]
        try:
            elev_resp = requests.post(
                "https://api.open-elevation.com/api/v1/lookup", 
                json={"locations": batch_locs}, 
                timeout=12,
                verify=False
            ).json()
            elevations = [r['elevation'] for r in elev_resp['results']]
        except Exception as e:
            print("❌ Batch Elevation failed, using defaults:", e)
            elevations = [150.0] * len(coords)

        # 3. Construct Features (Vectorized feel)
        grid_features = []
        for i, (lat, lon) in enumerate(coords):
            elev = elevations[i]
            t = {
                "slope": round(min(45, elev / 50), 2),
                "aspect": round((lat * 100) % 360, 2),
                "landcover": lcs[i]
            }
            f = {**weather, **t, "NDVI": base_ndvi}
            f["LST_C"] = f["temp_c"] + 3.5
            f["month"] = datetime.datetime.now().month
            f["veg_dryness"] = f["NDVI"] * (100 - f["RH"])
            grid_features.append(f)

        print("📦 GRID FEATURES SAMPLE:", grid_features[:5])   # ✅ ADDED

        df_grid = pd.DataFrame(grid_features)[FEATURE_COLS]
        _, probs = predict_with_monotonic_logic(df_grid)

        print("🗺️ GRID PROBABILITIES SAMPLE:", probs[:10])   # ✅ ADDED
        
        side = 2 * grid_size + 1
        risk_matrix = np.array(probs).reshape(side, side)

        # 🎯 SYNC: Ensure visual consistency across the whole grid
        center_val = float(risk_matrix[grid_size, grid_size])
        if center_val < 0.35:
            # Low Risk -> Constant Green Patch (No spread)
            risk_matrix = np.clip(risk_matrix, 0, 0.34)
            fire_steps = [risk_matrix] * 13 # Force constant patch
        elif center_val < 0.70:
            # Moderate Risk -> Yellow/Orange (CA Physics spread)
            risk_matrix = np.clip(risk_matrix, 0.35, 0.69)
            fire_steps = simulate_fire(risk_matrix, steps=12, wind=(1, 0))
        else:
            # High Risk -> Red Zone (CA Physics spread)
            risk_matrix = np.clip(risk_matrix, 0.70, 1.0)
            fire_steps = simulate_fire(risk_matrix, steps=12, wind=(1, 0))

        timeseries = []
        for t, step_map in enumerate(fire_steps):
            step_data = [{"lat": coords[i][0], "lon": coords[i][1], "risk": float(val)} 
                         for i, val in enumerate(step_map.flatten())]
            timeseries.append({"hour": t, "data": step_data})

        return jsonify({
            "status": "success",
            "initial": timeseries[0]["data"],
            "timeseries": timeseries,
            "is_high_risk": bool(center_val >= 0.70)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)




