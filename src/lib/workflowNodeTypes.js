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

import {
  Globe, Database, ShieldCheck, CheckCircle2, RefreshCw,
  Server, Mail, Zap, AlertTriangle, GitBranch, Filter,
  Clock, ShoppingCart, Building2, User, Package, Play,
  UserCheck, Bell, Search, Puzzle,
} from "lucide-react";

// ─── Hedef model tanımları (FieldMapEditor için) ─────────────────────────────
export const TARGET_MODELS = {
  CariModel: {
    label: "Cari Modeli",
    fields: [
      { field: "DEFINITION",    label: "Ünvan / Ad Soyad",     group: "Cari Bilgileri" },
      { field: "CLIENTCODE",    label: "Cari Kodu",            group: "Cari Bilgileri" },
      { field: "TCKN",          label: "TCKN",                 group: "Cari Bilgileri" },
      { field: "VKN",           label: "Vergi No (VKN)",       group: "Cari Bilgileri" },
      { field: "EMAILADDR",     label: "E-posta",              group: "İletişim" },
      { field: "TELEPHONE1",    label: "Telefon 1",            group: "İletişim" },
      { field: "TELEPHONE2",    label: "Telefon 2",            group: "İletişim" },
      { field: "ADDR1",         label: "Adres Satır 1",        group: "Adres" },
      { field: "ADDR2",         label: "Adres Satır 2",        group: "Adres" },
      { field: "CITY",          label: "Şehir",                group: "Adres" },
      { field: "COUNTRY",       label: "Ülke",                 group: "Adres" },
      { field: "POSTCODE",      label: "Posta Kodu",           group: "Adres" },
      { field: "TAXOFFICEDESC", label: "Vergi Dairesi",        group: "Vergi" },
      { field: "TAXNR",         label: "Vergi No",             group: "Vergi" },
      { field: "CLIENTTYPE",    label: "Cari Tipi",            group: "Sınıflandırma" },
      { field: "PAYMENTTERM",   label: "Ödeme Vadesi (gün)",   group: "Finansal" },
      { field: "CREDITLIMIT",   label: "Kredi Limiti",         group: "Finansal" },
    ],
  },
  SiparisModel: {
    label: "Sipariş Modeli",
    fields: [
      { field: "DOCDATE",       label: "Sipariş Tarihi",       group: "Genel" },
      { field: "DOCNO",         label: "Belge No",             group: "Genel" },
      { field: "INTERNALCODE", label: "İç Referans",           group: "Genel" },
      { field: "CLIENTCODE",   label: "Cari Kodu",             group: "Cari" },
      { field: "CLIENTNAME",   label: "Cari Adı",              group: "Cari" },
      { field: "TELNR",        label: "Telefon",               group: "Cari" },
      { field: "FACTORYNR",    label: "Depo No",               group: "Depo" },
      { field: "PAYMENTTERM",  label: "Ödeme Vadesi",          group: "Finansal" },
    ],
  },
  FaturaModel: {
    label: "Fatura Modeli",
    fields: [
      { field: "DOCDATE",       label: "Fatura Tarihi",        group: "Genel" },
      { field: "DOCTYPE",       label: "Fatura Tipi",          group: "Genel" },
      { field: "DOCNO",         label: "Fatura No",            group: "Genel" },
      { field: "CLIENTCODE",    label: "Cari Kodu",            group: "Cari" },
      { field: "CLIENTNAME",    label: "Cari Adı",             group: "Cari" },
      { field: "TCKN",          label: "TCKN",                 group: "Cari" },
      { field: "TAXOFFICEDESC", label: "Vergi Dairesi",        group: "Cari" },
      { field: "ADDR1",         label: "Fatura Adresi",        group: "Adres" },
      { field: "CITY",          label: "Şehir",                group: "Adres" },
      { field: "TOTAL",         label: "Toplam Tutar",         group: "Finansal" },
      { field: "VATAMT",        label: "KDV Tutarı",           group: "Finansal" },
    ],
  },
  IrsaliyeModel: {
    label: "İrsaliye Modeli",
    fields: [
      { field: "DOCDATE",       label: "İrsaliye Tarihi",      group: "Genel" },
      { field: "DOCNO",         label: "İrsaliye No",          group: "Genel" },
      { field: "CLIENTCODE",    label: "Cari Kodu",            group: "Cari" },
      { field: "CLIENTNAME",    label: "Cari Adı",             group: "Cari" },
      { field: "SHIPADRTYPE",   label: "Sevkiyat Adresi Türü", group: "Sevkiyat" },
      { field: "FACTORYNR",     label: "Depo No",              group: "Depo" },
    ],
  },
  SatinAlmaModel: {
    label: "Satın Alma Modeli",
    fields: [
      { field: "DOCDATE",       label: "Sipariş Tarihi",       group: "Genel" },
      { field: "DOCNO",         label: "Belge No",             group: "Genel" },
      { field: "VENDORCODE",    label: "Tedarikçi Kodu",       group: "Tedarikçi" },
      { field: "VENDORNAME",    label: "Tedarikçi Adı",        group: "Tedarikçi" },
      { field: "PAYMENTTERM",   label: "Ödeme Vadesi",         group: "Finansal" },
    ],
  },
};

export const PALETTE_CATEGORIES = [
  "Tetikleyiciler",
  "Dönüştürme",
  "Harici Servisler",
  "Koşullar",
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
    desc: "Dış sistemden gelen JSON isteğini alır, workflow'u başlatır",
    configSchema: [
      { key: "endpoint", label: "Endpoint Yolu", type: "text", defaultValue: "/api/incoming/cari" },
      { key: "method", label: "HTTP Method", type: "select", options: ["POST", "PUT", "PATCH"], defaultValue: "POST" },
      { key: "authRequired", label: "API Key Zorunlu", type: "boolean", defaultValue: true },
      {
        key: "samplePayload", label: "Örnek Payload (bilgi)", type: "code",
        defaultValue: '{\n  "name": "Ahmet Yılmaz",\n  "tckn": "12345678901",\n  "email": "ahmet@firma.com",\n  "phone": "05321234567"\n}',
      },
    ],
  },

  trigger_ecommerce: {
    label: "E-Ticaret Siparişi",
    category: "Tetikleyiciler",
    colorKey: "blue",
    icon: ShoppingCart,
    desc: "Yeni e-ticaret siparişi gelince tetiklenir",
    configSchema: [
      { key: "platform", label: "Platform", type: "select", options: ["Trendyol", "Hepsiburada", "Amazon", "N11", "Shopify"], defaultValue: "Trendyol" },
      { key: "statusFilter", label: "Sipariş Durumu", type: "text", defaultValue: "Yeni" },
    ],
  },

  trigger_b2b: {
    label: "B2B Sipariş",
    category: "Tetikleyiciler",
    colorKey: "blue",
    icon: Building2,
    desc: "B2B portal üzerinden sipariş alındığında tetiklenir",
    configSchema: [
      { key: "source", label: "Kaynak Sistem", type: "text", defaultValue: "B2B Portal" },
    ],
  },

  trigger_scheduled: {
    label: "Zamanlanmış Tetik",
    category: "Tetikleyiciler",
    colorKey: "blue",
    icon: Clock,
    desc: "Cron ifadesine göre otomatik periyodik çalışır",
    configSchema: [
      { key: "cron", label: "Cron İfadesi", type: "text", defaultValue: "*/5 * * * *" },
      { key: "timezone", label: "Zaman Dilimi", type: "select", options: ["Europe/Istanbul", "UTC"], defaultValue: "Europe/Istanbul" },
    ],
  },

  trigger_manual: {
    label: "Manuel Tetik",
    category: "Tetikleyiciler",
    colorKey: "blue",
    icon: Play,
    desc: "Kullanıcı tarafından UI veya API ile başlatılır",
    configSchema: [
      { key: "allowedRoles", label: "İzin Verilen Roller", type: "text", defaultValue: "tenant_admin" },
    ],
  },

  // ═══ DÖNÜŞTÜRME ═══════════════════════════════════════════════════════

  transform_mapping: {
    label: "Alan Eşleştirme",
    category: "Dönüştürme",
    colorKey: "violet",
    icon: Database,
    desc: "Gelen JSON alanlarını hedef veri modeline dönüştürür",
    configSchema: [
      { key: "targetModel", label: "Hedef Model", type: "select", options: ["CariModel", "SiparisModel", "FaturaModel", "IrsaliyeModel", "SatinAlmaModel"], defaultValue: "CariModel" },
    ],
  },

  transform_validate: {
    label: "Doğrulama Kontrolleri",
    category: "Dönüştürme",
    colorKey: "violet",
    icon: CheckCircle2,
    desc: "Modelin zorunlu alanlarını ve formatlarını kontrol eder",
    configSchema: [
      { key: "stopOnError", label: "Hata Durumunda Workflow'u Durdur", type: "boolean", defaultValue: true },
      {
        key: "rules", label: "Doğrulama Kuralları (alan : kural)", type: "textarea",
        defaultValue: "DEFINITION   : required\nEMAILADDR    : email_format\nTCKN         : length:11\nCLIENTCODE   : required",
      },
    ],
  },

  transform_merge: {
    label: "Yanıtı Modele Aktar",
    category: "Dönüştürme",
    colorKey: "violet",
    icon: RefreshCw,
    desc: "Harici servis yanıtını mevcut veri modeline birleştirir",
    configSchema: [
      { key: "strategy", label: "Birleştirme Stratejisi", type: "select", options: ["OVERWRITE", "MERGE_IF_EMPTY", "APPEND"], defaultValue: "MERGE_IF_EMPTY" },
      {
        key: "fieldMappings", label: "Yanıt Alanı → Model Alanı", type: "textarea",
        defaultValue: "response.VERGI_DAIRESI → TAXOFFICEDESC\nresponse.MUSTERI_TURU  → CLIENTTYPE\nresponse.VKN_TCKN      → TCKN",
      },
    ],
  },

  // ═══ HARİCİ SERVİSLER ════════════════════════════════════════════════

  service_emukellef: {
    label: "E-Mükellef Sorgusu",
    category: "Harici Servisler",
    colorKey: "amber",
    icon: ShieldCheck,
    desc: "GİB e-Mükellef servisini çağırır, mükellef bilgisi döner",
    configSchema: [
      { key: "identityField", label: "TCKN / VKN (model alanı)", type: "text", defaultValue: "{{model.TCKN}}" },
      { key: "endpoint", label: "Servis Endpoint", type: "text", defaultValue: "https://efatura.gov.tr/mukellef/sorgu" },
      { key: "apiKey", label: "API Key (config değişkeni)", type: "text", defaultValue: "{{config.mukellefApiKey}}" },
      { key: "timeout", label: "Timeout (ms)", type: "text", defaultValue: "5000" },
      { key: "onError", label: "Hata Durumunda", type: "select", options: ["DEVAM_ET", "WORKFLOW_DUR", "VARSAYILAN_KULLAN"], defaultValue: "DEVAM_ET" },
    ],
  },

  service_http: {
    label: "Özel HTTP Çağrısı",
    category: "Harici Servisler",
    colorKey: "amber",
    icon: Globe,
    desc: "Özelleştirilebilir bir HTTP endpoint'ini çağırır",
    configSchema: [
      { key: "url", label: "URL", type: "text", defaultValue: "https://api.example.com/resource" },
      { key: "method", label: "Method", type: "select", options: ["GET", "POST", "PUT", "PATCH", "DELETE"], defaultValue: "POST" },
      { key: "authType", label: "Auth Tipi", type: "select", options: ["NONE", "BEARER", "API_KEY", "BASIC"], defaultValue: "BEARER" },
      { key: "authValue", label: "Token / Key Kaynağı", type: "text", defaultValue: "{{config.externalApiToken}}" },
      { key: "bodyTemplate", label: "Request Body Şablonu", type: "code", defaultValue: '{\n  "input": "{{model.TCKN}}"\n}' },
    ],
  },

  // ═══ KOŞULLAR ════════════════════════════════════════════════════════

  condition_if: {
    label: "Koşul Dallanması",
    category: "Koşullar",
    colorKey: "amber",
    icon: GitBranch,
    desc: "Bir koşula göre iki farklı yola ayrılır (Evet / Hayır)",
    configSchema: [
      { key: "condition", label: "Koşul İfadesi", type: "text", defaultValue: "{{response.isVatPayer}} == true" },
      { key: "trueBranch", label: "Evet Dalı Etiketi", type: "text", defaultValue: "Mükellef" },
      { key: "falseBranch", label: "Hayır Dalı Etiketi", type: "text", defaultValue: "Mükellef Değil" },
    ],
  },

  condition_filter: {
    label: "Filtre",
    category: "Koşullar",
    colorKey: "amber",
    icon: Filter,
    desc: "Kriterleri karşılamayan kayıtları dışarıda bırakır",
    configSchema: [
      { key: "expression", label: "Filtre İfadesi", type: "text", defaultValue: "{{model.EMAILADDR}} != null" },
    ],
  },

  condition_wait: {
    label: "Bekleme",
    category: "Koşullar",
    colorKey: "amber",
    icon: Clock,
    desc: "Belirtilen süre kadar bekler, sonraki adıma geçer",
    configSchema: [
      { key: "duration", label: "Süre (ms)", type: "text", defaultValue: "2000" },
    ],
  },

  // ═══ AGENT & ÇIKIŞ ═══════════════════════════════════════════════════

  agent_request: {
    label: "Agent İsteği",
    category: "Agent & Çıkış",
    colorKey: "emerald",
    icon: Server,
    desc: "Yerel Agent'a generic AgentRequest<T> gönderir. dataType discriminator ile işlem tipi belirlenir.",
    configSchema: [
      {
        key: "dataType", label: "Data Tipi  ( T  discriminator )", type: "select",
        options: ["CARI_CREATE", "CARI_UPDATE", "SALES_INVOICE", "PURCHASE_INVOICE", "WAYBILL_OUT", "WAYBILL_IN", "SALES_ORDER", "PURCHASE_ORDER"],
        defaultValue: "CARI_CREATE",
      },
      { key: "agentEndpoint", label: "Agent Endpoint URL", type: "text", defaultValue: "http://localhost:5050/api/process" },
      { key: "authType", label: "Güvenlik Tipi", type: "select", options: ["BEARER_TOKEN", "API_KEY", "HMAC_SHA256"], defaultValue: "BEARER_TOKEN" },
      { key: "tokenSource", label: "Token Kaynağı (config)", type: "text", defaultValue: "{{config.agentBearerToken}}" },
      {
        key: "__schema__", label: "📐 AgentRequest<T>  —  Gönderilen Model Yapısı", type: "readonly",
        defaultValue: `AgentRequest<T> {
  dataType  : "CARI_CREATE"    ← hangi işlemi yapacak?
  tenantId  : "t1"             ← tenant kimliği
  payload   : T                ← CariModel | FaturaModel | …
  timestamp : "2026-03-05T…"  ← ISO-8601 istek zamanı
  signature : "sha256-hmac"   ← HMAC-SHA256(payload + secret)
}`,
      },
    ],
  },

  dest_logo_erp: {
    label: "Logo ERP'ye İlet",
    category: "Agent & Çıkış",
    colorKey: "emerald",
    icon: Server,
    desc: "Logo Tiger/GO REST API ile doğrudan iletişim kurar",
    configSchema: [
      { key: "erpEndpoint", label: "ERP Endpoint", type: "text", defaultValue: "{{config.logoErpUrl}}/api/v1" },
      { key: "operation", label: "İşlem", type: "select", options: ["INSERT", "UPDATE", "DELETE", "QUERY"], defaultValue: "INSERT" },
    ],
  },

  dest_email: {
    label: "E-Posta Bildir",
    category: "Agent & Çıkış",
    colorKey: "emerald",
    icon: Mail,
    desc: "Bildirim veya hata e-postası gönderir",
    configSchema: [
      { key: "to", label: "Alıcı (To)", type: "text", defaultValue: "{{config.notifyEmail}}" },
      { key: "subject", label: "Konu", type: "text", defaultValue: "Workflow: {{workflow.name}}" },
      { key: "template", label: "Şablon", type: "select", options: ["BASARILI", "HATA", "UYARI", "ÖZET"], defaultValue: "BASARILI" },
    ],
  },

  dest_webhook: {
    label: "Webhook Tetikle",
    category: "Agent & Çıkış",
    colorKey: "emerald",
    icon: Zap,
    desc: "Dış sisteme HTTP POST webhook gönderir",
    configSchema: [
      { key: "url", label: "Webhook URL", type: "text", defaultValue: "https://hooks.example.com/nexus" },
      { key: "secret", label: "Webhook Secret", type: "text", defaultValue: "{{config.webhookSecret}}" },
    ],
  },

  dest_log: {
    label: "Log Kaydet",
    category: "Agent & Çıkış",
    colorKey: "emerald",
    icon: AlertTriangle,
    desc: "Workflow yürütme kaydını entegrasyon loguna yazar",
    configSchema: [
      { key: "level", label: "Log Seviyesi", type: "select", options: ["INFO", "WARNING", "ERROR"], defaultValue: "INFO" },
      { key: "message", label: "Mesaj Şablonu", type: "text", defaultValue: "{{workflow.name}}: {{model.DEFINITION}} işlendi" },
    ],
  },

  // ═══ ÖZEL BİLEŞENLER ════════════════════════════════════════════════
  // Her bileşen: inputs[] → iş mantığı → returnType belirtilen çıkış

  custom_cari_check: {
    label: "Cari Var mı?",
    category: "Özel Bileşenler",
    colorKey: "teal",
    icon: UserCheck,
    desc: "E-posta adresine göre carininin sistemde kayıtlı olup olmadığını kontrol eder",
    inputs: [
      { key: "email", label: "E-posta Adresi", type: "string", required: true },
    ],
    returnType: "bool",
    outputLabels: { true: "Evet (Mevcut)", false: "Hayır (Yeni)" },
    responseModel: "CariCheckResponse",
    configSchema: [
      { key: "endpoint", label: "Servis Endpoint", type: "text", defaultValue: "{{config.agentUrl}}/api/cari/exists" },
      { key: "__response__", label: "Dönen Model (CariCheckResponse)", type: "readonly",
        defaultValue: "CariCheckResponse {\n  exists  : bool    ← cari mevcut mu?\n  cariId  : string  ← mevcut ise cari kodu\n  name    : string  ← cari adı\n}" },
    ],
  },

  custom_cari_lookup: {
    label: "Cari Getir",
    category: "Özel Bileşenler",
    colorKey: "teal",
    icon: Search,
    desc: "Cari koduna göre cari detaylarını getirir",
    inputs: [
      { key: "cariCode", label: "Cari Kodu", type: "string", required: true },
    ],
    returnType: "object",
    outputLabels: { output: "CariModel" },
    responseModel: "CariModel",
    configSchema: [
      { key: "endpoint", label: "Servis Endpoint", type: "text", defaultValue: "{{config.agentUrl}}/api/cari/get" },
    ],
  },

  custom_email_validate: {
    label: "E-posta Doğrula",
    category: "Özel Bileşenler",
    colorKey: "teal",
    icon: Mail,
    desc: "E-posta formatı ve MX kaydı geçerliliğini doğrular",
    inputs: [
      { key: "email", label: "E-posta", type: "string", required: true },
    ],
    returnType: "bool",
    outputLabels: { true: "Geçerli", false: "Geçersiz" },
    configSchema: [],
  },

  custom_send_notification: {
    label: "Bildirim Gönder",
    category: "Özel Bileşenler",
    colorKey: "teal",
    icon: Bell,
    desc: "Belirtilen alıcıya e-posta bildirimi gönderir",
    inputs: [
      { key: "recipient", label: "Alıcı E-posta", type: "string", required: true },
      { key: "subject",   label: "Konu",         type: "string", required: true },
      { key: "body",      label: "İçerik",       type: "string", required: false },
    ],
    returnType: "bool",
    outputLabels: { true: "Gönderildi", false: "Hata" },
    configSchema: [
      { key: "smtpHost",  label: "SMTP Host",  type: "text", defaultValue: "{{config.smtpHost}}" },
      { key: "smtpPort",  label: "SMTP Port",  type: "text", defaultValue: "587" },
    ],
  },

  custom_invoice_create: {
    label: "Fatura Oluştur",
    category: "Özel Bileşenler",
    colorKey: "teal",
    icon: Puzzle,
    desc: "Gelen sipariş modelinden Agent aracılığıyla fatura oluşturur",
    inputs: [
      { key: "orderModel", label: "Sipariş Modeli", type: "SiparisModel", required: true },
      { key: "cariCode",   label: "Cari Kodu",     type: "string",      required: true },
    ],
    returnType: "object",
    outputLabels: { output: "FaturaResponse" },
    responseModel: "FaturaResponse",
    configSchema: [
      { key: "dataType",  label: "Agent Data Tipi", type: "select", options: ["SALES_INVOICE", "PURCHASE_INVOICE"], defaultValue: "SALES_INVOICE" },
      { key: "authToken", label: "Agent Token",     type: "text",   defaultValue: "{{config.agentBearerToken}}" },
    ],
  },

  // ─── Cari Kontrol ────────────────────────────────────────────────────
  // Bu bileşen gerçek bir sorgu yapmaz.
  // Amacı: Agent isteğine "cariKontrolEdilecekMi: true" bayrağı eklemektir.
  // Agent bu bayrağa bakarak cari kontrolünü kendi üstlenir.
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
};
