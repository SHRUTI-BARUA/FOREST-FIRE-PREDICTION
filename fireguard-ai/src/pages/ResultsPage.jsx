import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, LayersControl } from 'react-leaflet';
import Navbar from '../components/Navbar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/ResultsPage.css';

// Fix for default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Custom Factors: lat and lo
  const lat = parseFloat(searchParams.get('lat'));
  const lo = parseFloat(searchParams.get('lo'));

  const [isLoading, setIsLoading] = useState(true);
  const [displayProb, setDisplayProb] = useState(0);
  
  // Result Data (Mocked for UI)
  const targetProb = 87.5; 
  const fireRisk = "YES"; 

  // Radar SVG Math
  const radius = 85; 
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayProb / 100) * circumference;

  useEffect(() => {
    // Initial loading delay to simulate AI processing
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // Count-up animation for the probability number
      let start = 0;
      const duration = 1600; 
      const increment = targetProb / (duration / 16);

      const counter = setInterval(() => {
        start += increment;
        if (start >= targetProb) {
          setDisplayProb(targetProb);
          clearInterval(counter);
        } else {
          setDisplayProb(start);
        }
      }, 16);
    }, 2000);

    return () => clearTimeout(timer);
  }, [targetProb]);

  if (!lat || !lo) return <div className="error-screen">Coordinates Missing</div>;

  return (
    <div className="page-layout">
      <Navbar />
      
      <div className="content-container">
        {/* SIDEBAR: Analysis Results */}
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
                  <div className="result-item">
                    <label className="sidebar-label">Risk Probability</label>
                    
                    {/* RADAR COMPONENT */}
                    <div className={`circle-container ${fireRisk === "YES" ? 'risk-pulse' : ''}`}>
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
                            stroke: fireRisk === "YES" ? "#ff5e00" : "#00ff41"
                          }}
                        />
                      </svg>
                      
                      {/* BOLD BLACK CENTERED NUMBER */}
                      <div className="percentage-text-wrapper">
                        <h1>{displayProb.toFixed(1)}%</h1>
                        <span>POTENTIAL</span>
                      </div>
                    </div>
                  </div>

                  {/* STATUS BOX */}
                  <div className={`risk-status-box ${fireRisk === "YES" ? 'risk-yes' : 'risk-no'}`}>
                    {fireRisk === "YES" ? "🔥 HIGH RISK" : "✅ LOW RISK"}
                  </div>

                  <button className="btn-back" onClick={() => navigate('/input')}>
                    NEW ANALYSIS
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* MAIN: Full Screen Map */}
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
                    color: fireRisk === "YES" ? '#ff3131' : '#00ff41', 
                    fillColor: fireRisk === "YES" ? '#ff3131' : '#00ff41', 
                    fillOpacity: 0.35,
                    weight: 3,
                    dashArray: fireRisk === "YES" ? '10, 15' : '0'
                }} 
              />
            </MapContainer>
          </div>
        </main>
      </div>
    </div>
  );
}

