import { create } from "zustand";
import { persist } from "zustand/middleware";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      mustChangePassword: false,
      isLoading: false,
      isInitializing: true,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (!res.ok) {
            set({ isLoading: false, error: data.error ?? "Giriş başarısız." });
            return false;
          }
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            mustChangePassword: data.user?.mustChangePassword ?? false,
            isLoading: false,
            error: null,
          });
          return true;
        } catch {
          set({ isLoading: false, error: "Sunucuya bağlanılamadı." });
          return false;
        }
      },

      refreshUser: async (token) => {
        try {
          // Re-fetch user details after password change
          const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            set((s) => ({
              user: { ...s.user, mustChangePassword: false },
              mustChangePassword: false,
            }));
          }
        } catch { /* ignore */ }
      },

      /** Called once on app startup to validate the stored token */
      initAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isInitializing: false });
          return;
        }
        try {
          const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            // Token expired or invalid — clear everything
            set({ user: null, token: null, isAuthenticated: false, mustChangePassword: false, error: null });
          }
        } catch {
          // Network error — keep state, user will see an error on API calls
        } finally {
          set({ isInitializing: false });
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, mustChangePassword: false, error: null });
      },

      clearError: () => set({ error: null }),

      isSuperAdmin: () => get().user?.role === "SUPER_ADMIN",
      isTenantAdmin: () => get().user?.role === "TENANT_ADMIN",
      isTenantUser: () =>
        get().user?.role === "TENANT_ADMIN" ||
        get().user?.role === "VIEWER",

      /** Returns the Authorization header value for API calls */
      authHeader: () => {
        const token = get().token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
    {
      name: "nexus-auth-v2",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        mustChangePassword: state.mustChangePassword,
      }),
    }
  )
);
