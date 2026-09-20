import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export default function TwoFactorVerifyPage() {
  const { t } = useTranslation();
  const { verifyTwoFactor } = useAuth();
  const navigate = useNavigate();

  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyTwoFactor(token);
      navigate("/");
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "generic";
      setError(t(`twoFactor.${code}`, { defaultValue: t("common.genericError") }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>{t("twoFactor.verifyTitle")}</h1>
        <p className="muted">{t("twoFactor.verifySubtitle")}</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="token">{t("twoFactor.codeLabel")}</label>
            <input
              id="token"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={submitting}>
            {t("twoFactor.verifyButton")}
          </button>
        </form>
        <p style={{ marginTop: "1rem" }}>
          <Link to="/login">{t("twoFactor.backToLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
