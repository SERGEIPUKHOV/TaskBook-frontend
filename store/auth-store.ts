"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { api } from "@/lib/api";
import type { AuthResponse, AuthUser } from "@/lib/auth-types";
import { setViewAsOwnerId } from "@/lib/view-as";
import { useAppStore } from "@/store/app-store";

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
        setViewAsOwnerId(null);
        useAppStore.getState().resetSupervisionState();
        set({ user: null });
      },
      login: async (email, password) => {
        const response = await api.post<AuthResponse>("/auth/login", { email, password });
        setViewAsOwnerId(null);
        useAppStore.getState().resetSupervisionState();
        set({ user: response.user });
      },
      logout: async () => {
        try {
          await api.post("/auth/logout", {});
        } catch {
          // Ignore remote logout failures and still clear the local user state.
        } finally {
          setViewAsOwnerId(null);
          useAppStore.getState().resetSupervisionState();
          set({ user: null });
        }
      },
      markHydrated: () => set({ hasHydrated: true }),
      register: async (email, password) => {
        const response = await api.post<AuthResponse>("/auth/register", { email, password });
        setViewAsOwnerId(null);
        useAppStore.getState().resetSupervisionState();
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
