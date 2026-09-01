import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../styles/auth.css";
import { AUTH_API_URL } from '../config/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="auth-page">
        <div className="form_container">
          <h2>Invalid Link</h2>
          <p style={{ color: "#aaa", margin: "20px 0" }}>Missing password reset token.</p>
          <Link to="/forgot-password" style={{ color: "#e67e22" }}>Request a new reset link</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 8) {
      return toast.error("Password must be at least 8 characters long.", { position: "bottom-left" });
    }

    if (password !== confirmPassword) {
      return toast.error("Passwords do not match.", { position: "bottom-left" });
    }

    setLoading(true);
    try {
      const { data } = await axios.post(
        `${AUTH_API_URL}/reset-password/${token}`,
        { password }
      );

      if (data.success) {
        toast.success(data.message, { position: "bottom-left" });
        setTimeout(() => navigate("/login"), 1800);
      } else {
        toast.error(data.message || "Failed to reset password", { position: "bottom-left" });
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Server error. Try again.";
      toast.error(msg, { position: "bottom-left" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="form_container">
        <h2>Set New Password</h2>
        <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "20px" }}>
          Please choose a strong password with at least 8 characters.
        </p>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter new password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Updating password..." : "Reset Password"}
          </button>
        </form>

        <span style={{ display: "block", marginTop: "16px", fontSize: "14px", color: "#ccc" }}>
          Back to <Link to="/login" style={{ color: "#e67e22" }}>Login</Link>
        </span>

        <ToastContainer />
      </div>
    </div>
  );
};

export default ResetPassword;

