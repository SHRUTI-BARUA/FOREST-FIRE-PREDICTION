import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../styles/auth.css";
import { AUTH_API_URL } from '../config/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return toast.error("Please enter a valid email address.", { position: "bottom-left" });
    }

    setLoading(true);
    try {
      const { data } = await axios.post(
        `${AUTH_API_URL}/forgot-password`,
        { email: cleanEmail }
      );

      if (data.success) {
        toast.success(data.message, { position: "bottom-left" });
        setEmail("");
      } else {
        toast.error(data.message || "Failed to process request", { position: "bottom-left" });
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Server error. Please try again later.";
      toast.error(msg, { position: "bottom-left" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="form_container">
        <h2>Forgot Password</h2>
        <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "20px" }}>
          Enter your registered email and we will send you a password reset link.
        </p>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Registered Email</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Sending link..." : "Send Reset Link"}
          </button>
        </form>

        <span style={{ display: "block", marginTop: "16px", fontSize: "14px", color: "#ccc" }}>
          Remembered your password? <Link to="/login" style={{ color: "#e67e22" }}>Login here</Link>
        </span>

        <ToastContainer />
      </div>
    </div>
  );
};

export default ForgotPassword;

