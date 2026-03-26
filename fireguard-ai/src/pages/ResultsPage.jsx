import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap,
} from "react-leaflet";
import Draggable from "react-draggable";
import Navbar from "../components/Navbar";
import L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";
import "../styles/ResultsPage.css";

// --- Leaflet Icon Fix ---
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Sub-Component: Heatmap Layer ---
// --- Sub-Component: Heatmap Layer ---
function HeatmapLayer({ data, riskLevel, isSimulation }) {
    const map = useMap();
    const layerRef = useRef(null);

    useEffect(() => {
        // 1. Remove previous layer strictly
        if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
        }

        if (data && data.length > 0) {
            // DEFINE GRADIENTS
            const fireGradient = { 0.3: "#00ff41", 0.6: "#ffc107", 0.9: "#ff3131" }; // Green -> Yellow -> Red
            const yellowGradient = { 0.0: "#ffc107", 1.0: "#ffc107" }; // Pure Yellow for Moderate
            const greenGradient = { 0.0: "#00ff41", 1.0: "#00ff41" };  // Pure Green for Low
            const simulationGradient = { 0.4: "#ffeb3b", 0.7: "#ff9800", 1.0: "#f44336" }; // Burning Fire: Yellow -> Orange -> Red
            
            let activeGradient = fireGradient;
            if (isSimulation) {
                activeGradient = simulationGradient;
            } else {
                if (riskLevel === "LOW") {
                    activeGradient = greenGradient;
                } else if (riskLevel === "MODERATE" || riskLevel === "MEDIUM") {
                    activeGradient = yellowGradient;
                } else {
                    activeGradient = fireGradient; // Stays Green->Yellow->Red for High
                }
            }

            const points = data.map((p) => [p.lat, p.lon, p.risk || p.intensity || 1.0]);

            layerRef.current = L.heatLayer(points, {
                radius: 25,
                blur: 15,
                maxZoom: 10,
                gradient: activeGradient,
            }).addTo(map);
        }

        return () => {
            if (layerRef.current) map.removeLayer(layerRef.current);
        };
    }, [data, map, riskLevel, isSimulation]); 

    return null;
}

// --- Sub-Component: Recenter Map ---
function RecenterButton({ lat, lo }) {
    const map = useMap();
    return (
        <button className="recenter-tool" onClick={() => map.flyTo([lat, lo], 12)}>
            🎯
        </button>
    );
}

export default function ResultsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const initialFeatures = location.state?.features;

    // State for Prediction & Grid
    const [prediction, setPrediction] = useState(initialFeatures || null);
    const [heatmapData, setHeatmapData] = useState([]);
    const [fullTimeseries, setFullTimeseries] = useState([]);

    // State for Animation
    const [currentStep, setCurrentStep] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [displayProb, setDisplayProb] = useState(0);
    const [loading, setLoading] = useState(!initialFeatures);
    const [isSimulating, setIsSimulating] = useState(false); // 🔥 For the radar popup

    const nodeRefCard = useRef(null);
    const nodeRefHud = useRef(null);

    const lat = parseFloat(searchParams.get("lat")) || 20.2961;
    const lo = parseFloat(searchParams.get("lo")) || 84.8245;

    const fireRisk = (prediction?.risk || searchParams.get("risk") || "LOW").toUpperCase();

    // 1. Unified Data Fetch (Single Point Only)
    useEffect(() => {
        const fetchAllData = async () => {
            if (!prediction) setLoading(true);
            try {
                // Fetch Single Point Prediction if not available
                let predData = prediction;
                if (!predData) {
                    const predRes = await fetch("http://localhost:5000/predict", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ latitude: lat, longitude: lo }),
                    });
                    predData = await predRes.json();
                    setPrediction(predData);
                }
            } catch (err) {
                console.error("Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [lat, lo]);

    // 🔥 Trigger Prediction Simulation Logic
    const handlePredictSpread = async () => {
        if (fullTimeseries.length > 0) {
            setIsAnimating(!isAnimating);
            return;
        }

        setIsSimulating(true);
        try {
            const gridRes = await fetch("http://localhost:5000/predict-grid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ latitude: lat, longitude: lo }),
            });
            const gridData = await gridRes.json();
            
            if (gridData.status === "success") {
                setFullTimeseries(gridData.timeseries);
                setHeatmapData(gridData.initial);
                setIsAnimating(true);
            }
        } catch (err) {
            console.error("Grid Fetch Error:", err);
        } finally {
            setIsSimulating(false);
        }
    };

    // 2. Spread Animation Logic
    useEffect(() => {
        let interval = null;
        if (isAnimating && fullTimeseries.length > 0) {
            interval = setInterval(() => {
                setCurrentStep((prev) => {
                    const next = prev + 1;
                    if (next >= fullTimeseries.length) {
                        setIsAnimating(false); // Stop when complete
                        return prev; // Stay at last step
                    }
                    return next;
                });
            }, 500); // 500ms per hour for smoother motion
        }
        return () => clearInterval(interval);
    }, [isAnimating, fullTimeseries, fireRisk]);

    // 3. Update Heatmap when step changes
    useEffect(() => {
        if (fullTimeseries[currentStep]) {
            setHeatmapData(fullTimeseries[currentStep].data);
        }
    }, [currentStep, fullTimeseries]);

    // 4. Score Counter Animation
    useEffect(() => {
        if (!prediction) return;
        let start = 0;
        const target = Math.floor(prediction.fire_probability * 100);
        const counter = setInterval(() => {
            if (start >= target) {
                setDisplayProb(target);
                clearInterval(counter);
            } else {
                start += 1;
                setDisplayProb(start);
            }
        }, 20);
        return () => clearInterval(counter);
    }, [prediction]);

    const safetyInfo = useMemo(() => {
        if (heatmapData.length === 0 || !prediction) return { dist: "..." };

        // If the current prediction is already LOW risk, distance is 0
        if (prediction.risk.toUpperCase() === "LOW") {
            return { dist: "0.00" };
        }

        const getDist = (lat1, lon1, lat2, lon2) => {
            const R = 6371;
            const dLat = ((lat2 - lat1) * Math.PI) / 180;
            const dLon = ((lon2 - lon1) * Math.PI) / 180;
            const a = Math.sin(dLat / 2) ** 2 + 
                      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
            return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        };

        // Find the point in the grid with the lowest risk
        const safest = heatmapData.reduce((prev, curr) => curr.risk < prev.risk ? curr : prev);
        return { dist: getDist(lat, lo, safest.lat, safest.lon).toFixed(2) };
    }, [heatmapData, lat, lo, prediction]);


    return (
        <div className="dashboard-wrapper">
            {/* 🔥 HIGH-TECH COMMAND CENTER OVERLAY */}
            {isSimulating && (
                <div className="loading-doodle-overlay">
                    <div className="hud-scanner-container">
                        <div className="hex-grid"></div>
                        <div className="scanning-line"></div>
                        <div className="radar-circle">
                            <div className="scanning-beam"></div>
                            <div className="marker-pings">
                                <span className="ping p1"></span>
                                <span className="ping p2"></span>
                                <span className="ping p3"></span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="analysis-console">
                        <header className="console-header">
                            <span className="console-title">SPATIAL RISK ANALYSIS</span>
                            <div className="console-dots"><span></span><span></span><span></span></div>
                        </header>
                        <div className="console-logs">
                            <p className="log-line">INITIATING GEOSPATIAL SCAN...</p>
                            <p className="log-line delay-1">FETCHING WIND VECTORS: [{prediction?.features?.wind_speed || 2.4} m/s]</p>
                            <p className="log-line delay-2">NDVI GRADIENT MAPPING: [0.65 - 0.82]</p>
                            <p className="log-line delay-3">TERRAIN SLOPE CALCULATION: [{prediction?.features?.slope || 15}°]</p>
                            <p className="log-line delay-4 highlight">RESOLVING FIRE SPREAD MODELS...</p>
                        </div>
                    </div>

                    <div className="coordinate-tracker">
                        <div className="coord-item"><span>LAT:</span> {lat.toFixed(6)}</div>
                        <div className="coord-item"><span>LON:</span> {lo.toFixed(6)}</div>
                    </div>

                    <div className="progress-status-container">
                        <h2 className="loading-text">GENERATING FORECAST</h2>
                        <div className="progress-bar-mini">
                            <div className="progress-fill shadow-green"></div>
                        </div>
                    </div>
                </div>
            )}

            <div className="nav-container-fixed">
                <Navbar />
            </div>

            <div className="main-viewport">
                {/* HUD: Safe Zone */}
                <Draggable nodeRef={nodeRefHud} bounds="parent">
                    <div className="top-safe-hud draggable-element" ref={nodeRefHud}>
                        <div className="hud-content">
                            <span className="hud-dot"></span>
                            <span className="hud-label">NEAREST SAFE ZONE:</span>
                            <span className="hud-value">{safetyInfo.dist}</span>
                            <span className="hud-unit">KM</span>
                        </div>
                    </div>
                </Draggable>

                {/* TIME CONTROLLER (New) */}
                <div className="time-controls-overlay">
                    <div className="glass-panel-control">
                        <button className="play-btn" onClick={handlePredictSpread}>
                            {isAnimating ? "⏸ PAUSE SIM" : "▶ PREDICT SPREAD"}
                        </button>
                        <div className="step-info">
                            <span>FORECAST: T + {currentStep}h</span>
                            <input
                                type="range" min="0" max={fullTimeseries.length - 1}
                                value={currentStep} onChange={(e) => { setIsAnimating(false); setCurrentStep(parseInt(e.target.value)); }}
                            />
                        </div>
                    </div>
                </div>

                <MapContainer center={[lat, lo]} zoom={10} className="full-screen-map" zoomControl={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {/* Pass the risk status here */}
                    {heatmapData.length > 0 && (
                        <HeatmapLayer
                            data={heatmapData}
                            riskLevel={fireRisk}
                            isSimulation={currentStep > 0}
                        />
                    )}

                    <Marker position={[lat, lo]}>
                        <Popup><b>Analysis Point</b><br />Risk: {fireRisk}</Popup>
                    </Marker>
                </MapContainer>

                {/* Sidebar: Satellite Audit */}
                <Draggable nodeRef={nodeRefCard} handle=".drag-handle" bounds="parent">
                    <div className="floating-sidebar draggable-element" ref={nodeRefCard}>
                        <div className="audit-card">
                            <header className="audit-header drag-handle">
                                <span className="live-dot"></span>
                                <h3>SATELLITE AUDIT</h3>
                            </header>
                            <div className="audit-content">
                                <div className="prob-circle-zone">
                                    <svg width="180" height="180" className="radial-svg">
                                        <circle className="r-bg" cx="90" cy="90" r={70} />
                                        <circle className="r-progress" cx="90" cy="90" r={70}
                                            style={{
                                                strokeDasharray: 440,
                                                strokeDashoffset: 440 - (displayProb / 100) * 440,
                                                stroke: fireRisk === "HIGH" ? "#f10505" : fireRisk === "MODERATE" ? "#ffc107" : "#00ff41",
                                            }}
                                        />
                                    </svg>
                                    <div className="prob-label-wrap">
                                        <h1 className="prob-val">{displayProb}%</h1>
                                        <span className="prob-sub">PROBABILITY</span>
                                    </div>
                                </div>
                                <div className={`risk-badge-flat ${fireRisk.toLowerCase()}`}>{fireRisk} RISK DETECTED</div>
                                <div className="metrics-grid">
                                    <div className="metric-box"><span className="m-title">LATITUDE</span><span className="m-val">{lat.toFixed(4)}°</span></div>
                                    <div className="metric-box"><span className="m-title">LONGITUDE</span><span className="m-val">{lo.toFixed(4)}°</span></div>
                                    <div className="metric-box"><span className="m-title">TEMP</span><span className="m-val">{prediction?.features?.temp_c?.toFixed(1) || "--"}°C</span></div>
                                    <div className="metric-box"><span className="m-title">HUMID</span><span className="m-val">{prediction?.features?.RH?.toFixed(0) || "--"}%</span></div>
                                </div>
                                <button className="btn-action-primary" onClick={() => navigate("/input")}>NEW ANALYSIS</button>
                                {fireRisk === "HIGH" && (
                                    <button className="btn-helpline-alert" onClick={() => navigate("/helpline")}>🆘 EMERGENCY HELPLINE</button>
                                )}
                            </div>
                        </div>
                    </div>
                </Draggable>

                <div className="floating-legend">
                    <div className="leg-item"><span className="dot low"></span> Low</div>
                    <div className="leg-item"><span className="dot mid"></span> Moderate</div>
                    <div className="leg-item"><span className="dot high"></span> High</div>
                </div>
            </div>
        </div>
    );
}