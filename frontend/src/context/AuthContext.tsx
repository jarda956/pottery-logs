import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import i18n from "../i18n";
import { api, ApiError } from "../api/client";

export interface CurrentUser {
  id: string;
  username: string;
  role: "ADMIN" | "USER";
  language: "cs" | "en";
  totpEnabled: boolean;
  mustSetupTwoFactor: boolean;
  createdAt: string;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ requiresTwoFactor: boolean }>;
  verifyTwoFactor: (token: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setLanguage: (language: "cs" | "en") => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((next: CurrentUser | null) => {
    setUser(next);
    if (next) {
      i18n.changeLanguage(next.language);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<CurrentUser>("/me");
      applyUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        applyUser(null);
      } else {
        applyUser(null);
      }
    }
  }, [applyUser]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await api.post<{ requiresTwoFactor: boolean }>("/auth/login", {
      username,
      password,
    });
    if (!result.requiresTwoFactor) {
      await refresh();
    }
    return result;
  }, [refresh]);

  const verifyTwoFactor = useCallback(async (token: string) => {
    await api.post("/2fa/verify-login", { token });
    await refresh();
  }, [refresh]);

  const register = useCallback(async (username: string, password: string) => {
    await api.post("/auth/register", { username, password, language: i18n.language === "en" ? "en" : "cs" });
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    applyUser(null);
  }, [applyUser]);

  const setLanguage = useCallback(async (language: "cs" | "en") => {
    i18n.changeLanguage(language);
    if (user) {
      const updated = await api.patch<CurrentUser>("/me/language", { language });
      applyUser(updated);
    }
  }, [user, applyUser]);

  const value = useMemo(
    () => ({ user, loading, login, verifyTwoFactor, register, logout, refresh, setLanguage }),
    [user, loading, login, verifyTwoFactor, register, logout, refresh, setLanguage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
