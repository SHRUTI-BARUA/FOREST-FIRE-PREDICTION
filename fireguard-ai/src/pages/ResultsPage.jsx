import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
    MapContainer,
    TileLayer,
    Marker,
    Circle,
    LayersControl,
} from "react-leaflet";
import L from "leaflet";
import Navbar from "../components/Navbar";
import "leaflet/dist/leaflet.css";
import "../styles/ResultsPage.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

export default function ResultsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    /* --------------------------
       AUTH DETECTION (fixed)
    --------------------------- */
    /* --------------------------
     AUTH DETECTION (Synced with Backend)
 --------------------------- */
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const res = await fetch("http://localhost:4000/check-auth", {
                    method: "GET",
                    credentials: "include", // Essential for cookies/sessions
                });
                const data = await res.json();
                setIsLoggedIn(!!data.status);
            } catch (err) {
                setIsLoggedIn(false);
            } finally {
                setIsLoadingAuth(false);
            }
        };
        checkUser();
    }, []);


    const isGuest = !isLoggedIn;

    const [showPopup, setShowPopup] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);

    /* --------------------------
       URL PARAMETERS
    --------------------------- */
    const lat = parseFloat(searchParams.get("lat"));
    const lo = parseFloat(searchParams.get("lo"));
    const targetProb = parseFloat(searchParams.get("value")) || 0;
    const targetProbPercent = targetProb * 100;
    const fireRisk = (searchParams.get("risk") || "LOW").toUpperCase();

    const [isLoading, setIsLoading] = useState(true);
    const [displayProb, setDisplayProb] = useState(0);

    /* --------------------------
       SAVE PREDICTION FUNCTION
    --------------------------- */
    const savePrediction = async () => {
        try {
            const response = await fetch("http://localhost:4000/api/predict-fire", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    latitude: lat,
                    longitude: lo,
                    isGuest: false,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save prediction");
            }

            console.log("Prediction + Save successful");
        } catch (error) {
            console.error("Error:", error);
        }
    };

    /* --------------------------
       ANIMATION + AUTO SAVE
    --------------------------- */
    
    useEffect(() => {
    // 🔴 ADD THIS LINE: Wait for the auth check to finish
    if (isLoadingAuth) return; 

    let counter;
    const timer = setTimeout(() => {
        setIsLoading(false);

        // Now we are sure if they are a guest or not
        if (isGuest) {
            setShowPopup(true);
        }

        let start = 0;
        const duration = 1600;
        const increment = targetProbPercent / (duration / 16);

        counter = setInterval(() => {
            start += increment;
            if (start >= targetProbPercent) {
                setDisplayProb(targetProbPercent);
                clearInterval(counter);

                // This will now correctly trigger because isLoggedIn is accurate
                if (isLoggedIn && !hasSaved) {
                    savePrediction();
                    setHasSaved(true);
                }
            } else {
                setDisplayProb(start);
            }
        }, 16);
    }, 500);

    return () => {
        clearTimeout(timer);
        if (counter) clearInterval(counter);
    };
    // 🔴 UPDATE dependencies to include isLoadingAuth
}, [isLoadingAuth, targetProbPercent, isGuest, isLoggedIn, hasSaved]);

    /* --------------------------
       MAP CIRCLE CALCULATIONS
    --------------------------- */
    const radius = 85;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset =
        circumference - (displayProb / 100) * circumference;

    if (!lat || !lo)
        return <div className="error-screen">Coordinates Missing</div>;

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
                                    <div className="result-item">
                                        <label className="sidebar-label">
                                            Risk Probability
                                        </label>

                                        <div
                                            className={`circle-container ${fireRisk === "HIGH" ? "risk-pulse" : ""
                                                }`}
                                        >
                                            <div className="outer-ring"></div>

                                            <svg width="220" height="220">
                                                <circle
                                                    className="circle-bg"
                                                    cx="110"
                                                    cy="110"
                                                    r={radius}
                                                />
                                                <circle
                                                    className="circle-progress"
                                                    cx="110"
                                                    cy="110"
                                                    r={radius}
                                                    style={{
                                                        strokeDasharray: circumference,
                                                        strokeDashoffset: strokeDashoffset,
                                                        stroke:
                                                            fireRisk === "HIGH"
                                                                ? "#ff3131"
                                                                : fireRisk === "MODERATE"
                                                                    ? "#ffc107"
                                                                    : "#00ff41",
                                                    }}
                                                />
                                            </svg>

                                            <div className="percentage-text-wrapper">
                                                <h1>{displayProb.toFixed(1)}%</h1>
                                                <span>POTENTIAL</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className={`risk-status-box ${fireRisk === "HIGH"
                                                ? "risk-yes"
                                                : fireRisk === "MODERATE"
                                                    ? "risk-mid"
                                                    : "risk-no"
                                            }`}
                                    >
                                        {fireRisk === "HIGH"
                                            ? "🔥 HIGH RISK"
                                            : fireRisk === "MODERATE"
                                                ? "⚠️ MODERATE RISK"
                                                : "✅ LOW RISK"}
                                    </div>

                                    {fireRisk === "HIGH" &&
                                        targetProbPercent > 70 && (
                                            <div className="emergency-alert-box">
                                                <h3>🚨 IMMEDIATE ACTION REQUIRED</h3>
                                                <p>
                                                    Fire probability is extremely high in
                                                    this region. Please contact emergency
                                                    services immediately.
                                                </p>

                                                <button
                                                    className="btn-helpline"
                                                    onClick={() =>
                                                        navigate("/helpline")
                                                    }
                                                >
                                                    🚒 Go To Emergency Helpline
                                                </button>
                                            </div>
                                        )}

                                    <button
                                        className="btn-back"
                                        onClick={() => navigate("/input")}
                                    >
                                        NEW ANALYSIS
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </aside>

                {/* Map */}
                <main className="map-column">
                    <MapContainer
                        center={[lat, lo]}
                        zoom={14}
                        className="leaflet-full-height"
                        zoomControl={false}
                    >
                        <LayersControl position="topright">
                            <LayersControl.BaseLayer
                                checked
                                name="Satellite Imagery"
                            >
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
                                color:
                                    fireRisk === "HIGH"
                                        ? "#ff3131"
                                        : fireRisk === "MODERATE"
                                            ? "#ffc107"
                                            : "#00ff41",

                                fillColor:
                                    fireRisk === "HIGH"
                                        ? "#ff3131"
                                        : fireRisk === "MODERATE"
                                            ? "#ffc107"
                                            : "#00ff41",

                                fillOpacity: 0.35,
                                weight: 3,
                                dashArray:
                                    fireRisk === "HIGH"
                                        ? "10, 15"
                                        : "0",
                            }}
                        />
                    </MapContainer>
                </main>
            </div>

            {/* Guest Popup */}
            {showPopup && (
                <div style={overlayStyle}>
                    <div style={popupStyle}>
                        <h3>Save This Prediction?</h3>
                        <p>
                            You are using Guest Mode. Login to save this
                            result.
                        </p>

                        <div style={{ display: "flex", gap: "15px" }}>
                            <button
                                style={loginBtnStyle}
                                onClick={() => navigate("/login")}
                            >
                                Login
                            </button>

                            <button
                                style={cancelBtnStyle}
                                onClick={() => setShowPopup(false)}
                            >
                                Continue as Guest
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* --------------------------
   STYLES
--------------------------- */

const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
};

const popupStyle = {
    background: "#1f2937",
    padding: "25px",
    borderRadius: "12px",
    textAlign: "center",
    color: "#fff",
    width: "350px",
};

const loginBtnStyle = {
    background: "#f97316",
    border: "none",
    padding: "8px 18px",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#fff",
};

const cancelBtnStyle = {
    background: "#374151",
    border: "1px solid #4b5563",
    padding: "8px 18px",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#fff",
};