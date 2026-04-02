import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppContext";

export function LoginPage() {
  const { signIn, setLoginForm, loginForm, message } = useAppState();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await signIn(e);
    setSubmitting(false);
    navigate("/app");
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2 className="login-title">Owner Login</h2>
        <p className="login-subtitle">Sign in to manage your assets and bookings</p>
        {message && (
          <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16 }}>{message}</p>
        )}
        <form onSubmit={handleSubmit}>
          <div className="contact-field">
            <label className="input-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="input"
              type="email"
              required
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            />
          </div>
          <div className="contact-field">
            <label className="input-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="input"
              type="password"
              required
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            />
          </div>
          <button className="btn-brand-lg" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
