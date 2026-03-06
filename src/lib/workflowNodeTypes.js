/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║              WORKFLOW BİLEŞEN (NODE) KAYIT DEFTERİ                 ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  Yeni bir bileşen eklemek için NODE_TYPES objesine yeni bir        ║
 * ║  key-value çifti ekleyin. Aşağıdaki yapıyı takip edin:            ║
 * ║                                                                      ║
 * ║   "benzersiz_tip_adi": {                                            ║
 * ║     label      : string      ← Kullanıcıya görünen ad             ║
 * ║     category   : string      ← Palette kategorisi                 ║
 * ║     colorKey   : string      ← blue | violet | amber | emerald    ║
 * ║     icon       : Component   ← Lucide React icon                  ║
 * ║     desc       : string      ← Kısa açıklama (node üzerinde)      ║
 * ║     configSchema: Array      ← Sağ panelde düzenlenebilir alanlar ║
 * ║   }                                                                  ║
 * ║                                                                      ║
 * ║  configSchema field tipleri:                                        ║
 * ║    "text"     → Tek satır input                                     ║
 * ║    "select"   → Dropdown (options: [...] gerekli)                   ║
 * ║    "boolean"  → Toggle switch                                       ║
 * ║    "textarea" → Çok satır metin                                     ║
 * ║    "code"     → Monospace kod editörü                              ║
 * ║    "readonly" → Okunur bilgi bloğu (koddaki başvuru için)          ║
 * ║                                                                      ║
 * ║  Şablon değişkenleri (defaultValue ve config içinde kullanılır):   ║
 * ║    {{model.ALAN_ADI}}     ← Mevcut modeldeki alan                  ║
 * ║    {{config.ANAHTAR}}     ← Tenant konfigürasyon değeri            ║
 * ║    {{workflow.name}}      ← Workflow meta bilgisi                   ║
 * ║    {{response.ALAN}}      ← Önceki adımın yanıtı                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import { Globe, Server, UserCheck, FileJson2, Shuffle } from "lucide-react";

export const PALETTE_CATEGORIES = [
  "Tetikleyiciler",
  "Dönüşüm",
  "Agent & Çıkış",
  "Özel Bileşenler",
];

export const NODE_TYPES = {

  // ═══ TETİKLEYİCİLER ══════════════════════════════════════════════════

  trigger_http_json: {
    label: "HTTP / JSON Tetikleyici",
    category: "Tetikleyiciler",
    colorKey: "blue",
    icon: Globe,
    desc: "Dış sistemden gelen JSON isteğini alır, workflow'u başlatır. Webhook URL: POST /api/v1/webhooks/{workflowId}",
    configSchema: [
      {
        key: "webhookInfo",
        label: "📌 Webhook URL (bilgi)",
        type: "readonly",
        defaultValue: "POST http://localhost:8080/api/v1/webhooks/{workflowId}\nHeader: x-api-key: <tenant-api-key>\nBody: herhangi bir JSON",
      },
      { key: "authRequired", label: "API Key Zorunlu", type: "boolean", defaultValue: true },
    ],
  },

  // ═══ DÖNÜŞÜM ═════════════════════════════════════════════════════════

  json_schema: {
    label: "Gelen JSON Yapısı",
    category: "Dönüşüm",
    colorKey: "slate",
    icon: FileJson2,
    desc: "Bize gönderilecek JSON'ın yapısını tanımlayın. Sağ panelde JSON yapıştırın — alanlar otomatik çıkarılır ve Mapping node'unda kaynak olarak kullanılır.",
    configSchema: [],
  },

  model_mapping: {
    label: "Model Eşleştirme",
    category: "Dönüşüm",
    colorKey: "violet",
    icon: Shuffle,
    desc: "Gelen JSON alanlarını tanımladığınız modele eşleştirir. Çıktı agent isteğinin body'sine eklenir.",
    configSchema: [],
  },

  // ═══ AGENT & ÇIKIŞ ═══════════════════════════════════════════════════

  agent_request: {
    label: "Agent İsteği",
    category: "Agent & Çıkış",
    colorKey: "emerald",
    icon: Server,
    desc: "Tenant'a tanımlı Agent'a istek atar. Base URL tenant ayarlarından, path buradan alınır.",
    configSchema: [
      {
        key: "httpMethod", label: "HTTP Method", type: "select",
        options: ["POST", "GET", "PUT", "PATCH"],
        defaultValue: "POST",
      },
      {
        key: "agentEndpoint", label: "Endpoint Yolu (path)", type: "text",
        defaultValue: "/api/Test/Health",
      },
      {
        key: "__info__", label: "ℹ️ Tam URL", type: "readonly",
        defaultValue: "Tenant Agent Base URL + Endpoint Yolu\nÖrnek: http://host:5181 + /api/Test/Health\n→ http://host:5181/api/Test/Health",
      },
    ],
  },

  // ═══ ÖZEL BİLEŞENLER ════════════════════════════════════════════════

  custom_cari_kontrol: {
    label: "Cari Kontrol Bayrağı",
    category: "Özel Bileşenler",
    colorKey: "teal",
    icon: UserCheck,
    desc: "Agent isteğine cari kontrol bayrağı ekler. Agent işlemi kendi yapar.",
    inputs: [
      { key: "cariKod", label: "Cari Kodu / Referans", type: "string", required: true },
    ],
    returnType: "bool",
    outputLabels: { true: "Kontrol Ekle", false: "Atla" },
    responseModel: "CariKontrolResponse",
    configSchema: [
      {
        key: "cariKontrolEdilecekMi",
        label: "Cari Kontrol Edilecek mi?",
        type: "boolean",
        defaultValue: true,
      },
      {
        key: "flagName",
        label: "Agent Bayrak Adı",
        type: "text",
        defaultValue: "cariKontrolEdilecekMi",
      },
      {
        key: "__response__",
        label: "Dönen Model (CariKontrolResponse)",
        type: "readonly",
        defaultValue: `CariKontrolResponse {
  success                : bool    ← istek başarılı mı? (test: her zaman true)
  cariKontrolEdilecekMi  : bool    ← Agent'a iletilen bayrak
  cariKod               : string  ← gelen cari kodu (echo)
}

// AgentRequest payload'una eklenir:
{
  ...payload,
  cariKontrolEdilecekMi: true
}`,
      },
    ],
  },
};

/** Palette için kategoriye göre grupla */
export function getPaletteGroups() {
  const groups = {};
  for (const [type, def] of Object.entries(NODE_TYPES)) {
    if (!groups[def.category]) groups[def.category] = [];
    groups[def.category].push({ type, ...def });
  }
  return PALETTE_CATEGORIES.map((cat) => ({ category: cat, nodes: groups[cat] || [] }));
}

export const COLOR_MAP = {
  blue: {
    border: "border-blue-200", bg: "bg-blue-50", iconBg: "bg-blue-500",
    nodeBorder: "border-blue-300", headerBg: "bg-blue-500", text: "text-blue-700",
    ring: "ring-blue-400",
  },
  violet: {
    border: "border-violet-200", bg: "bg-violet-50", iconBg: "bg-violet-500",
    nodeBorder: "border-violet-300", headerBg: "bg-violet-500", text: "text-violet-700",
    ring: "ring-violet-400",
  },
  amber: {
    border: "border-amber-200", bg: "bg-amber-50", iconBg: "bg-amber-500",
    nodeBorder: "border-amber-300", headerBg: "bg-amber-500", text: "text-amber-700",
    ring: "ring-amber-400",
  },
  emerald: {
    border: "border-emerald-200", bg: "bg-emerald-50", iconBg: "bg-emerald-500",
    nodeBorder: "border-emerald-300", headerBg: "bg-emerald-500", text: "text-emerald-700",
    ring: "ring-emerald-400",
  },
  teal: {
    border: "border-teal-200", bg: "bg-teal-50", iconBg: "bg-teal-600",
    nodeBorder: "border-teal-300", headerBg: "bg-teal-600", text: "text-teal-700",
    ring: "ring-teal-400",
  },
  slate: {
    border: "border-slate-200", bg: "bg-slate-100", iconBg: "bg-slate-600",
    nodeBorder: "border-slate-300", headerBg: "bg-slate-600", text: "text-slate-700",
    ring: "ring-slate-400",
  },
};
