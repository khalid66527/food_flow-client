"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authAPI, riderProfileAPI } from "@/lib/api";
import { RiderProfile } from "@/types/rider";

interface AuthUser {
  userId: string;
  email: string;
  role: string;
  name?: string;
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  riderProfile: RiderProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [riderProfile, setRiderProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem("rider_user");
    const savedToken = localStorage.getItem("rider_token");
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("rider_user");
        localStorage.removeItem("rider_token");
      }
    }
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await riderProfileAPI.get();
      setRiderProfile(res.data.data);
    } catch {
      setRiderProfile(null);
    }
  }, []);

  useEffect(() => {
    if (user) refreshProfile();
  }, [user, refreshProfile]);

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    const data = res.data.data;
    const userData: AuthUser = {
      userId: data.user._id || data.user.userId,
      email: data.user.email,
      role: data.user.role,
      name: data.user.name,
      token: data.token,
    };
    localStorage.setItem("rider_token", data.token);
    localStorage.setItem("rider_user", JSON.stringify(userData));
    setUser(userData);
    router.push("/rider/dashboard");
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const res = await authAPI.register({ name, email, password, phone });
    const data = res.data.data;
    const userData: AuthUser = {
      userId: data.user._id || data.user.userId,
      email: data.user.email,
      role: data.user.role,
      name: data.user.name,
      token: data.token,
    };
    localStorage.setItem("rider_token", data.token);
    localStorage.setItem("rider_user", JSON.stringify(userData));
    setUser(userData);
    router.push("/rider/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("rider_token");
    localStorage.removeItem("rider_user");
    setUser(null);
    setRiderProfile(null);
    router.push("/auth/login");
  };

  return (
    <AuthContext.Provider value={{ user, riderProfile, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
