import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuthStore } from "../../store/authStore";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export default function ChangePasswordPage() {
  const token = useAuthStore((s) => s.token);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const navigate = useNavigate();
  const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.newPassword.length < 6) { setError("Yeni şifre en az 6 karakter olmalıdır."); return; }
    if (form.newPassword !== form.confirm) { setError("Şifreler eşleşmiyor."); return; }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "İşlem başarısız."); return; }
      // Clear the mustChangePassword flag locally
      await refreshUser(token);
      navigate("/tenant", { replace: true });
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
            <KeyRound size={28} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Şifrenizi Değiştirin</h1>
          <p className="text-sm text-muted-foreground">
            İlk girişiniz için geçici şifrenizi değiştirmeniz gerekmektedir.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Mevcut Şifre"
            type="password"
            placeholder="Geçici şifreniz"
            value={form.oldPassword}
            onChange={(e) => setForm(p => ({ ...p, oldPassword: e.target.value }))}
            required
          />
          <Input
            label="Yeni Şifre"
            type="password"
            placeholder="En az 6 karakter"
            value={form.newPassword}
            onChange={(e) => setForm(p => ({ ...p, newPassword: e.target.value }))}
            required
          />
          <Input
            label="Yeni Şifre (Tekrar)"
            type="password"
            placeholder="Aynı şifreyi girin"
            value={form.confirm}
            onChange={(e) => setForm(p => ({ ...p, confirm: e.target.value }))}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" loading={saving}>
            Şifreyi Güncelle
          </Button>
        </form>
      </div>
    </div>
  );
}