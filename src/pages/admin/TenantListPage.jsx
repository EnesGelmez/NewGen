import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Building2,
  ChevronUp,
  ChevronDown,
  Bot,
  Eye,
  Edit2,
  Loader2,
  AlertCircle,
  X,
  Save,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/Table";
import { useAuthStore } from "../../store/authStore";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export default function TenantListPage() {
  const navigate = useNavigate();
  const { authHeader } = useAuthStore();
  const [tenants, setTenants] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [editingTenant, setEditingTenant] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoadingTenants(true);
    fetch(`${API}/api/v1/tenants`, { headers: authHeader() })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setTenants(data ?? []))
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoadingTenants(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = tenants
    .filter((t) => {
      const q = search.toLowerCase();
      const matchSearch =
        (t.name ?? "").toLowerCase().includes(q) ||
        (t.subdomain ?? "").toLowerCase().includes(q) ||
        (t.email ?? "").toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all" || t.status?.toLowerCase() === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let aVal = a[sortField] ?? "";
      let bVal = b[sortField] ?? "";
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const openEdit = (tenant) => {
    setEditForm({ name: tenant.name, email: tenant.email, plan: tenant.plan ?? "Starter", status: tenant.status });
    setEditingTenant(tenant);
  };

  const handleSaveEdit = async () => {
    if (!editingTenant) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/v1/tenants/${editingTenant.id}`, {
        method: "PUT",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const updated = await r.json();
      setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTenant(null);
    } catch (e) {
      alert("Kayıt başarısız: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTenant) return;
    setDeleting(true);
    try {
      const r = await fetch(`${API}/api/v1/tenants/${deletingTenant.id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setTenants((prev) => prev.filter((t) => t.id !== deletingTenant.id));
      setDeletingTenant(null);
    } catch (e) {
      alert("Silme başarısız: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  const SortIcon = ({ field }) =>
    sortField === field ? (
      sortDir === "asc" ? (
        <ChevronUp size={12} className="text-primary" />
      ) : (
        <ChevronDown size={12} className="text-primary" />
      )
    ) : (
      <ChevronDown size={12} className="opacity-30" />
    );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tenant Yönetimi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sistemdeki tüm müşteri tenantlarını görüntüle ve yönet
          </p>
        </div>
        <Link to="/admin/tenants/new">
          <Button>
            <Plus size={15} />
            Yeni Tenant Ekle
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Toplam Tenant", value: tenants.length, icon: Building2, color: "text-blue-600 bg-blue-50" },
          { label: "Aktif", value: tenants.filter((t) => t.status === "ACTIVE").length, icon: Building2, color: "text-emerald-600 bg-emerald-50" },
          { label: "Trial / Askıya Alınmış", value: tenants.filter((t) => t.status !== "ACTIVE").length, icon: Building2, color: "text-red-600 bg-red-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Şirket adı, subdomain, e-posta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Status filter */}
            <div className="flex gap-1.5">
              {[
                { value: "all", label: "Tümü" },
                { value: "active", label: "Aktif" },
                { value: "suspended", label: "Askıda" },
                { value: "trial", label: "Trial" },
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

            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">
              {filtered.length} tenant gösteriliyor
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loadingTenants ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Yükleniyor…</span>
            </div>
          ) : fetchError ? (
            <div className="flex items-center gap-2 p-4 text-red-600 text-sm">
              <AlertCircle size={15} />
              Tenantlar yüklenemedi: {fetchError}
            </div>
          ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("name")}
                >
                  <span className="flex items-center gap-1">
                    Şirket <SortIcon field="name" />
                  </span>
                </TableHead>
                <TableHead>Subdomain</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("createdAt")}
                >
                  <span className="flex items-center gap-1">
                    Kayıt Tarihi <SortIcon field="createdAt" />
                  </span>
                </TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 flex-shrink-0">
                        {(tenant.name ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{tenant.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-foreground">{tenant.subdomain}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-foreground">{tenant.email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tenant.status === "ACTIVE"
                          ? "success"
                          : tenant.status === "TRIAL"
                          ? "info"
                          : "error"
                      }
                    >
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tenant.plan === "Enterprise"
                          ? "purple"
                          : tenant.plan === "Business"
                          ? "info"
                          : "secondary"
                      }
                    >
                      {tenant.plan ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {new Date(tenant.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => navigate(`/admin/tenants/${tenant.id}/agent`)}
                        className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-violet-50 text-muted-foreground hover:text-violet-600 transition-colors"
                        title="Agent Yapılandır"
                      >
                        <Bot size={14} />
                      </button>
                      <button
                        onClick={() => navigate(`/admin/tenants/${tenant.id}/agent`)}
                        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Detay"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(tenant)}
                        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingTenant(tenant)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filtered.length === 0 && !loadingTenants && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 size={32} className="text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">
                Tenant bulunamadı
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Arama kriterlerinizi değiştirmeyi deneyin
              </p>
            </div>
          )}
          </>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Tenant Modal ── */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Tenant Düzenle</h2>
              <button onClick={() => setEditingTenant(null)} className="p-1.5 rounded-lg hover:bg-muted">
                <X size={15} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Şirket Adı</label>
                <input
                  value={editForm.name ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">E-posta</label>
                <input
                  value={editForm.email ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Plan</label>
                <select
                  value={editForm.plan ?? "Starter"}
                  onChange={(e) => setEditForm((p) => ({ ...p, plan: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {["Starter", "Business", "Enterprise"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Durum</label>
                <select
                  value={editForm.status ?? "ACTIVE"}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {["ACTIVE", "TRIAL", "SUSPENDED"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-muted/30">
              <button
                onClick={() => setEditingTenant(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/60 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingTenant && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Tenant'ı Sil</h2>
              <button onClick={() => setDeletingTenant(null)} className="p-1.5 rounded-lg hover:bg-muted">
                <X size={15} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 mx-auto">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <p className="text-sm text-center text-foreground">
                <strong>{deletingTenant.name}</strong> tenant'ını silmek istediğinizden emin misiniz?
              </p>
              <p className="text-xs text-center text-muted-foreground">
                Bu işlem geri alınamaz. Tenant'a ait tüm kullanıcılar ve veriler kalıcı olarak silinir.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-muted/30">
              <button
                onClick={() => setDeletingTenant(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/60 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
