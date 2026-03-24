/* import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Hero.css";

export default function Hero() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // 🔥 Your slide images (use public folder images)
  const slides = [
    "/i3.jpg",
    "/p1.avif",
    "/p2.avif",
    "/p3.webp",
    "/i1.jpg"
  ];

  // 🔁 Auto slider
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [slides.length]);

  // 🔐 AUTH CHECK
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:4000/check-auth", {
          credentials: "include",
        });

        const data = await res.json();

        if (data.status) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    checkAuth();
  }, []);

  const handleStartAnalysis = () => {
    if (!user) {
      setShowAuthPopup(true);
    } else {
      navigate("/input", { state: { isGuest: false } });
    }
  };

  const handleGuestMode = () => {
    setShowAuthPopup(false);
    navigate("/input", { state: { isGuest: true } });
  };
  return (
  <div className="homepage-wrapper">
    <div className="hero">
      <div className="slider">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`slide ${index === currentSlide ? "active" : ""}`}
          >
           
            <div
              className="slide-bg"
              style={{ backgroundImage: `url(${slide})` }}
            ></div>

          
            <div className="slide-left">
              <h1>
                Empowering Forest Protection <br />
                with AI Fire Intelligence
              </h1>
              <p>
                Monitor wildfire risks using advanced machine learning,
                satellite data, and predictive analytics.
              </p>
              <div className="hero-buttons">
                <button onClick={handleStartAnalysis} className="btn-primary">
                  🔥 Check Fire Risk
                </button>
              </div>
            </div>

            <div className="slide-right">
              <img src={slide} alt="Wildfire" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {showAuthPopup && (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.8)", // Darkened for better focus
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10000, // Higher than everything
        }}
      >
        <div
          style={{
            background: "#111",
            padding: "35px",
            borderRadius: "16px",
            textAlign: "center",
            width: "320px",
            boxShadow: "0 0 25px rgba(0,0,0,0.6)",
            border: "1px solid #333", // Added border for visibility
          }}
        >
          <h3 style={{ color: "white", marginBottom: "20px" }}>
            Continue to Analysis
          </h3>

          <button
            onClick={() => navigate("/login")}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "12px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Login
          </button>

          <button
            onClick={() => navigate("/signup")}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "12px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Sign Up
          </button>

          <button
            onClick={handleGuestMode}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              background: "#444",
              color: "white",
            }}
          >
            Continue as Guest
          </button>

          <button
            onClick={() => setShowAuthPopup(false)}
            style={{
              marginTop: "20px",
              background: "none",
              border: "none",
              color: "#ff4d4d",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )}
  </div>
); 

}
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Hero.css";

export default function Hero() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = ["/i3.jpg", "/p1.avif", "/p2.avif", "/p3.webp", "/i1.jpg"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length]);

  // Auth Check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:4000/check-auth", {
          credentials: "include",
        });
        const data = await res.json();
        if (data.status) setUser(data.user);
        else setUser(null);
      } catch {
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  const handleStartAnalysis = () => {
    console.log("Button clicked, user status:", user); // Debug log
    if (!user) {
      setShowAuthPopup(true);
    } else {
      navigate("/input", { state: { isGuest: false } });
    }
  };

  const handleGuestMode = () => {
    setShowAuthPopup(false);
    navigate("/input", { state: { isGuest: true } });
  };

  return (
    <div className="homepage-wrapper">
      <div className="hero">
        <div className="slider">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`slide ${index === currentSlide ? "active" : ""}`}
            >
              <div
                className="slide-bg"
                style={{ backgroundImage: `url(${slide})` }}
              ></div>

              <div className="slide-left">
                <h1>
                  Empowering Forest Protection <br />
                  with AI Fire Intelligence
                </h1>
                <p>
                  Monitor wildfire risks using advanced machine learning,
                  satellite data, and predictive analytics.
                </p>
                <div className="hero-buttons">
                  <button onClick={handleStartAnalysis} className="btn-primary">
                    🔥 Check Fire Risk
                  </button>
                </div>
              </div>

              <div className="slide-right">
                <img src={slide} alt="Wildfire" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- AUTH POPUP --- */}
      {showAuthPopup && (
        <div className="auth-overlay">
          <div className="auth-modal">
            <h3>Continue to Analysis</h3>
            <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "20px" }}>
              Log in to save your history or continue as a guest.
            </p>

            <button className="auth-btn login-btn" onClick={() => navigate("/login")}>
              Login
            </button>

            <button className="auth-btn signup-btn" onClick={() => navigate("/signup")}>
              Sign Up
            </button>

            <div className="divider">OR</div>

            <button className="auth-btn guest-btn" onClick={handleGuestMode}>
              Continue as Guest
            </button>

            <button className="cancel-link" onClick={() => setShowAuthPopup(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}