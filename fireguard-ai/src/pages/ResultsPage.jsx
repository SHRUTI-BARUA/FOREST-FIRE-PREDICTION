import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import Navbar from '../components/Navbar';
import 'leaflet/dist/leaflet.css';
import '../styles/ResultsPage.css';

// Leaflet default marker fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL parameters
  const lat = parseFloat(searchParams.get('lat'));
  const lo = parseFloat(searchParams.get('lo'));
  const targetProb = parseFloat(searchParams.get('value')) || 0;
  const targetProbPercent = targetProb * 100; // <-- convert to %

  //const targetProb = parseFloat(searchParams.get('value')) || 0;
  const fireRisk = (searchParams.get('risk') || 'LOW').toUpperCase(); // HIGH / LOW

  const [isLoading, setIsLoading] = useState(true);
  const [displayProb, setDisplayProb] = useState(0);

  // Radar circle calculation
  const radius = 85;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayProb / 100) * circumference;

  
  useEffect(() => {
    let counter;

    const timer = setTimeout(() => {
      setIsLoading(false);
      let start = 0;
      const duration = 1600;
      const increment = targetProbPercent / (duration / 16);

      counter = setInterval(() => {
        start += increment;
        if (start >= targetProbPercent) {
          setDisplayProb(targetProbPercent);
          clearInterval(counter);
        } else {
          setDisplayProb(start);
        }
      }, 16);
    }, 500);

    return () => {
      clearTimeout(timer);
      if (counter) clearInterval(counter);
    };
  }, [targetProbPercent]);

  if (!lat || !lo) return <div className="error-screen">Coordinates Missing</div>;

  return (
    <div className="page-layout">
      <Navbar />

      <div className="content-container">
        {/* Sidebar */}
        <aside className="sidebar-column">
          <div className="card-box">
            <div className="card-orange-header">
              <h2>SATELLITE AUDIT</h2>
            </div>

            <div className="analysis-section">
              {isLoading ? (
                <div className="loader-container">
                  <div className="spinner"></div>
                  <p>ANALYZING THERMAL FEED...</p>
                </div>
              ) : (
                <>
                  {/* Risk Probability Radar */}
                  <div className="result-item">
                    <label className="sidebar-label">Risk Probability</label>

                    <div className={`circle-container ${fireRisk === "HIGH" ? 'risk-pulse' : ''}`}>
                      <div className="outer-ring"></div>
                      <svg className="svg-circle" width="220" height="220">
                        <circle className="circle-bg" cx="110" cy="110" r={radius} />
                        <circle
                          className="circle-progress"
                          cx="110"
                          cy="110"
                          r={radius}
                          style={{
                            strokeDasharray: circumference,
                            strokeDashoffset: strokeDashoffset,
                            stroke: fireRisk === "HIGH" ? "#ff5e00" : "#00ff41"
                          }}
                        />
                      </svg>

                      <div className="percentage-text-wrapper">
                        <h1>{displayProb.toFixed(1)}%</h1>
                        <span>POTENTIAL</span>
                      </div>
                    </div>
                  </div>

                  {/* Risk Status */}
                  <div className={`risk-status-box ${fireRisk === "HIGH" ? 'risk-yes' : 'risk-no'}`}>
                    {fireRisk === "HIGH" ? "🔥 HIGH RISK" : "✅ LOW RISK"}
                  </div>

                  <button className="btn-back" onClick={() => navigate('/input')}>
                    NEW ANALYSIS
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Map */}
        <main className="map-column">
          <div className="map-output-display">
            <MapContainer center={[lat, lo]} zoom={14} className="leaflet-full-height" zoomControl={false}>
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Satellite Imagery">
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Street Map">
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                </LayersControl.BaseLayer>
              </LayersControl>

              <Marker position={[lat, lo]} />

              <Circle
                center={[lat, lo]}
                radius={2000}
                pathOptions={{
                  color: fireRisk === "HIGH" ? '#ff3131' : '#00ff41',
                  fillColor: fireRisk === "HIGH" ? '#ff3131' : '#00ff41',
                  fillOpacity: 0.35,
                  weight: 3,
                  dashArray: fireRisk === "HIGH" ? '10, 15' : '0'
                }}
              />
            </MapContainer>
          </div>
        </main>
      </div>
    </div>
  );
}
