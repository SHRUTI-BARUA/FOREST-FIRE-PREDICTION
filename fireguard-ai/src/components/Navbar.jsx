import React, { useEffect, useState, useRef } from "react"; // 🔴 useRef added
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/Navbar.css";
import { AUTH_API_URL, MODEL_API_URL } from '../config/api';


export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Initialize immediately from localStorage for instant, flicker-free rendering
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // ✅ Get guest mode from route state (matches Home.jsx)
  const isGuest = location.state?.isGuest === true;

  // ✅ Check auth whenever route changes or storage event fires
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${AUTH_API_URL}/check-auth`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      const data = await res.json();

      if (data.status && data.user) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      } else if (!token && !localStorage.getItem("user")) {
        setUser(null);
      }
    } catch (err) {
      // Keep existing local user on network glitch
      try {
        const saved = localStorage.getItem("user");
        if (saved) setUser(JSON.parse(saved));
      } catch {}
    }
  };

  useEffect(() => {
    checkAuth();

    const handleAuthChange = () => {
      try {
        const saved = localStorage.getItem("user");
        setUser(saved ? JSON.parse(saved) : null);
      } catch {
        setUser(null);
      }
      checkAuth();
    };

    window.addEventListener("authChange", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("authChange", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, [location]);

  // ✅ Logout
  const handleLogout = async () => {
    try {
      await fetch(`${AUTH_API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.log("Logout failed");
    } finally {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
      window.dispatchEvent(new Event("authChange"));
      navigate("/");
    }
  };

  // ✅ Protected Navigation (FIXED)
  const handleProtectedRoute = (path) => {
    const activeUser = user || (localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null);
    if (activeUser || isGuest) {
      navigate(path, { state: { isGuest, user: activeUser } });
    } else {
      alert("Please login, signup, or continue as Guest to access this page.");
      navigate("/");
    }
  };

  return (
    <nav 
      className="navbar navbar-expand-lg navbar-dark forest-navbar" 
      style={{ position: "absolute", top: 0, left: 0, width: "100%", zIndex: 1030 }}
    >
      <div className="container-fluid">

        <Link to="/" className="navbar-brand d-flex align-items-center gap-2">
          <img src="/logo.png" alt="ForestGuard Logo" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
          <span>ForestGuard</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">

          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <button
                className="nav-link btn btn-link"
                onClick={() => handleProtectedRoute("/analytics")}
              >
                Analytics
              </button>
            </li>

            <li className="nav-item">
              <button
                className="nav-link btn btn-link"
                onClick={() => handleProtectedRoute("/helpline")}
              >
                Helpline
              </button>
            </li>
          </ul>

          <ul className="navbar-nav">
            {user ? (
              <>
                <li className="nav-item">
                  <span className="nav-link">
                    Hello, {user.username}
                  </span>
                </li>

                <li className="nav-item">
                  <button
                    onClick={handleLogout}
                    className="nav-link btn btn-link"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link to="/" className="nav-link">Home</Link>
                </li>
                <li className="nav-item">
                  <Link to="/login" className="nav-link">Log In</Link>
                </li>
                <li className="nav-item">
                  <Link to="/signup" className="nav-link">Sign Up</Link>
                </li>
              </>
            )}
          </ul>

        </div>
      </div>
    </nav>
  );
}