import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "generic";
      setError(t(`auth.${code}`, { defaultValue: t("common.genericError") }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>{t("auth.registerTitle")}</h1>
        <p className="muted">{t("auth.registerSubtitle")}</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">{t("auth.emailLabel")}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">{t("auth.passwordLabel")}</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              {t("auth.passwordHint")}
            </span>
          </div>
          {error && <p className="error-text">{error}</p>}
          {success && <p style={{ color: "var(--color-success)" }}>{t("auth.registerSuccess")}</p>}
          <button className="btn" type="submit" disabled={submitting || success}>
            {t("auth.registerButton")}
          </button>
        </form>
        <p style={{ marginTop: "1rem" }}>
          <Link to="/login">{t("auth.loginLink")}</Link>
        </p>
      </div>
    </div>
  );
}
