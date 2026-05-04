"use client";

import { create } from "zustand";

import type {
  AuthSession,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "@/lib/account-types";
import { authService } from "@/services/auth-service";

type AuthState = {
  currentUser: AuthUser | null;
  currentSession: AuthSession | null;
  isHydrated: boolean;
  isLoading: boolean;
  initialize: () => void;
  refresh: () => void;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  currentSession: null,
  isHydrated: false,
  isLoading: false,
  initialize: () => {
    const { currentSession, currentUser } = authService.getAuthSnapshot();
    set({ currentUser, currentSession, isHydrated: true });
  },
  refresh: () => {
    const { currentSession, currentUser } = authService.getAuthSnapshot();
    set({ currentUser, currentSession, isHydrated: true });
  },
  login: async (payload) => {
    set({ isLoading: true });

    try {
      const { user, session } = authService.login(payload);
      set({ currentUser: user, currentSession: session, isHydrated: true, isLoading: false });
      return user;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  register: async (payload) => {
    set({ isLoading: true });

    try {
      const { user, session } = authService.register(payload);
      set({ currentUser: user, currentSession: session, isHydrated: true, isLoading: false });
      return user;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  logout: async () => {
    set({ isLoading: true });
    authService.logout();
    set({ currentUser: null, currentSession: null, isHydrated: true, isLoading: false });
  },
}));
