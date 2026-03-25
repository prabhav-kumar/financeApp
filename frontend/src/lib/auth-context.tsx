"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth as authApi, setToken, clearToken, getToken, type AuthResponse } from "./api";

interface User { id: number; email: string; full_name: string; }

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, full_name: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true,
  login: async () => {}, signup: async () => {}, logout: () => {}, refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      authApi.me()
        .then((u) => setUser({ id: u.id, email: u.email, full_name: u.full_name }))
        .catch(() => clearToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res: AuthResponse = await authApi.login(email, password);
    setToken(res.access_token);
    setUser({ id: res.user.id, email: res.user.email, full_name: res.user.full_name });
  }, []);

  const signup = useCallback(async (email: string, full_name: string, password: string) => {
    const res: AuthResponse = await authApi.signup(email, full_name, password);
    setToken(res.access_token);
    setUser({ id: res.user.id, email: res.user.email, full_name: res.user.full_name });
  }, []);

  const logout = useCallback(() => { clearToken(); setUser(null); }, []);

  // Called after OAuth token is stored — loads user into context before navigation
  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const u = await authApi.me();
      setUser({ id: u.id, email: u.email, full_name: u.full_name });
    } catch {
      clearToken();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
