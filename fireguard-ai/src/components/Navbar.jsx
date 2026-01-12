import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        {/* The FireWatch text is now styled via the brand-name class */}
        <Link to="/" className="brand-name">🔥ForestGuard</Link>
      </div>
      
      <div className="navbar-actions">
        <Link to="/login" className="nav-btn-login">Log In</Link>
        <Link to="/signup" className="nav-btn-signup">Sign Up</Link>
      </div>
    </nav>
  );
}