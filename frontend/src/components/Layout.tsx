import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <header className="app-header">
        <strong>{t("common.appName")}</strong>
        <nav className="app-nav">
          <NavLink to="/firing-curves">{t("nav.firingCurves")}</NavLink>
          <NavLink to="/glaze-combinations">{t("nav.glazeCombinations")}</NavLink>
          <NavLink to="/settings">{t("nav.settings")}</NavLink>
          {user?.role === "ADMIN" && <NavLink to="/admin/users">{t("nav.adminUsers")}</NavLink>}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <LanguageSwitcher />
          <span className="muted">{user?.email}</span>
          <button className="btn btn-secondary" onClick={handleLogout}>
            {t("common.logout")}
          </button>
        </div>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </>
  );
}
