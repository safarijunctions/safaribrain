import { createContext, useContext, useState, ReactNode } from "react";
import { api, getToken, setToken } from "./api";

interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  permissions: string[];
  organizationId: string;
  organizationName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_KEY = "safaribrain.user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string; user: AuthUser }>("/auth/login", { email, password });
      setToken(res.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  function hasPermission(permission: string) {
    return Boolean(user?.permissions.includes(permission));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function isAuthenticated() {
  return Boolean(getToken());
}
