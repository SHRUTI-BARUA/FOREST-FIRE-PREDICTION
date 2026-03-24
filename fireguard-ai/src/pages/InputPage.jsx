

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as ELG from "leaflet-control-geocoder";
import "leaflet-control-geocoder/dist/Control.Geocoder.css";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";

import Navbar from "../components/Navbar";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/InputPage.css";

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function MapFlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 13);
  }, [position, map]);
  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function MapSearch({ setLat, setLo }) {
  const map = useMap();

  useEffect(() => {
    const geocoder = ELG.geocoder({
      defaultMarkGeocode: false,
    })
      .on("markgeocode", function (e) {
        const center = e.geocode.center;
        setLat(center.lat.toFixed(6));
        setLo(center.lng.toFixed(6));
        map.flyTo(center, 13);
      })
      .addTo(map);

    return () => {
      if (map) map.removeControl(geocoder);
    };
  }, [map, setLat, setLo]);

  return null;
}

export default function InputPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isGuest = location.state?.isGuest ?? true;

  const [lat, setLat] = useState("");
  const [lo, setLo] = useState("");
  const [position, setPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const ODISHA_BOUNDS = {
    minLat: 17.8,
    maxLat: 22.6,
    minLo: 81.3,
    maxLo: 87.5,
  };

  useEffect(() => {
    const l1 = parseFloat(lat);
    const l2 = parseFloat(lo);
    if (!isNaN(l1) && !isNaN(l2)) {
      setPosition([l1, l2]);
    }
  }, [lat, lo]);

  const handleManualInput = (type, value) => {
    if (type === "lat") setLat(value);
    if (type === "lo") setLo(value);
  };

  const handleSearch = async (e) => {
    if (e.key === "Enter" && searchQuery.trim() !== "") {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}`
        );
        const data = await res.json();
        if (data.length > 0) {
          const { lat: newLat, lon: newLo } = data[0];
          setLat(parseFloat(newLat).toFixed(6));
          setLo(parseFloat(newLo).toFixed(6));
        }
      } catch (err) {
        console.error("Search failed", err);
      }
    }
  };

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const { lat: clickedLat, lng: clickedLng } = e.latlng;
        setLat(clickedLat.toFixed(6));
        setLo(clickedLng.toFixed(6));
      },
    });
    return position ? <Marker position={position} /> : null;
  }

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude.toFixed(6));
        setLo(longitude.toFixed(6));
      },
      (error) => {
        alert("Unable to retrieve your location");
        console.error(error);
      }
    );
  };

  const isWithinOdisha = (lat, lo) => {
    const la = parseFloat(lat);
    const ln = parseFloat(lo);
    return (
      la >= ODISHA_BOUNDS.minLat &&
      la <= ODISHA_BOUNDS.maxLat &&
      ln >= ODISHA_BOUNDS.minLo &&
      ln <= ODISHA_BOUNDS.maxLo
    );
  };

  const handleAnalyze = async () => {
    if (!lat || !lo) return;

    if (!isWithinOdisha(lat, lo)) {
      alert("Only Odisha coordinates allowed");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: parseFloat(lat),
          longitude: parseFloat(lo),
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      // ✅ Navigate with server-fetched NDVI, slope, weather, elevation already included
      navigate(
        `/results?lat=${lat}&lo=${lo}&risk=${data.risk}&value=${data.fire_probability}`,
        { state: { isGuest, features: data } } // optional: send all features if needed
      );
    } catch (err) {
      console.error("Prediction failed", err);
      alert("Prediction failed. Check console for details.");
    }
  };

  return (
    <div className="page-layout">
      <Navbar />

      <div className="content-container">
        <aside className="sidebar-column">
          <div className="card-box main-input-card">
            <div className="card-orange-header">
              <span>📍</span>
              <h2>Coordinates</h2>
            </div>

            <div className="card-content-padding">
              <div className="input-group">
                <label>LATITUDE</label>
                <input
                  type="number"
                  value={lat}
                  placeholder="28.6139"
                  onChange={(e) =>
                    handleManualInput("lat", e.target.value)
                  }
                />
              </div>

              <div className="input-group">
                <label>LONGITUDE</label>
                <input
                  type="number"
                  value={lo}
                  placeholder="77.2090"
                  onChange={(e) =>
                    handleManualInput("lo", e.target.value)
                  }
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button className="btn-orange-action" onClick={handleAnalyze}>
                  🔥 ANALYSE RISK
                </button>

                <button
                  className="btn-orange-action"
                  onClick={handleCurrentLocation}
                >
                  📍 USE CURRENT LOCATION
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="map-column">
          <div className="map-card-container">
            <div className="horizontal-search-bar">
              <div className="search-pill">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search on Map..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>
            </div>

            <div className="map-wrapper-inner">
              <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                className="leaflet-full-height"
              >
                <MapResizer />
                <MapFlyTo position={position} />
                <MapSearch setLat={setLat} setLo={setLo} />
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                <LocationMarker />
              </MapContainer>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}




