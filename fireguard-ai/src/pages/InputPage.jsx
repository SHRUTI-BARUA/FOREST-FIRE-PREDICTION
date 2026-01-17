import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import Navbar from '../components/Navbar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/InputPage.css';

// =======================
// Leaflet marker fix
// =======================
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// =======================
// Map helpers
// =======================
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

// =======================
// Main Component
// =======================
export default function InputPage() {
  const navigate = useNavigate();
  const [lat, setLat] = useState('');
  const [lo, setLo] = useState('');
  const [position, setPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [region] = useState('orissa');
  const ODISHA_BOUNDS = {
  minLat: 17.8,
  maxLat: 22.6,
  minLo: 81.3,
  maxLo: 87.5,
};


  // Sync position whenever lat/lo change
  useEffect(() => {
    const l1 = parseFloat(lat);
    const l2 = parseFloat(lo);
    if (!isNaN(l1) && !isNaN(l2)) {
      setPosition([l1, l2]);
    }
  }, [lat, lo]);

  // Manual input
  const handleManualInput = (type, value) => {
    if (type === 'lat') setLat(value);
    if (type === 'lo') setLo(value);
  };

  // Search bar
  const handleSearch = async (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
        );
        const data = await res.json();
        if (data.length > 0) {
          const { lat: newLat, lon: newLo } = data[0];
          setLat(parseFloat(newLat).toFixed(6));
          setLo(parseFloat(newLo).toFixed(6));
        }
      } catch (err) {
        console.error('Search failed', err);
      }
    }
  };

  // Map click
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
    alert("Only Odisha (Orissa) coordinates allowed");
    return;
  }

  const payload = {
    latitude: parseFloat(lat),
    longitude: parseFloat(lo),
     temp_c: 39.5,
  rh: 18,
  wind_ms: 6.2,
  rain_mm: 0.0,
  NDVI: 0.32,
  Elevation: 220,
  Slope: 12,

  day: 150,   // 👈 DOY = 150
  month: 5 
  };

  const res = await fetch("http://localhost:5000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  navigate(
    `/results?lat=${lat}&lo=${lo}&risk=${data.risk}&value=${data.fire_probability}`
  );
};


  return (
    <div className="page-layout">
      <Navbar />
      <div className="content-container">
        {/* Sidebar */}
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
                  onChange={(e) => handleManualInput('lat', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>LONGITUDE</label>
                <input
                  type="number"
                  value={lo}
                  placeholder="77.2090"
                  onChange={(e) => handleManualInput('lo', e.target.value)}
                />
              </div>
              <button
                className="btn-orange-action"
                onClick={handleAnalyze}
                disabled={!lat || !lo}
              >
                🔥 ANALYSE RISK
              </button>
            </div>
          </div>
        </aside>

        {/* Map */}
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
              <MapContainer center={[20.5937, 78.9629]} zoom={5} className="leaflet-full-height">
                <MapResizer />
                <MapFlyTo position={position} />
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
