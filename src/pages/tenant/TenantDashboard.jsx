import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
  ArrowRight,
  RefreshCw,
  GitBranch,
  Zap,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/authStore";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default function TenantDashboard() {
  const { authHeader } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/workflows/stats`, {
        headers: { ...authHeader() },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const successRate =
    stats && stats.total > 0
      ? ((stats.successful / stats.total) * 100).toFixed(1)
      : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Son 24 saatlik workflow istatistikleri
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Yenile
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            icon: Activity,
            label: "Toplam Çalışma (24s)",
            value: loading ? "—" : (stats?.total ?? 0),
            color: "text-blue-600 bg-blue-50",
          },
          {
            icon: CheckCircle2,
            label: "Başarılı",
            value: loading ? "—" : (stats?.successful ?? 0),
            color: "text-emerald-600 bg-emerald-50",
            sub: successRate ? `%${successRate} başarı oranı` : null,
          },
          {
            icon: XCircle,
            label: "Hatalı",
            value: loading ? "—" : (stats?.failed ?? 0),
            color: "text-red-600 bg-red-50",
          },
          {
            icon: GitBranch,
            label: "Aktif Workflow",
            value: loading ? "—" : (stats?.activeWorkflows ?? 0),
            color: "text-violet-600 bg-violet-50",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-border p-5 shadow-sm"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl mb-3 ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-foreground mt-0.5">{stat.label}</p>
            {stat.sub && (
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Recent runs */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Son Çalışmalar</CardTitle>
          <Link to="/tenant/workflows">
            <Button variant="ghost" size="sm">
              Tüm Workflowlar <ArrowRight size={13} />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">Yükleniyor…</div>
          ) : !stats?.recentRuns?.length ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              <Zap size={24} className="mx-auto mb-2 text-muted-foreground/40" />
              Henüz workflow çalıştırılmamış. Bir webhook çağrısı yaparak başlayabilirsiniz.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {stats.recentRuns.map((run) => (
                <div
                  key={run.runId}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      run.status === "SUCCESS" ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm font-medium text-foreground flex-1 truncate">
                    {run.workflowName || run.workflowId}
                  </span>
                  <Badge variant={run.status === "SUCCESS" ? "success" : "error"} className="text-[10px]">
                    {run.status === "SUCCESS" ? "BAŞARILI" : "HATA"}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Clock size={10} />
                    {formatDateTime(run.startedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
