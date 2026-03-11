"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { api } from "@/lib/api";
import type { AuthResponse, AuthUser } from "@/lib/auth-types";

type AuthState = {
  hasHydrated: boolean;
  user: AuthUser | null;
  clearSession: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  markHydrated: () => void;
  register: (email: string, password: string) => Promise<void>;
  syncUser: () => Promise<AuthUser>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      user: null,
      clearSession: () => {
        set({ user: null });
      },
      login: async (email, password) => {
        const response = await api.post<AuthResponse>("/auth/login", { email, password });
        set({ user: response.user });
      },
      logout: async () => {
        try {
          await api.post("/auth/logout", {});
        } catch {
          // Ignore remote logout failures and still clear the local user state.
        } finally {
          set({ user: null });
        }
      },
      markHydrated: () => set({ hasHydrated: true }),
      register: async (email, password) => {
        const response = await api.post<AuthResponse>("/auth/register", { email, password });
        set({ user: response.user });
      },
      syncUser: async () => {
        const user = await api.get<AuthUser>("/users/me");
        set({ user });
        return user;
      },
    }),
    {
      name: "taskbook-auth-v2",
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
