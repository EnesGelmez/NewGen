import { useState, useEffect, useCallback } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { useAuthStore } from "../../store/authStore";
import { formatDate } from "../../lib/utils";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function StatusBadge({ status }) {
  if (status === "SUCCESS")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 size={11} /> Başarılı
      </span>
    );
  if (status === "FAILED")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
        <XCircle size={11} /> Hata
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
      <Loader2 size={11} className="animate-spin" /> Çalışıyor
    </span>
  );
}

function JsonBlock({ label, data }) {
  if (data == null) return null;
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <pre className="rounded-md bg-zinc-950 text-green-400 text-[11px] p-3 overflow-x-auto whitespace-pre-wrap break-all">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function LogRow({ run, token }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && detail === null) {
      setLoadingDetail(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/runs/${run.runId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setDetail(await res.json());
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const ChevronIcon = open ? ChevronDown : ChevronRight;

  return (
    <>
      <tr
        className="border-b border-border hover:bg-muted/20 transition-colors cursor-pointer select-none"
        onClick={toggle}
      >
        <td className="px-3 py-3 w-6">
          <ChevronIcon size={13} className="text-muted-foreground" />
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-foreground">{run.runId.slice(0, 8)}…</span>
        </td>
        <td className="px-4 py-3 text-sm text-foreground font-medium">
          {run.workflowName || <span className="text-muted-foreground/50 italic text-xs">—</span>}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={run.status} />
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(run.startedAt)}
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {run.durationMs != null ? `${run.durationMs} ms` : "—"}
        </td>
        <td className="px-4 py-3 max-w-xs">
          {run.errorMsg ? (
            <span className="inline-flex items-center gap-1 text-xs text-red-600">
              <AlertCircle size={11} /> {run.errorMsg}
            </span>
          ) : null}
        </td>
      </tr>

      {open && (
        <tr className="border-b border-border bg-muted/10">
          <td colSpan={7} className="px-6 py-4">
            {loadingDetail ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 size={14} className="animate-spin" /> Detay yükleniyor…
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <JsonBlock label="Gelen Veri (Webhook Payload)" data={detail.payload} />
                <JsonBlock label="Agente Gönderilen Model" data={detail.result?._agentSentBody} />
                {detail.status === "FAILED" && (
                  <JsonBlock
                    label="Agent Hata Yanıtı"
                    data={detail.result?._agentErrorBody ?? detail.errorMsg}
                  />
                )}
                {detail.status === "SUCCESS" && detail.result && (
                  <JsonBlock
                    label="Agent Yanıtı"
                    data={Object.fromEntries(
                      Object.entries(detail.result).filter(([k]) => !k.startsWith("_agent"))
                    )}
                  />
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Detay yüklenemedi.</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function IntegrationLogsPage() {
  const token = useAuthStore((s) => s.token);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/runs?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRuns(await res.json());
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const filtered = runs.filter((r) => {
    const matchSearch =
      r.runId.toLowerCase().includes(search.toLowerCase()) ||
      (r.workflowName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total   = runs.length;
  const success = runs.filter((r) => r.status === "SUCCESS").length;
  const failed  = runs.filter((r) => r.status === "FAILED").length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Entegrasyon Logları</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Workflow çalışma geçmişini izleyin
          </p>
        </div>
        <button
          onClick={fetchRuns}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Toplam",   count: total,   cls: "text-blue-600" },
          { label: "Başarılı", count: success, cls: "text-emerald-600" },
          { label: "Hatalı",   count: failed,  cls: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-4 text-center">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Run ID veya workflow adı ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-1.5">
              {[
                { value: "all",     label: "Tümü" },
                { value: "SUCCESS", label: "Başarılı" },
                { value: "FAILED",  label: "Hatalı" },
                { value: "RUNNING", label: "Çalışıyor" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === f.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Yükleniyor…</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-3 w-6" />
                  {["Run ID", "Workflow", "Durum", "Başlangıç", "Süre", "Hata"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((run) => (
                  <LogRow key={run.runId} run={run} token={token} />
                ))}
              </tbody>
            </table>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock size={32} className="text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">
                {runs.length === 0 ? "Henüz hiç çalışma kaydı yok" : "Sonuç bulunamadı"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {runs.length === 0
                  ? "Bir workflow tetiklendiğinde burada görünecek"
                  : "Arama veya filtrelerinizi değiştirmeyi deneyin"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}