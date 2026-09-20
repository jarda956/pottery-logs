import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface SetupResponse {
  secret: string;
  qrCodeDataUrl: string;
}

type Step = "start" | "confirm" | "backupCodes";

export default function TwoFactorSetup({ onComplete }: { onComplete?: () => void }) {
  const { t } = useTranslation();
  const { refresh } = useAuth();

  const [step, setStep] = useState<Step>("start");
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [token, setToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const startSetup = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const data = await api.post<SetupResponse>("/2fa/setup");
      setSetupData(data);
      setStep("confirm");
    } catch {
      setError(t("common.genericError"));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.post<{ ok: boolean; backupCodes: string[] }>("/2fa/enable", { token });
      setBackupCodes(result.backupCodes);
      setStep("backupCodes");
      await refresh();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "generic";
      setError(t(`twoFactor.${code}`, { defaultValue: t("common.genericError") }));
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "start") {
    return (
      <div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn" onClick={startSetup} disabled={submitting}>
          {t("twoFactor.startSetup")}
        </button>
      </div>
    );
  }

  if (step === "confirm" && setupData) {
    return (
      <form onSubmit={confirmCode}>
        <p>{t("twoFactor.scanQr")}</p>
        <img
          src={setupData.qrCodeDataUrl}
          alt="QR"
          width={200}
          height={200}
          style={{ background: "white", padding: 8, borderRadius: 8 }}
        />
        <div className="field">
          <label>{t("twoFactor.manualEntryLabel")}</label>
          <code>{setupData.secret}</code>
        </div>
        <div className="field">
          <label htmlFor="confirmToken">{t("twoFactor.confirmCodeLabel")}</label>
          <input
            id="confirmToken"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn" type="submit" disabled={submitting}>
          {t("twoFactor.enableButton")}
        </button>
      </form>
    );
  }

  if (step === "backupCodes") {
    return (
      <div>
        <h3>{t("twoFactor.backupCodesTitle")}</h3>
        <p className="muted">{t("twoFactor.backupCodesIntro")}</p>
        <ul>
          {backupCodes.map((code) => (
            <li key={code}>
              <code>{code}</code>
            </li>
          ))}
        </ul>
        <p style={{ color: "var(--color-success)" }}>{t("twoFactor.setupSuccess")}</p>
        <button className="btn" onClick={() => onComplete?.()}>
          {t("twoFactor.backupCodesConfirm")}
        </button>
      </div>
    );
  }

  return null;
}
