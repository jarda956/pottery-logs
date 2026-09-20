import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../api/client";
import TwoFactorSetup from "../components/TwoFactorSetup";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const [disabling, setDisabling] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/2fa/disable", { password });
      setPassword("");
      setDisabling(false);
      await refresh();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "generic";
      setError(t(`auth.${code}`, { defaultValue: t("common.genericError") }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>{t("settings.title")}</h1>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2>{t("settings.languageTitle")}</h2>
        <LanguageSwitcher />
      </div>

      <div className="card">
        <h2>{t("twoFactor.statusTitle")}</h2>
        <p>
          <span className={`badge ${user.totpEnabled ? "badge-success" : "badge-muted"}`}>
            {user.totpEnabled ? t("twoFactor.statusEnabled") : t("twoFactor.statusDisabled")}
          </span>
        </p>

        {user.role === "ADMIN" && (
          <p className="muted">{t("twoFactor.adminCannotDisable")}</p>
        )}

        {!user.totpEnabled && (
          <TwoFactorSetup onComplete={() => refresh()} />
        )}

        {user.totpEnabled && user.role !== "ADMIN" && !disabling && (
          <button className="btn btn-secondary" onClick={() => setDisabling(true)}>
            {t("twoFactor.disableTitle")}
          </button>
        )}

        {user.totpEnabled && user.role !== "ADMIN" && disabling && (
          <form onSubmit={handleDisable}>
            <p className="muted">{t("twoFactor.disableIntro")}</p>
            <div className="field">
              <label htmlFor="disablePassword">{t("auth.passwordLabel")}</label>
              <input
                id="disablePassword"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-danger" type="submit" disabled={submitting}>
                {t("twoFactor.disableButton")}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setDisabling(false)}>
                {t("common.cancel")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
