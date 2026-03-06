import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkflowStore } from "../../store/workflowStore";
import { useAuthStore } from "../../store/authStore";
import {
  GitBranch, Plus, Play, Pause, Trash2, BarChart3,
  CheckCircle2, XCircle, Clock, Activity, TrendingUp,
  TrendingDown, Zap, AlertTriangle, ChevronRight, Settings,
  RefreshCw, Eye,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";


/* ─── helpers ─── */
function successRate(stats) {
  if (!stats.totalRuns) return 0;
  return Math.round((stats.successRuns / stats.totalRuns) * 100);
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatNum(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/* ─── Summary stat card ─── */
function SummaryCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    blue:    "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber:   "bg-amber-50 text-amber-600",
    rose:    "bg-rose-50 text-rose-600",
  };
  return (
    <div className="rounded-xl border border-border bg-white p-4 flex items-start gap-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${colors[color]}`}>
        <Icon size={17} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Mini bar (success vs fail visual) ─── */
function SuccessBar({ rate }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${rate >= 95 ? "bg-emerald-400" : rate >= 80 ? "bg-amber-400" : "bg-rose-400"}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className={`text-[11px] font-semibold w-9 text-right ${rate >= 95 ? "text-emerald-600" : rate >= 80 ? "text-amber-600" : "text-rose-600"}`}>
        {rate}%
      </span>
    </div>
  );
}

/* ─── Delete confirmation modal ─── */
function DeleteModal({ workflow, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
        <div className="p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 mb-4">
            <Trash2 size={20} className="text-rose-500" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Workflow Silinsin mi?</h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            <strong className="text-foreground">{workflow.name}</strong> kalıcı olarak silinecek.
            Bu işlem geri alınamaz.
          </p>
        </div>
        <div className="flex gap-2 px-6 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-600 transition-colors"
          >
            Evet, Sil
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Stats Detail Modal ─── */
function StatsModal({ workflowId, workflowBase, onClose }) {
  const { authHeader } = useAuthStore();
  const [wf, setWf] = useState(workflowBase);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/workflows/${workflowId}`, {
          headers: { ...authHeader() },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setWf({
            ...workflowBase,
            lastRun: data.lastRunAt ?? null,
            stats: data.stats ?? workflowBase.stats,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [workflowId]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = wf.stats;
  const rate = successRate(s);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 size={15} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{wf.name}</h3>
              <p className="text-xs text-muted-foreground">İstatistikler</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <XCircle size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <RefreshCw size={16} className="animate-spin mr-2" /> Yükleniyor…
          </div>
        ) : (
        <div className="p-5 space-y-4">
          {/* Genel istatistikler */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Toplam Çalışma", value: s.totalRuns.toLocaleString("tr-TR"), icon: Activity, color: "text-blue-600 bg-blue-50" },
              { label: "Başarılı", value: s.successRuns.toLocaleString("tr-TR"), icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
              { label: "Başarısız", value: s.failedRuns.toLocaleString("tr-TR"), icon: XCircle, color: "text-rose-600 bg-rose-50" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border p-3 text-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg mx-auto mb-2 ${item.color}`}>
                  <item.icon size={14} />
                </div>
                <p className="text-lg font-bold text-foreground">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Başarı oranı */}
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground">Başarı Oranı</p>
              <span className={`text-xs font-bold ${rate >= 95 ? "text-emerald-600" : rate >= 80 ? "text-amber-600" : "text-rose-600"}`}>
                {rate}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${rate >= 95 ? "bg-emerald-400" : rate >= 80 ? "bg-amber-400" : "bg-rose-400"}`}
                style={{ width: `${rate}%` }}
              />
            </div>
          </div>

          {/* Ort. süre + Son 24 saat */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={12} className="text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Ort. Süre</p>
              </div>
              <p className="text-lg font-bold text-foreground">{s.avgDurationMs} <span className="text-xs font-normal text-muted-foreground">ms</span></p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Activity size={12} className="text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Son 24 Saat</p>
              </div>
              <p className="text-lg font-bold text-foreground">{s.lastDayRuns}
                <span className="text-xs font-normal text-muted-foreground ml-1">çalışma</span>
              </p>
              {s.lastDayFailed > 0 && (
                <p className="text-[10px] text-rose-500 mt-0.5">{s.lastDayFailed} başarısız</p>
              )}
            </div>
          </div>

          {/* Tetikleyici + Node bilgisi */}
          <div className="rounded-xl bg-muted/30 border border-border p-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Tetikleyici</p>
              <p className="font-medium text-foreground truncate">{wf.trigger}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Bileşen Sayısı</p>
              <p className="font-medium text-foreground">{wf.nodeCount} bileşen · {wf.connectionCount} bağlantı</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Oluşturulma</p>
              <p className="font-medium text-foreground">{wf.createdAt}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Son Çalışma</p>
              <p className="font-medium text-foreground">{formatDate(wf.lastRun)}</p>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function WorkflowListPage() {
  const navigate = useNavigate();
  const { workflows, createWorkflow, toggleEnabled, deleteWorkflow, fetchWorkflows } = useWorkflowStore();
  const { authHeader } = useAuthStore();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statsTarget, setStatsTarget] = useState(null);
  const [tenantStats, setTenantStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchTenantStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workflows/stats`, {
        headers: { ...authHeader() },
      });
      if (res.ok) setTenantStats(await res.json());
    } finally {
      setStatsLoading(false);
    }
  }, [authHeader]);

  const handleRefresh = () => {
    fetchWorkflows();
    fetchTenantStats();
  };

  /* Load on mount */
  useEffect(() => {
    fetchWorkflows();
    fetchTenantStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Delete */
  const confirmDelete = () => {
    deleteWorkflow(deleteTarget.id);
    setDeleteTarget(null);
  };

  /* New workflow: create in backend then navigate to builder */
  const handleNewWorkflow = async () => {
    const id = await createWorkflow();
    if (id) navigate(`/tenant/workflows/builder/${id}`);
  };

  /* Summary totals */
  const activeCount = workflows.filter((w) => w.enabled).length;
  const totalRuns   = workflows.reduce((s, w) => s + w.stats.totalRuns, 0);
  const totalFailed = workflows.reduce((s, w) => s + w.stats.failedRuns, 0);

  const ts = tenantStats;  // 24-hour stats from API

  return (
    <div className="p-6 space-y-6 max-w-6xl">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Workflow Yönetimi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tüm entegrasyon iş akışlarını izleyin, etkinleştirin ve yönetin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <RefreshCw size={13} className={statsLoading ? "animate-spin" : ""} />
            Yenile
          </button>
          <button
            onClick={handleNewWorkflow}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={15} />
            Yeni Workflow
          </button>
        </div>
      </div>

      {/* Summary cards — 24h stats from API */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard icon={GitBranch}     label="Toplam Workflow"    value={workflows.length}              sub={`${activeCount} aktif`}                                         color="blue"    />
        <SummaryCard icon={Activity}      label="24s Çalışma"        value={statsLoading ? "…" : (ts?.total ?? 0)}         sub="son 24 saat"                                color="emerald" />
        <SummaryCard icon={CheckCircle2}  label="24s Başarılı"       value={statsLoading ? "…" : (ts?.successful ?? 0)}    sub={ts && ts.total > 0 ? `%${((ts.successful/ts.total)*100).toFixed(0)} oran` : null} color="blue" />
        <SummaryCard icon={AlertTriangle} label="24s Hatalı"         value={statsLoading ? "…" : (ts?.failed ?? 0)}        sub={totalFailed > 0 ? `toplam ${totalFailed.toLocaleString("tr-TR")} hata` : "tüm zamanlar"} color="rose" />
      </div>

      {/* Workflow cards */}
      <div className="space-y-3">
        {workflows.map((wf) => {
          const rate = successRate(wf.stats);
          const TrendIcon = wf.stats.trend === "up" ? TrendingUp : wf.stats.trend === "down" ? TrendingDown : Activity;
          const trendColor = wf.stats.trend === "up" ? "text-emerald-500" : wf.stats.trend === "down" ? "text-rose-500" : "text-slate-400";

          return (
            <div
              key={wf.id}
              className={`rounded-xl border bg-white p-5 transition-all ${wf.enabled ? "border-border hover:shadow-sm" : "border-border/50 opacity-60"}`}
            >
              <div className="flex items-start gap-4">

                {/* Icon */}
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${wf.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <GitBranch size={18} />
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{wf.name}</h3>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${wf.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${wf.enabled ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
                      {wf.enabled ? "Aktif" : "Devre Dışı"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{wf.description}</p>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <Zap size={10} />
                      {wf.trigger}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{wf.nodeCount} bileşen</span>
                    <span className="text-[10px] text-muted-foreground">Son: {formatDate(wf.lastRun)}</span>
                  </div>
                </div>

                {/* Stats section */}
                <div className="flex-shrink-0 w-40 space-y-1.5 hidden lg:block">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Başarı oranı</span>
                    <TrendIcon size={11} className={trendColor} />
                  </div>
                  <SuccessBar rate={rate} />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{wf.stats.totalRuns.toLocaleString("tr-TR")} çalışma</span>
                    <span>{wf.stats.lastDayRuns} / gün</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-1 pl-2">
                  {/* Enable / Disable toggle */}
                  <button
                    onClick={() => toggleEnabled(wf.id)}
                    title={wf.enabled ? "Devre dışı bırak" : "Etkinleştir"}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                      wf.enabled
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    {wf.enabled ? <Pause size={11} /> : <Play size={11} />}
                    {wf.enabled ? "Durdur" : "Başlat"}
                  </button>

                  {/* Stats */}
                  <button
                    onClick={() => setStatsTarget(wf)}
                    title="İstatistikler"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                  >
                    <BarChart3 size={13} />
                  </button>

                  {/* Edit in builder */}
                  <button
                    onClick={() => navigate(`/tenant/workflows/builder/${wf.id}`)}
                    title="Builder'da düzenle"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                  >
                    <Settings size={13} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteTarget(wf)}
                    title="Sil"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Mobile stats row */}
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4 lg:hidden">
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground mb-1">Başarı oranı</p>
                  <SuccessBar rate={rate} />
                </div>
                <div className="text-[10px] text-muted-foreground text-right">
                  <p>{wf.stats.totalRuns.toLocaleString("tr-TR")} toplam</p>
                  <p>{wf.stats.lastDayRuns} bugün</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {workflows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 mb-4">
            <GitBranch size={28} className="text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Henüz workflow yok</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Yeni Workflow butonu ile başlayın</p>
        </div>
      )}

      {/* Modals */}
      {deleteTarget && (
        <DeleteModal
          workflow={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {statsTarget && (
        <StatsModal
          workflowId={statsTarget.id}
          workflowBase={statsTarget}
          onClose={() => setStatsTarget(null)}
        />
      )}
    </div>
  );
}
