import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { AuthApi } from "../api/resources";
import { getToken, setToken as persistToken } from "../api/client";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  bootstrapAdmin: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    AuthApi.me()
      .then((res) => setUser(res.data))
      .catch(() => persistToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await AuthApi.login(email, password);
    persistToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const bootstrapAdmin = useCallback(async (name: string, email: string, password: string) => {
    const res = await AuthApi.bootstrapAdmin(name, email, password);
    persistToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(() => {
    persistToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, bootstrapAdmin, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
