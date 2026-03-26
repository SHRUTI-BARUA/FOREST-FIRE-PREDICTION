import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <h2 className="footer-logo">ForestGuard</h2>
            <p className="footer-tagline">
              Leading the way in AI-driven wildfire intelligence and 
              ecosystem protection.
            </p>
          </div>
          
          <div className="footer-links">
            <div className="link-group">
              <h4>Platform</h4>
              <a href="#hero">Home</a>
              <a href="#analytics">Analytics</a>
              <a href="#helpline">Helpline</a>
            </div>
            <div className="link-group">
              <h4>Products</h4>
              <a href="#">Wildfire Solution</a>
              <a href="#">Fire Spread</a>
              <a href="#">Burnt Area</a>
            </div>
            <div className="link-group">
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#">Contact</a>
              <a href="#">Privacy Policy</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 ForestGuard AI. All rights reserved.</p>
          <div className="social-links">
            <a href="#">LinkedIn</a>
            <a href="#">Twitter</a>
            <a href="#">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;