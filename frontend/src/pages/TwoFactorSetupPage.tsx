import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import TwoFactorSetup from "../components/TwoFactorSetup";

export default function TwoFactorSetupPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user && !user.mustSetupTwoFactor) {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>{t("twoFactor.setupTitle")}</h1>
        <p className="muted">{t("twoFactor.setupIntroAdmin")}</p>
        <TwoFactorSetup onComplete={() => navigate("/", { replace: true })} />
      </div>
    </div>
  );
}
