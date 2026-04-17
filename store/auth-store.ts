"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { api } from "@/lib/api";
import type { ApiAuthUser, AuthResponse, AuthUser } from "@/lib/auth-types";
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

function normalizeAuthUser(user: ApiAuthUser | AuthUser): AuthUser {
  return {
    ...user,
    tasktrackerEnabled: Boolean(
      "tasktrackerEnabled" in user ? user.tasktrackerEnabled : user.tasktracker_enabled,
    ),
  };
}

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
        set({ user: normalizeAuthUser(response.user) });
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
        set({ user: normalizeAuthUser(response.user) });
      },
      syncUser: async () => {
        const user = normalizeAuthUser(await api.get<ApiAuthUser>("/users/me"));
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
