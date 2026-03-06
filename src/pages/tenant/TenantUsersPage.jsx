import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, UserCircle, ShieldCheck, Eye } from "lucide-react";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/Table";
import { Input } from "../../components/ui/Input";
import { useAuthStore } from "../../store/authStore";
import { formatDate } from "../../lib/utils";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const ROLES = [
  { value: "TENANT_ADMIN", label: "Tenant Admin", description: "Tüm ayarlara ve kullanıcılara erişir" },
  { value: "VIEWER",       label: "Görüntüleyici", description: "Sadece okuma yetkisi" },
];

function UserModal({ user, onClose, onSaved, token, emailDomain }) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState({
    name:        user?.name  ?? "",
    emailPrefix: user?.email ? user.email.split("@")[0] : "",
    role:        user?.role  ?? "VIEWER",
    password:    "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fullEmail = isEdit
    ? user.email
    : form.emailPrefix ? `${form.emailPrefix}@${emailDomain}` : "";

  const handleSave = async () => {
    setError("");
    if (!form.name || !fullEmail) { setError("Ad ve e-posta zorunludur."); return; }
    if (!isEdit && !form.password) { setError("Şifre zorunludur."); return; }

    setSaving(true);
    try {
      const body = isEdit
        ? { name: form.name, role: form.role }
        : { name: form.name, email: fullEmail, role: form.role, password: form.password };

      const res = await fetch(
        isEdit ? `${API_BASE}/api/v1/users/${user.id}` : `${API_BASE}/api/v1/users`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "İşlem başarısız."); return; }
      onSaved();
      onClose();
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="font-semibold text-lg text-foreground">
            {isEdit ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Ekle"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          <Input
            label="Ad Soyad *"
            placeholder="Selin Arslan"
            value={form.name}
            onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
          />
          {!isEdit ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">E-posta *</label>
              <div className="flex h-9 rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                <input
                  type="text"
                  placeholder="selin"
                  value={form.emailPrefix}
                  onChange={(e) => setForm(p => ({ ...p, emailPrefix: e.target.value.replace(/@.*/, "") }))}
                  className="flex-1 min-w-0 px-3 text-sm bg-transparent focus:outline-none"
                />
                <span className="flex items-center px-3 bg-muted border-l border-input text-sm text-muted-foreground whitespace-nowrap select-none">
                  @{emailDomain}
                </span>
              </div>
            </div>
          ) : (
            <Input
              label="E-posta"
              type="email"
              value={user.email}
              disabled
            />
          )}
          {!isEdit && (
            <Input
              label="Geçici Şifre *"
              type="password"
              placeholder="En az 6 karakter"
              value={form.password}
              onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
            />
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Rol *</label>
            <select
              value={form.role}
              onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <p className="text-xs text-muted-foreground">
              {ROLES.find((r) => r.value === form.role)?.description}
            </p>
          </div>
          {!isEdit && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
              Kullanıcı ilk girişinde şifresini değiştirmek zorunda kalacak.
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>İptal</Button>
          <Button className="flex-1" loading={saving} onClick={handleSave}>
            {isEdit ? "Kaydet" : "Kullanıcı Ekle"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  if (role === "TENANT_ADMIN")
    return <Badge variant="purple"><ShieldCheck size={11} className="mr-1" />Tenant Admin</Badge>;
  return <Badge variant="info"><Eye size={11} className="mr-1" />Görüntüleyici</Badge>;
}

export default function TenantUsersPage() {
  const token = useAuthStore((s) => s.token);
  const currentUserEmail = useAuthStore((s) => s.user?.email ?? "");
  const currentUserId = useAuthStore((s) => s.user?.id);
  const emailDomain = currentUserEmail.split("@")[1] ?? "firma.com";
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | "add" | { user }
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id) => {
    await fetch(`${API_BASE}/api/v1/users/${id}/toggle`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
  };

  const handleDelete = async (id) => {
    await fetch(`${API_BASE}/api/v1/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeleteConfirm(null);
    load();
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5">
      {modal === "add" && (
        <UserModal token={token} emailDomain={emailDomain} onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal?.user && (
        <UserModal token={token} emailDomain={emailDomain} user={modal.user} onClose={() => setModal(null)} onSaved={load} />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 text-center space-y-4">
            <p className="font-semibold text-foreground">Kullanıcıyı sil?</p>
            <p className="text-sm text-muted-foreground">{deleteConfirm.name} adlı kullanıcı kalıcı olarak silinecek.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>İptal</Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deleteConfirm.id)}>Sil</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Şirket çalışanlarını sisteme ekleyin ve rollerini atayın
          </p>
        </div>
        <Button onClick={() => setModal("add")}>
          <Plus size={15} />
          Kullanıcı Ekle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="İsim veya e-posta ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} kullanıcı
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Yükleniyor…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{user.name}</p>
                          {user.mustChangePassword && (
                            <span className="text-[10px] text-amber-600 font-medium">İlk giriş bekleniyor</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => user.id !== currentUserId && handleToggle(user.id)}
                        disabled={user.id === currentUserId}
                        className="cursor-pointer disabled:cursor-default"
                        title={user.id === currentUserId ? "Kendi hesabınızı pasifleştiremezsiniz" : "Tıklayarak değiştir"}
                      >
                        <Badge variant={user.isActive ? "success" : "secondary"}>
                          {user.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setModal({ user })}
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => user.id !== currentUserId && setDeleteConfirm(user)}
                          disabled={user.id === currentUserId}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-default"
                          title={user.id === currentUserId ? "Kendinizi silemezsiniz" : "Sil"}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserCircle size={32} className="text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">
                {users.length === 0 ? "Henüz kullanıcı eklenmemiş" : "Sonuç bulunamadı"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}