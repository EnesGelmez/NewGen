import { create } from "zustand";
import { useAuthStore } from "./authStore";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const useTenantAgentStore = create((set) => ({
  agent: null,       // current TenantAgent or null
  loading: false,
  error: null,

  fetchAgent: async (tenantId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/api/v1/tenants/${tenantId}/agent`, {
        headers: useAuthStore.getState().authHeader(),
      });
      if (res.status === 404) {
        set({ agent: null, loading: false });
        return null;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      set({ agent: data, loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  saveAgent: async (tenantId, body) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/api/v1/tenants/${tenantId}/agent`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...useAuthStore.getState().authHeader() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      set({ agent: data, loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  deleteAgent: async (tenantId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/api/v1/tenants/${tenantId}/agent`, {
        method: "DELETE",
        headers: useAuthStore.getState().authHeader(),
      });
      if (!res.ok && res.status !== 404) throw new Error(await res.text());
      set({ agent: null, loading: false });
      return true;
    } catch (err) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  generateSecret: async (tenantId) => {
    try {
      const res = await fetch(`${API}/api/v1/tenants/${tenantId}/agent/generate-secret`, {
        method: "POST",
        headers: useAuthStore.getState().authHeader(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return data.secretKey;
    } catch {
      return null;
    }
  },
}));
