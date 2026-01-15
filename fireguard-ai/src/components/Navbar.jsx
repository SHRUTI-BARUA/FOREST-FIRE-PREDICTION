import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('user'); // Clear user from localStorage
    setUser(null);                    // Update state
    navigate('/');               // Redirect to login page
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/" className="brand-name">🔥ForestGuard</Link>
      </div>

      <div className="navbar-actions">
        {user ? (
          <>
            <span className="nav-username">Hello, {user.username}</span>
            <button onClick={handleLogout} className="nav-btn-logout">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-btn-login">Log In</Link>
            <Link to="/signup" className="nav-btn-signup">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
