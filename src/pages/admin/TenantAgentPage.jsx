import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bot, Save, Trash2, RefreshCw, Eye, EyeOff,
  CheckCircle2, AlertCircle, Copy, Check, ExternalLink,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useTenantAgentStore } from "../../store/tenantAgentStore";

export default function TenantAgentPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { agent, loading, error, fetchAgent, saveAgent, deleteAgent, generateSecret } =
    useTenantAgentStore();

  const [form, setForm] = useState({
    name: "LOGO ERP Agent",
    endpointUrl: "",
    secretKey: "",
    isActive: true,
  });
  const [showSecret, setShowSecret] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetchAgent(tenantId).then((a) => {
      if (a) {
        setForm({
          name: a.name,
          endpointUrl: a.endpointUrl,
          secretKey: a.secretKey,
          isActive: a.isActive,
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const handleSave = async () => {
    const result = await saveAgent(tenantId, form);
    if (result) {
      setForm({ name: result.name, endpointUrl: result.endpointUrl, secretKey: result.secretKey, isActive: result.isActive });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleGenerate = async () => {
    const secret = await generateSecret(tenantId);
    if (secret) setForm((f) => ({ ...f, secretKey: secret }));
  };

  const handleDelete = async () => {
    const ok = await deleteAgent(tenantId);
    if (ok) navigate("/admin/tenants");
  };

  const copySecret = () => {
    navigator.clipboard.writeText(form.secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3"> 
        <button
          onClick={() => navigate("/admin/tenants")}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
        >
          <ArrowLeft size={13} />
          Geri
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
            <Bot size={15} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Agent Yapılandırması</h1>
            <p className="text-xs text-muted-foreground">Tenant ID: {tenantId}</p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Info callout */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800">
        <p className="font-semibold mb-1">Ne işe yarar?</p>
        <p className="text-[13px] leading-relaxed">
          Bu tenant'a ait workflow'lar tetiklendiğinde, platform aşağıdaki <strong>Base URL</strong>'e workflow'un
          {" "}<code className="bg-violet-100 px-1 rounded font-mono">Endpoint Yolu</code>'nu ekleyerek POST atar
          (ör. <code className="bg-violet-100 px-1 rounded font-mono">http://localhost:9090/api</code>{" "}
          + <code className="bg-violet-100 px-1 rounded font-mono">/LogoHR/UpdateApprovalStatus</code>).
          İstekler <code className="bg-violet-100 px-1 rounded font-mono">X-API-Key</code> başlığı ile imzalanır.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-border bg-white p-5 space-y-4">
        {/* Name */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Agent Adı</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="LOGO ERP Agent"
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Endpoint URL */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Agent Base URL <span className="text-red-500">*</span>
          </label>
          <input
            value={form.endpointUrl}
            onChange={(e) => setForm((f) => ({ ...f, endpointUrl: e.target.value }))}
            placeholder="http://localhost:9090/api"
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Sadece temel URL — yol (path) her workflow'un <strong>HTTP/JSON Tetikleyici → Endpoint Yolu</strong> alanından otomatik eklenir.
          </p>
        </div>

        {/* Secret Key */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Secret Key <span className="text-muted-foreground font-normal">(X-API-Key header)</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showSecret ? "text" : "password"}
                value={form.secretKey}
                onChange={(e) => setForm((f) => ({ ...f, secretKey: e.target.value }))}
                placeholder="Boş bırakılırsa otomatik oluşturulur"
                className="w-full h-9 rounded-lg border border-input bg-background px-3 pr-9 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              onClick={copySecret}
              disabled={!form.secretKey}
              title="Kopyala"
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 disabled:opacity-40 transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
            <button
              onClick={handleGenerate}
              title="Yeni secret üret"
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              <RefreshCw size={13} />
              Üret
            </button>
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-foreground">Agent Aktif</p>
            <p className="text-xs text-muted-foreground">Devre dışıysa workflow tetiklenmeye devam eder ama agent çağrılmaz.</p>
          </div>
          <button
            onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
            className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${form.isActive ? "bg-primary" : "bg-muted-foreground/30"}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-4" : ""}`} />
          </button>
        </div>

        {/* Request preview */}
        {form.endpointUrl && (
          <div className="rounded-lg border border-dashed border-border bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">İstek Önizlemesi</p>
            <pre className="text-[10.5px] font-mono text-slate-700 leading-relaxed whitespace-pre-wrap break-all">
{`POST ${form.endpointUrl}
X-API-Key: ${form.secretKey ? form.secretKey.slice(0, 12) + "…" : "<auto>"}
Content-Type: application/json

{
  "PRCID": "…",
  "Status": 0,
  "workflowId": "wf-xxx",
  "triggeredAt": "2026-03-05T…"
}`}
            </pre>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <div>
          {agent && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Emin misiniz?</span>
                <button
                  onClick={handleDelete}
                  className="text-xs text-red-600 font-semibold hover:underline"
                >
                  Evet, sil
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  İptal
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 size={13} />
                Agent Sil
              </button>
            )
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={!form.endpointUrl || loading}
          variant={saved ? "success" : "default"}
        >
          {saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
          {loading ? "Kaydediliyor..." : saved ? "Kaydedildi!" : "Kaydet"}
        </Button>
      </div>

      {/* LOGO ERP help note */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">LOGO ERP Entegrasyonu</p>
        <p className="text-[12px] leading-relaxed">
          LOGO ERP tarafında API key doğrulaması için gelen isteğin
          <code className="bg-amber-100 px-1 rounded font-mono mx-1">X-API-Key</code>
          başlığını kontrol edin. Örnek endpoint:
          <code className="bg-amber-100 px-1 rounded font-mono ml-1">http://localhost:5000/api/LogoHR/UpdateApprovalStatus</code>
        </p>
      </div>
    </div>
  );
}
