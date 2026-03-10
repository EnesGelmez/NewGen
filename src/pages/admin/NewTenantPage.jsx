import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const toSubdomain = (name) =>
  name
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
import {
  Building2,
  User,
  Database,
  Mail,
  Phone,
  MapPin,
  Hash,
  ChevronRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

const STEPS = [
  { id: 1, label: "Şirket Bilgileri", icon: Building2 },
  { id: 2, label: "ERP Bağlantısı", icon: Database },
  { id: 3, label: "Admin Kullanıcı", icon: User },
  { id: 4, label: "Onay", icon: CheckCircle2 },
];

export default function NewTenantPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  const [form, setForm] = useState({
    // Step 1
    companyName: "",
    shortName: "",
    taxNumber: "",
    address: "",
    city: "",
    phone: "",
    // Step 2
    logoErpDb: "",
    logoErpVersion: "2024.2",
    logoErpServer: "",
    logoErpPort: "1433",
    logoErpUser: "",
    logoErpPass: "",
    // Step 3
    adminName: "Admin",
    adminEmail: "",
    adminPassword: "",
    adminPasswordConfirm: "",
    plan: "Business",
  });

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      // 1. Create tenant
      const tRes = await fetch(`${API}/api/v1/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.companyName,
          subdomain: toSubdomain(form.shortName || form.companyName),
          email: form.adminEmail,
          plan: form.plan,
        }),
      });
      const tData = await tRes.json();
      if (!tRes.ok) {
        setSubmitError(tData.error ?? "Tenant oluşturulamadı.");
        return;
      }
      // 2. Create admin user for the new tenant
      const uRes = await fetch(`${API}/api/v1/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: "Admin",
          email: form.adminEmail,
          role: "TENANT_ADMIN",
          password: form.adminPassword,
          tenantId: tData.id,
        }),
      });
      const uData = await uRes.json();
      if (!uRes.ok) {
        setSubmitError(uData.error ?? "Admin kullanıcı oluşturulamadı.");
        return;
      }
      setGeneratedCredentials({
        tenantId: tData.id,
        apiKey: tData.apiKey,
        email: form.adminEmail,
        tempPassword: form.adminPassword,
      });
      setSubmitted(true);
    } catch {
      setSubmitError("Sunucuya bağlanılamadı.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[70vh]">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 mx-auto">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Tenant Başarıyla Oluşturuldu!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {form.companyName} sisteme eklendi. Admin kullanıcı otomatik oluşturuldu.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-slate-50 p-5 text-left space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-amber-500" />
              <p className="text-sm font-semibold text-foreground">
                Otomatik Oluşturulan Admin Bilgileri
              </p>
            </div>
            {[
              { label: "Tenant ID", value: generatedCredentials.tenantId },
              { label: "API Key", value: generatedCredentials.apiKey, mono: true },
              { label: "Admin E-posta", value: generatedCredentials.email },
              { label: "Geçici Şifre", value: generatedCredentials.tempPassword, mono: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className={`text-sm font-medium text-foreground ${item.mono ? "font-mono bg-slate-100 px-2 py-0.5 rounded" : ""}`}>
                  {item.value}
                </span>
              </div>
            ))}
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ Bu bilgileri güvenli şekilde iletiniz. Şifre ilk girişte değiştirilecektir.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/admin/tenants")}>
              Listeyine Dön
            </Button>
            <Button className="flex-1" onClick={() => { setSubmitted(false); setStep(1); setForm({ companyName: "", shortName: "", taxNumber: "", address: "", city: "", phone: "", logoErpDb: "", logoErpVersion: "2024.2", logoErpServer: "", logoErpPort: "1433", logoErpUser: "", logoErpPass: "", adminName: "Admin", adminEmail: "", adminPassword: "", adminPasswordConfirm: "", plan: "Business" }); }}>
              Yeni Tenant Ekle
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Yeni Tenant Ekle</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Şirketi sisteme ekle, ERP bağlantısını ve admin kullanıcısını oluştur
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                step === s.id
                  ? "bg-primary text-primary-foreground font-semibold"
                  : step > s.id
                  ? "text-emerald-600"
                  : "text-muted-foreground"
              }`}
            >
              {step > s.id ? (
                <CheckCircle2 size={15} className="flex-shrink-0" />
              ) : (
                <s.icon size={15} className="flex-shrink-0" />
              )}
              <span className="text-xs whitespace-nowrap">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight size={14} className="text-muted-foreground flex-shrink-0 mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Company Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Şirket Bilgileri</CardTitle>
            <CardDescription>Müşterinin yasal şirket bilgilerini girin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input
                  label="Şirket Unvanı *"
                  placeholder="Örn: KurumSoft Kurumsal Bilişim Tekn.ve Dan.Hizm.A.Ş."
                  value={form.companyName}
                  onChange={set("companyName")}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Kısa Ad / Domain *"
                  placeholder="kurumsoft"
                  value={form.shortName}
                  onChange={(e) => {
                    const val = toSubdomain(e.target.value);
                    setForm((prev) => ({ ...prev, shortName: val }));
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Subdomain ve admin e-postasmda kullanılır.
                  {form.shortName && (
                    <span className="ml-1 font-mono text-primary">
                      admin@{form.shortName}.com
                    </span>
                  )}
                </p>
              </div>
              <Input
                label="Vergi Kimlik No (VKN) *"
                placeholder="10 haneli VKN"
                value={form.taxNumber}
                onChange={set("taxNumber")}
                maxLength={11}
              />
              <Input
                label="Telefon"
                placeholder="+90 212 555 0000"
                value={form.phone}
                onChange={set("phone")}
              />
              <div className="col-span-2">
                <Input
                  label="Adres"
                  placeholder="Cadde, No, İlçe"
                  value={form.address}
                  onChange={set("address")}
                />
              </div>
              <Input
                label="Şehir"
                placeholder="İstanbul"
                value={form.city}
                onChange={set("city")}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Plan *</label>
                <select
                  value={form.plan}
                  onChange={set("plan")}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {["Starter", "Business", "Enterprise"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!form.companyName || !form.shortName}>
                Devam Et <ChevronRight size={15} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: ERP Connection */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Logo ERP Bağlantı Bilgileri</CardTitle>
            <CardDescription>Müşterinin lokal LOGO ERP veritabanı bilgileri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="ERP Veritabanı Adı *"
                placeholder="Örn: ARCELIK_PROD"
                value={form.logoErpDb}
                onChange={set("logoErpDb")}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Logo ERP Versiyonu</label>
                <select
                  value={form.logoErpVersion}
                  onChange={set("logoErpVersion")}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {["2024.2", "2024.1", "2023.3", "2023.2"].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <Input
                label="SQL Server Adresi *"
                placeholder="192.168.1.100 veya hostname"
                value={form.logoErpServer}
                onChange={set("logoErpServer")}
              />
              <Input
                label="Port"
                placeholder="1433"
                value={form.logoErpPort}
                onChange={set("logoErpPort")}
              />
              <Input
                label="Kullanıcı Adı"
                placeholder="sa veya entegrasyon_user"
                value={form.logoErpUser}
                onChange={set("logoErpUser")}
              />
              <Input
                label="Şifre"
                type="password"
                placeholder="••••••••"
                value={form.logoErpPass}
                onChange={set("logoErpPass")}
              />
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-700">
                <strong>Not:</strong> Bu bilgiler şifreli şekilde saklanır. Agent kurulumundan sonra bağlantı testi yapılacaktır.
              </p>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Geri</Button>
              <Button
                onClick={() => {
                  // Auto-fill admin email from shortName if not yet set
                  setForm((prev) => ({
                    ...prev,
                    adminEmail: prev.adminEmail || `admin@${prev.shortName || toSubdomain(prev.companyName)}.com`,
                  }));
                  setStep(3);
                }}
                disabled={!form.logoErpDb || !form.logoErpServer}
              >
                Devam Et <ChevronRight size={15} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Admin User */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Kullanıcı Bilgileri</CardTitle>
            <CardDescription>Tenant admin hesabı bu bilgilerle oluşturulacaktır. İlk girişte şifre değiştirilmesi zorunlu olacaktır.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Ad Soyad</label>
                <div className="h-9 rounded-lg border border-input bg-muted px-3 flex items-center text-sm text-muted-foreground">
                  Admin
                </div>
              </div>
              <Input
                label="E-posta Adresi *"
                type="email"
                placeholder={`admin@${form.shortName || toSubdomain(form.companyName) || "sirket"}.com`}
                value={form.adminEmail}
                onChange={set("adminEmail")}
              />
              <Input
                label="Şifre *"
                type="password"
                placeholder="En az 8 karakter"
                value={form.adminPassword}
                onChange={set("adminPassword")}
              />
              <Input
                label="Şifre Tekrar *"
                type="password"
                placeholder="Şifreyi tekrar girin"
                value={form.adminPasswordConfirm}
                onChange={set("adminPasswordConfirm")}
              />
              {form.adminPasswordConfirm && form.adminPassword !== form.adminPasswordConfirm && (
                <p className="text-xs text-red-600">Şifreler eşleşmiyor.</p>
              )}
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-700">
                <strong>Not:</strong> Kullanıcı ilk girişinde bu şifreyi değiştirmek zorunda kalacaktır.
              </p>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>Geri</Button>
              <Button
                onClick={() => setStep(4)}
                disabled={
                  !form.adminEmail ||
                  !form.adminPassword ||
                  form.adminPassword.length < 8 ||
                  form.adminPassword !== form.adminPasswordConfirm
                }
              >
                Önizleme <ChevronRight size={15} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Kayıt Özeti</CardTitle>
            <CardDescription>Bilgileri kontrol edin ve onaylayın</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              {
                title: "Şirket Bilgileri",
                items: [
                  { label: "Unvan", value: form.companyName },
                  { label: "VKN", value: form.taxNumber },
                  { label: "Şehir", value: form.city },
                  { label: "Plan", value: form.plan },
                ],
              },
              {
                title: "ERP Bağlantısı",
                items: [
                  { label: "Veritabanı", value: form.logoErpDb },
                  { label: "Versiyon", value: form.logoErpVersion },
                  { label: "Sunucu", value: `${form.logoErpServer}:${form.logoErpPort}` },
                ],
              },
              {
                title: "Admin Kullanıcı",
                items: [
                  { label: "Ad Soyad", value: "Admin" },
                  { label: "E-posta", value: form.adminEmail },
                  { label: "Şifre", value: "•".repeat(form.adminPassword.length) },
                ],
              },
            ].map((section) => (
              <div key={section.title} className="rounded-xl border border-border p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {section.title}
                </p>
                {section.items.map((item) => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium text-foreground">{item.value || "—"}</span>
                  </div>
                ))}
              </div>
            ))}

            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {submitError}
              </p>
            )}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(3)}>Geri</Button>
              <Button onClick={handleSubmit} loading={isSubmitting} variant="success">
                {isSubmitting ? "Oluşturuluyor..." : "Tenant Oluştur"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
