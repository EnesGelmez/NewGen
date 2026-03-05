import { create } from "zustand";
import { useAuthStore } from "./authStore";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeaders() {
  return {
    "Content-Type": "application/json",
    ...useAuthStore.getState().authHeader(),
  };
}

/** Convert backend workflow to local store shape */
function fromBackend(wf) {
  return {
    id: wf.id,
    name: wf.name,
    description: wf.description ?? "",
    enabled: wf.status === "ACTIVE",
    trigger: wf.trigger ?? "—",
    nodeCount: wf.nodes?.length ?? 0,
    connectionCount: wf.edges?.length ?? 0,
    createdAt: wf.createdAt?.split("T")[0] ?? "",
    lastRun: wf.lastRunAt ?? null,
    // Convert backend node shape (position:{x,y}) → canvas shape (x, y)
    nodes: (wf.nodes ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      config: n.config ?? {},
      x: n.position?.x ?? n.x ?? 0,
      y: n.position?.y ?? n.y ?? 0,
    })),
    connections: (wf.edges ?? []).map((e) => ({
      id: e.id,
      fromId: e.source,
      toId: e.target,
      fromHandle: e.sourceHandle,
      toHandle: e.targetHandle,
    })),
    stats: wf.stats ?? {
      totalRuns: 0, successRuns: 0, failedRuns: 0,
      avgDurationMs: 0, lastDayRuns: 0, lastDaySuccess: 0, lastDayFailed: 0, trend: "neutral",
    },
  };
}

/** Convert local node/connection shape to backend payload */
function toBackendPayload(name, description, nodes, connections) {
  return {
    name,
    description: description ?? "",
    trigger: nodes.some((n) => n.type?.startsWith("trigger_")) ? "HTTP" : "MANUAL",
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label ?? n.type,
      position: { x: n.x ?? 0, y: n.y ?? 0 },
      config: n.config ?? {},
    })),
    edges: connections.map((c) => ({
      id: c.id,
      source: c.fromId,
      sourceHandle: c.fromHandle ?? "output",
      target: c.toId,
      targetHandle: c.toHandle ?? "input",
    })),
  };
}

export const useWorkflowStore = create((set, get) => ({
  workflows: [],
  loading: false,

  getWorkflow: (id) => get().workflows.find((w) => w.id === id) ?? null,

  /** Load all workflows from backend */
  fetchWorkflows: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_BASE}/api/v1/workflows`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      set({ workflows: (data ?? []).map(fromBackend), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  /** Create a new empty workflow in the backend, returns its id */
  createWorkflow: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/workflows`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: "Yeni Workflow",
          description: "",
          trigger: "MANUAL",
          nodes: [],
          edges: [],
        }),
      });
      if (!res.ok) return null;
      const wf = await res.json();
      const local = fromBackend(wf);
      set((state) => ({ workflows: [local, ...state.workflows] }));
      return local.id;
    } catch {
      return null;
    }
  },

  /** Save builder state to the backend */
  saveWorkflow: async (id, { name, description, nodes, connections }) => {
    const wf = get().getWorkflow(id);
    const body = toBackendPayload(name, description ?? wf?.description, nodes, connections);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workflows/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) return false;
      const updated = await res.json();
      const local = fromBackend(updated);
      set((state) => ({
        workflows: state.workflows.map((w) => (w.id === id ? local : w)),
      }));
      return true;
    } catch {
      return false;
    }
  },

  toggleEnabled: async (id) => {
    const wf = get().getWorkflow(id);
    if (!wf) return;
    const action = wf.enabled ? "disable" : "enable";
    try {
      const res = await fetch(`${API_BASE}/api/v1/workflows/${id}/${action}`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const updated = await res.json();
      const local = fromBackend(updated);
      set((state) => ({
        workflows: state.workflows.map((w) => (w.id === id ? local : w)),
      }));
    } catch { /* silent */ }
  },

  deleteWorkflow: async (id) => {
    try {
      await fetch(`${API_BASE}/api/v1/workflows/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
    } catch { /* silent */ }
    set((state) => ({ workflows: state.workflows.filter((w) => w.id !== id) }));
  },
}));

