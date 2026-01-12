import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import Navbar from '../components/Navbar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/InputPage.css';

// Leaflet default marker fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
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
    const timer = setTimeout(() => { map.invalidateSize(); }, 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export default function InputPage() {
  const navigate = useNavigate();
  const [lat, setLat] = useState('');
  const [lo, setLo] = useState(''); 
  const [position, setPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleManualInput = (type, value) => {
    if (type === 'lat') setLat(value);
    if (type === 'lo') setLo(value);
    const l1 = parseFloat(type === 'lat' ? value : lat);
    const l2 = parseFloat(type === 'lo' ? value : lo);
    if (!isNaN(l1) && !isNaN(l2)) setPosition([l1, l2]);
  };

  // Directs user to the searched location
  const handleSearch = async (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
        const data = await response.json();
        if (data.length > 0) {
          const { lat: newLat, lon: newLo } = data[0];
          setLat(parseFloat(newLat).toFixed(6));
          setLo(parseFloat(newLo).toFixed(6));
          setPosition([parseFloat(newLat), parseFloat(newLo)]);
        }
      } catch (error) {
        console.error("Search failed", error);
      }
    }
  };

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const { lat: clickedLat, lng: clickedLng } = e.latlng;
        setLat(clickedLat.toFixed(6));
        setLo(clickedLng.toFixed(6));
        setPosition([clickedLat, clickedLng]);
      },
    });
    return position ? <Marker position={position} /> : null;
  }

  const handleAnalyze = () => {
    if (lat && lo) navigate(`/results?lat=${lat}&lo=${lo}`);
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
                <input type="number" value={lat} placeholder="28.6139" onChange={(e) => handleManualInput('lat', e.target.value)} />
              </div>
              <div className="input-group">
                <label>LONGITUDE</label>
                <input type="number" value={lo} placeholder="77.2090" onChange={(e) => handleManualInput('lo', e.target.value)} />
              </div>
              <button className="btn-orange-action" onClick={handleAnalyze} disabled={!lat || !lo}>
                🔥 ANALYSE RISK
              </button>
            </div>
          </div>
        </aside>

        <main className="map-column">
          <div className="map-card-container">
            {/* GOOGLE MAPS STYLE SEARCH BAR */}
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

            {!position && <div className="map-hint-bubble">Click map or type coordinates</div>}
            
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