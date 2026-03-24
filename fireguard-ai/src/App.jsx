import React from 'react';
import Home from './pages/Home/Home';
import InputPage from './pages/InputPage';
import ResultsPage from './pages/ResultsPage';
import './styles/Global.css';
import {Analytics, Login, Signup } from "./pages";
import FirePrediction from "./pages/InputPage";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from "./pages/VerifyEmail";
import Helpline from './pages/helpline';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/input" element={<InputPage />} />
        <Route path="/results" element={<ResultsPage />} />        
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/fire" element={<FirePrediction />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/helpline" element={<Helpline />} />
        <Route path="/analytics" element={<Analytics />} />  
      </Routes>
    </Router>
  );
}

export default App;