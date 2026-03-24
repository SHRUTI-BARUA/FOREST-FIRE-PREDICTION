import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Label
} from "recharts";
import Papa from "papaparse";
import "../styles/Analytics.css";

const Analytics = () => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [temperatureData, setTemperatureData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);
  const [rainData, setRainData] = useState([]);
  const [windData, setWindData] = useState([]);
  const [ndviData, setNdviData] = useState([]);

  useEffect(() => {
    fetch("/data/Cleaned_Forest_Fire_Dataset.csv")
      .then((response) => response.text())
      .then((csvText) => {
        const parsed = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        const data = parsed.data.filter((row) => Number(row.label) === 1);
        processData(data);
      })
      .catch((error) => console.error("Error loading CSV:", error));
  }, []);

  const processData = (data) => {
    const monthMap = {}; const tempMap = {}; const rhMap = {}; 
    const rainMap = {}; const windMap = {}; const ndviMap = {};
    const monthNames = { 1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun", 7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec" };

    data.forEach((row) => {
      const month = Number(row.Month);
      if (month) monthMap[month] = (monthMap[month] || 0) + 1;
      const temp = Math.round(Number(row.temp_c));
      if (temp) tempMap[temp] = (tempMap[temp] || 0) + 1;
      const wind = (Math.round(Number(row.wind_ms) * 2) / 2).toFixed(1);
      if (row.wind_ms !== undefined) windMap[wind] = (windMap[wind] || 0) + 1;
      const rh = Math.floor(Number(row.rh) / 10) * 10;
      if (row.rh !== undefined) rhMap[rh] = (rhMap[rh] || 0) + 1;
      const ndvi = (Math.floor(Number(row.NDVI) * 10) / 10).toFixed(1);
      if (row.NDVI !== undefined) ndviMap[ndvi] = (ndviMap[ndvi] || 0) + 1;
      const rain = Number(row.rain_mm) === 0 ? "No Rain" : "Trace Rain";
      rainMap[rain] = (rainMap[rain] || 0) + 1;
    });

    setMonthlyData(Object.keys(monthMap).sort((a,b)=>a-b).map(m => ({ month: monthNames[m], fires: monthMap[m] })));
    setTemperatureData(Object.keys(tempMap).sort((a,b)=>a-b).map(t => ({ temperature: t + "°C", count: tempMap[t] })));
    setWindData(Object.keys(windMap).sort((a,b)=>a-b).map(w => ({ wind: w + " m/s", count: windMap[w] })));
    setHumidityData(Object.keys(rhMap).sort((a,b)=>a-b).map(r => ({ rh: r + "%", count: rhMap[r] })));
    setNdviData(Object.keys(ndviMap).sort((a,b)=>a-b).map(n => ({ ndvi: n, count: ndviMap[n] })));
    setRainData(Object.keys(rainMap).map(r => ({ condition: r, count: rainMap[r] })));
  };

  return (
    <div className="analytics-page-root">
      <Navbar />
      
      <div className="analytics-hero-section">
        <div className="hero-overlay">
          <div className="gov-tag">GOVERNMENT OF ODISHA | FOREST DEPT</div>
          <h1 className="hero-title">Historical Forest Fire Analytics</h1>
          <p className="hero-subtitle">Visualizing environmental factors and seasonal trends.</p>
        </div>
      </div>

      <div className="analytics-container">
        <div className="insight-stats-grid">
            <div className="stat-card">
                <span className="stat-icon">📑</span>
                <div className="stat-info">
                    <span className="stat-label">Data Source</span>
                    <span className="stat-value">Sensor Data Logs</span>
                </div>
            </div>
            <div className="stat-card">
                <span className="stat-icon">🗺️</span>
                <div className="stat-info">
                    <span className="stat-label">Analysis Region</span>
                    <span className="stat-value">Odisha Region</span>
                </div>
            </div>
            <div className="stat-card">
                <span className="stat-icon">📉</span>
                <div className="stat-info">
                    <span className="stat-label">High Risk Months</span>
                    <span className="stat-value">March - May</span>
                </div>
            </div>
        </div>

        <section className="master-chart-wrapper">
          <div className="chart-card-box full-width">
            <div className="chart-title-header">
              <h3>Monthly Incident Occurrence</h3>
              <div className="title-underline"></div>
            </div>
            <ResponsiveContainer width="100%" height={380}>
              <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 30, bottom: 30 }}>
                <defs>
                  <linearGradient id="colorFires" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month"><Label value="Months" offset={-20} position="insideBottom" fill="#64748b" style={{fontWeight: '700'}} /></XAxis>
                <YAxis><Label value="Fire Count" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#64748b', fontWeight: '700' }} /></YAxis>
                <Tooltip />
                <Area type="monotone" dataKey="fires" stroke="#ef4444" strokeWidth={4} fill="url(#colorFires)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="features-chart-grid">
          {/* NDVI BAR CHART */}
          <div className="chart-card-box">
            <div className="chart-title-header"><h3>Vegetation Health (NDVI)</h3><div className="title-underline"></div></div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ndviData} margin={{ bottom: 25, left: 10 }}>
                <XAxis dataKey="ndvi"><Label value="NDVI Index" offset={-15} position="insideBottom" style={{fontSize: '11px'}} /></XAxis>
                <YAxis><Label value="Frequency" angle={-90} position="insideLeft" style={{fontSize: '11px'}} /></YAxis>
                <Tooltip /><Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* UPDATED: TEMPERATURE AS BAR CHART */}
          <div className="chart-card-box">
            <div className="chart-title-header"><h3>Ambient Temperature</h3><div className="title-underline"></div></div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={temperatureData} margin={{ bottom: 25, left: 10 }}>
                <XAxis dataKey="temperature"><Label value="Temp °C" offset={-15} position="insideBottom" style={{fontSize: '11px'}} /></XAxis>
                <YAxis><Label value="Incidents" angle={-90} position="insideLeft" style={{fontSize: '11px'}} /></YAxis>
                <Tooltip />
                <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* WIND SPEED BAR CHART */}
          <div className="chart-card-box">
            <div className="chart-title-header"><h3>Wind Speed Analysis</h3><div className="title-underline"></div></div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={windData} margin={{ bottom: 25, left: 10 }}>
                <XAxis dataKey="wind"><Label value="Speed (m/s)" offset={-15} position="insideBottom" style={{fontSize: '11px'}} /></XAxis>
                <YAxis><Label value="Events" angle={-90} position="insideLeft" style={{fontSize: '11px'}} /></YAxis>
                <Tooltip /><Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* HUMIDITY BAR CHART */}
          <div className="chart-card-box">
            <div className="chart-title-header"><h3>Relative Humidity</h3><div className="title-underline"></div></div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={humidityData} margin={{ bottom: 25, left: 10 }}>
                <XAxis dataKey="rh"><Label value="RH %" offset={-15} position="insideBottom" style={{fontSize: '11px'}} /></XAxis>
                <YAxis><Label value="Fire Count" angle={-90} position="insideLeft" style={{fontSize: '11px'}} /></YAxis>
                <Tooltip /><Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* RAINFALL BAR CHART */}
          <div className="chart-card-box">
            <div className="chart-title-header"><h3>Rainfall Correlation</h3><div className="title-underline"></div></div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={rainData} margin={{ bottom: 25, left: 10 }}>
                <XAxis dataKey="condition"><Label value="Condition" offset={-15} position="insideBottom" style={{fontSize: '11px'}} /></XAxis>
                <YAxis><Label value="Frequency" angle={-90} position="insideLeft" style={{fontSize: '11px'}} /></YAxis>
                <Tooltip /><Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;