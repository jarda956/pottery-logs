import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { setLanguage } = useAuth();

  const current = i18n.language?.startsWith("en") ? "en" : "cs";

  return (
    <select
      aria-label={t("common.language")}
      value={current}
      onChange={(e) => setLanguage(e.target.value as "cs" | "en")}
    >
      <option value="cs">Čeština</option>
      <option value="en">English</option>
    </select>
  );
}
