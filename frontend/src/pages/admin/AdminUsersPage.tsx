import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

interface AdminUser {
  id: string;
  username: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  totpEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<AdminUser[]>("/admin/users");
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/admin/users", { username, password, role });
      setUsername("");
      setPassword("");
      setRole("USER");
      setShowForm(false);
      await load();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "generic";
      setError(
        t(`admin.${code}`, {
          defaultValue: t(`auth.${code}`, { defaultValue: t("common.genericError") }),
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (u: AdminUser) => {
    const action = u.isActive ? "deactivate" : "activate";
    const updated = await api.patch<AdminUser>(`/admin/users/${u.id}/${action}`);
    setUsers((list) => list.map((x) => (x.id === updated.id ? updated : x)));
  };

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(t("admin.confirmDeleteUser"))) return;
    await api.delete(`/admin/users/${u.id}`);
    await load();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1>{t("admin.title")}</h1>
          <p className="muted">{t("admin.subtitle")}</p>
        </div>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {t("admin.createUser")}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <form onSubmit={handleCreate}>
            <div className="field">
              <label>{t("admin.username")}</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="field">
              <label>{t("auth.passwordLabel")}</label>
              <input
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t("admin.role")}</label>
              <select value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "USER")}>
                <option value="USER">{t("admin.roleUser")}</option>
                <option value="ADMIN">{t("admin.roleAdmin")}</option>
              </select>
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn" type="submit" disabled={submitting}>
              {t("admin.createUser")}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>{t("admin.username")}</th>
                <th>{t("admin.role")}</th>
                <th>{t("admin.status")}</th>
                <th>{t("admin.twoFactor")}</th>
                <th>{t("admin.lastLogin")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.role === "ADMIN" ? t("admin.roleAdmin") : t("admin.roleUser")}</td>
                  <td>
                    <span className={`badge ${u.isActive ? "badge-success" : "badge-muted"}`}>
                      {u.isActive ? t("admin.active") : t("admin.inactive")}
                    </span>
                  </td>
                  <td>{u.totpEnabled ? t("twoFactor.statusEnabled") : t("twoFactor.statusDisabled")}</td>
                  <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : t("admin.never")}</td>
                  <td style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => toggleActive(u)}
                      disabled={u.id === currentUser?.id}
                    >
                      {u.isActive ? t("admin.deactivate") : t("admin.activate")}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(u)}
                      disabled={u.id === currentUser?.id}
                    >
                      {t("admin.deleteUser")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
