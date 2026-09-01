import React from "react";
import Navbar from "../../components/Navbar";
import Hero from "./Hero";
import "./Home.css";
import Portfolio from "./Portfolio"; 
import Footer from "./Footer"; 

export default function Home() {
  return (
    <div className="home-container" style={{ position: "relative", width: "100%", overflowX: "hidden" }}>
      <Navbar />
      <Hero />
      <Portfolio />
      <Footer/>
      
    </div>
  );
}