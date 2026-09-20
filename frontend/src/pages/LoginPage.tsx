import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(username, password);
      if (result.requiresTwoFactor) {
        navigate("/2fa-verify");
      } else {
        navigate("/");
      }
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
        <h1>{t("auth.loginTitle")}</h1>
        <p className="muted">{t("auth.loginSubtitle")}</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">{t("auth.usernameLabel")}</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">{t("auth.passwordLabel")}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={submitting}>
            {t("auth.loginButton")}
          </button>
        </form>
        <p style={{ marginTop: "1rem" }}>
          <Link to="/register">{t("auth.registerLink")}</Link>
        </p>
      </div>
    </div>
  );
}
