import { useState, useEffect } from "react";
import { Copy, Check, Key, RefreshCw, Building2, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { useAuthStore } from "../../store/authStore";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export default function TenantSettingsPage() {
  const { authHeader } = useAuthStore();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/v1/tenant/me`, { headers: authHeader() })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setTenant(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyKey = () => {
    if (!tenant?.apiKey) return;
    navigator.clipboard.writeText(tenant.apiKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskedKey = (key) => key ? key.slice(0, 8) + "••••••••••••••••••••••••••" : "";

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Tenant Ayarları</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Entegrasyon kimlik bilgileriniz ve tenant bilgileriniz
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 size={16} className="animate-spin" />
          Yükleniyor…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={15} />
          Bilgiler yüklenemedi: {error}
        </div>
      )}

      {tenant && (
        <>
          {/* Tenant Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-muted-foreground" />
                <CardTitle className="text-sm">Tenant Bilgileri</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Şirket Adı", value: tenant.name },
                { label: "Subdomain", value: tenant.subdomain, mono: true },
                { label: "E-posta", value: tenant.email },
                { label: "Plan", value: tenant.plan },
                { label: "Durum", value: tenant.status },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className={`text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}>{value ?? "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* API Key */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key size={16} className="text-amber-600" />
                <CardTitle className="text-sm">Webhook API Anahtarı</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Dış sistemler bu anahtarı <code className="bg-muted px-1 rounded font-mono">X-API-Key</code> başlığıyla göndererek
                workflowlarınızı tetikler. Bu anahtarı güvende tutun.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-input bg-muted/30 px-3 py-2 font-mono text-sm text-foreground min-w-0">
                  {showKey ? tenant.apiKey : maskedKey(tenant.apiKey)}
                </div>
                <button
                  onClick={() => setShowKey((v) => !v)}
                  className="flex-shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
                >
                  {showKey ? "Gizle" : "Göster"}
                </button>
                <button
                  onClick={copyKey}
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  {copied ? "Kopyalandı!" : "Kopyala"}
                </button>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Kullanım Örneği:</p>
                <code className="block font-mono bg-white border border-amber-100 rounded px-2 py-1.5 break-all">
                  {`curl -X POST http://localhost:8080/api/v1/webhooks/{workflowId} \\`}
                  <br />
                  {`  -H "X-API-Key: ${showKey ? tenant.apiKey : maskedKey(tenant.apiKey)}" \\`}
                  <br />
                  {`  -H "Content-Type: application/json" \\`}
                  <br />
                  {`  -d '{"cariKodu": "ABC123"}'`}
                </code>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
