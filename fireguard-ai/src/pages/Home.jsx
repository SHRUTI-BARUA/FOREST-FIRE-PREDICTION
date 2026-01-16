/*
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FeatureCard from '../components/FeatureCard';
import '../styles/Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);

  const handleStartAnalysis = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    
    if (!isLoggedIn) {
      setShowWarning(true);
    } else {
      navigate('/input');
    }
  };

  const features = [
    { title: "Location Analysis", desc: "Instant coordinate tracking.", img: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=80&w=400", grad: "linear-gradient(to br, #22c55e, #059669)" },
    { title: "AI Predictions", desc: "Neural network data processing.", img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=400", grad: "linear-gradient(to br, #f97316, #dc2626)" },
    { title: "Real-Time Stats", desc: "Live telemetry heat maps.", img: "https://media.istockphoto.com/id/2207584622/photo/automated-reporting-and-business-intelligence-data-automation-and-dashboards-businessman.jpg?s=612x612&w=0&k=20&c=5zbQe2v3-yDQc9Ual_Y583USJbGlNcfHz0iuKIs-dYE=", grad: "linear-gradient(to br, #eab308, #f97316)" },
    { title: "Community Safety", desc: "Risk alerts for local groups.", img: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=400", grad: "linear-gradient(to br, #ef4444, #db2777)" }
  ];

  return (
    <div className="home-container">
      <Navbar />
      
      <section className="hero-full-viewport">
        <div className="hero-bg-wrapper">
          <img src="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=2000" className="hero-img-animated" alt="Forest" />
          <div className="hero-overlay-dark"></div>
        </div>

        <div className="hero-content-layer">
          <div className="ai-badge-floating">✨ AI-Powered Forest Guard</div>
          <h1 className="hero-display-title">
            <span className="text-white">Protect Our</span><br />
            <span className="text-fire-glow">Forests</span><br />
            <span className="text-emerald-glow">From Wildfires</span>
          </h1>

         
          {showWarning && (
            <div className="login-warning-msg" style={{ 
              background: 'rgba(255, 71, 71, 0.25)', 
              border: '1px solid #ff4747', 
              color: '#ffdada', 
              padding: '12px 25px', 
              borderRadius: '12px', 
              marginTop: '25px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              position: 'relative'
            }}>
              <span>
                ⚠️ Please <strong onClick={() => navigate('/login')} style={{cursor:'pointer', textDecoration:'underline', color: '#fff'}}>Login</strong> or <strong onClick={() => navigate('/signup')} style={{cursor:'pointer', textDecoration:'underline', color: '#fff'}}>Sign Up</strong> to access the Analysis tool!
              </span>
              <button 
                onClick={() => setShowWarning(false)} 
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff4747',
                  fontSize: '20px',
                  cursor: 'pointer',
                  fontWeight: '900',
                  padding: '0 5px'
                }}
              >
                ×
              </button>
            </div>
          )}
          
          <button className="btn-fire-pulse" onClick={handleStartAnalysis}>
            🔥 Check Fire Risk Now
          </button>
        </div>

        <div className="bottom-curve-divider"></div>
      </section>

      <section className="features-compact-section" id="features">
        <div className="features-max-width">
          <h2 className="section-title-center">Intelligent <span className="text-orange">Insights</span></h2>
          <div className="features-4-grid">
            {features.map((f, i) => (
              <FeatureCard key={i} title={f.title} description={f.desc} img={f.img} gradient={f.grad} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}*/
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import FeatureCard from '../components/FeatureCard';
import '../styles/Home.css';

export default function Home() {
  const navigate = useNavigate();
  
  // State to store logged-in user
  const [user, setUser] = useState(null);
  const [showWarning, setShowWarning] = useState(false);

  // Check if user is logged in on page load
  useEffect(() => {
    // Example: check localStorage for logged-in user
    // Replace this with your backend /verify call if needed
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Handle Start Analysis button
  const handleStartAnalysis = () => {
    if (!user) {
      setShowWarning(true);  // show login/signup prompt
    } else {
      navigate('/input');    // navigate to InputPage if logged in
    }
  };

  const features = [
    { title: "Location Analysis", desc: "Instant coordinate tracking.", img: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=80&w=400", grad: "linear-gradient(to br, #22c55e, #059669)" },
    { title: "AI Predictions", desc: "Neural network data processing.", img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=400", grad: "linear-gradient(to br, #f97316, #dc2626)" },
    { title: "Real-Time Stats", desc: "Live telemetry heat maps.", img: "https://media.istockphoto.com/id/2207584622/photo/automated-reporting-and-business-intelligence-data-automation-and-dashboards-businessman.jpg?s=612x612&w=0&k=20&c=5zbQe2v3-yDQc9Ual_Y583USJbGlNcfHz0iuKIs-dYE=", grad: "linear-gradient(to br, #eab308, #f97316)" },
    { title: "Community Safety", desc: "Risk alerts for local groups.", img: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=400", grad: "linear-gradient(to br, #ef4444, #db2777)" }
  ];

  return (
    <div className="home-container">
      <Navbar />
      
      <section className="hero-full-viewport">
        <div className="hero-bg-wrapper">
          <img src="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=2000" className="hero-img-animated" alt="Forest" />
          <div className="hero-overlay-dark"></div>
        </div>

        <div className="hero-content-layer">
          <div className="ai-badge-floating">✨ AI-Powered Forest Guard</div>
          <h1 className="hero-display-title">
            <span className="text-white">Protect Our</span><br />
            <span className="text-fire-glow">Forests</span><br />
            <span className="text-emerald-glow">From Wildfires</span>
          </h1>

          {/* DISMISSIBLE WARNING MESSAGE */}
          {showWarning && (
            <div className="login-warning-msg" style={{ 
              background: 'rgba(255, 71, 71, 0.25)', 
              border: '1px solid #ff4747', 
              color: '#ffdada', 
              padding: '12px 25px', 
              borderRadius: '12px', 
              marginTop: '25px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              position: 'relative'
            }}>
              <span>
                ⚠️ Please <strong onClick={() => navigate('/login')} style={{cursor:'pointer', textDecoration:'underline', color: '#fff'}}>Login</strong> or <strong onClick={() => navigate('/signup')} style={{cursor:'pointer', textDecoration:'underline', color: '#fff'}}>Sign Up</strong> to access the Analysis tool!
              </span>
              <button 
                onClick={() => setShowWarning(false)} 
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff4747',
                  fontSize: '20px',
                  cursor: 'pointer',
                  fontWeight: '900',
                  padding: '0 5px'
                }}
              >
                ×
              </button>
            </div>
          )}
          
          <button className="btn-fire-pulse" onClick={handleStartAnalysis}>
            🔥 Check Fire Risk Now
          </button>
        </div>

        <div className="bottom-curve-divider"></div>
      </section>

      <section className="features-compact-section" id="features">
        <div className="features-max-width">
          <h2 className="section-title-center">Intelligent <span className="text-orange">Insights</span></h2>
          <div className="features-4-grid">
            {features.map((f, i) => (
              <FeatureCard key={i} title={f.title} description={f.desc} img={f.img} gradient={f.grad} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}