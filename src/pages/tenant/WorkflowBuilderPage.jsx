import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  X, Plus, Save, RotateCcw, Link2, Layers, ChevronDown,
  CheckCircle2, Zap, BookOpen, ChevronRight, Copy, Check,
  Info, Server, ArrowLeft,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import {
  NODE_TYPES, COLOR_MAP, getPaletteGroups, PALETTE_CATEGORIES,
} from "../../lib/workflowNodeTypes";
import { useWorkflowStore } from "../../store/workflowStore";

/* â”€â”€â”€â”€â”€â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€ */
const NODE_W = 230;
const HEADER_H = 36;
const BODY_PAD = 8;
const HANDLE_ROW_H = 28;

/* -------- Typed handle helpers -------- */
function getInputHandles(def) {
  if (def.inputs?.length) return def.inputs;
  return [{ key: "input", label: "", type: "any", required: false }];
}
function getOutputHandles(def) {
  if (def.returnType === "bool")
    return [
      { key: "true",  label: def.outputLabels?.true  ?? "Evet" },
      { key: "false", label: def.outputLabels?.false ?? "Hayır" },
    ];
  if (def.returnType)
    return [{ key: "output", label: def.outputLabels?.output ?? "Çıkış" }];
  return [{ key: "output", label: "" }];
}
function getNodeHeight(def) {
  const rows = Math.max(getInputHandles(def).length, getOutputHandles(def).length);
  return HEADER_H + BODY_PAD * 2 + rows * HANDLE_ROW_H;
}
// Y of handle-row center, relative to top of node
function handleRelY(rowIdx) {
  return HEADER_H + BODY_PAD + rowIdx * HANDLE_ROW_H + HANDLE_ROW_H / 2;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€ Workflow Templates â”€â”€â”€â”€â”€â”€â”€â”€ */
const TEMPLATES = {
  cari_create: {
    name: "Cari Oluşturma (Tam Akış)",
    desc: "HTTP JSON → Alan Eşleştirme → Doğrulama → e-Mükellef → Merge → Agent İsteği",
    nodes: [
      { id: "n1", type: "trigger_http_json", x: 40,   y: 160, config: { endpoint: "/api/incoming/cari" } },
      { id: "n2", type: "transform_mapping",  x: 300,  y: 160, config: { targetModel: "CariModel" } },
      { id: "n3", type: "transform_validate", x: 560,  y: 160, config: { stopOnError: true } },
      { id: "n4", type: "service_emukellef",  x: 820,  y: 60,  config: { identityField: "{{model.TCKN}}" } },
      { id: "n5", type: "transform_merge",    x: 1080, y: 60,  config: { strategy: "MERGE_IF_EMPTY" } },
      { id: "n6", type: "condition_if",       x: 820,  y: 260, config: { condition: "{{response.isVatPayer}} == true" } },
      { id: "n7", type: "agent_request",      x: 1080, y: 260, config: { dataType: "CARI_CREATE", authType: "BEARER_TOKEN" } },
      { id: "n8", type: "dest_log",           x: 1340, y: 160, config: { level: "INFO" } },
    ],
    connections: [
      { id: "c1", fromId: "n1", toId: "n2" },
      { id: "c2", fromId: "n2", toId: "n3" },
      { id: "c3", fromId: "n3", toId: "n4" },
      { id: "c4", fromId: "n3", toId: "n6" },
      { id: "c5", fromId: "n4", toId: "n5" },
      { id: "c6", fromId: "n5", toId: "n7" },
      { id: "c7", fromId: "n6", toId: "n7" },
      { id: "c8", fromId: "n7", toId: "n8" },
    ],
  },
  ecommerce_invoice: {
    name: "E-Ticaret â†’ Fatura",
    desc: "E-ticaret siparişini Invoice olarak Agent'a iletir",
    nodes: [
      { id: "n1", type: "trigger_ecommerce",  x: 40,  y: 160, config: { platform: "Trendyol" } },
      { id: "n2", type: "transform_mapping",  x: 300, y: 160, config: { targetModel: "FaturaModel" } },
      { id: "n3", type: "condition_filter",   x: 560, y: 160, config: {} },
      { id: "n4", type: "agent_request",      x: 820, y: 160, config: { dataType: "SALES_INVOICE" } },
      { id: "n5", type: "dest_email",         x: 1080, y: 80,  config: { template: "BASARILI" } },
      { id: "n6", type: "dest_log",           x: 1080, y: 240, config: { level: "INFO" } },
    ],
    connections: [
      { id: "c1", fromId: "n1", toId: "n2" },
      { id: "c2", fromId: "n2", toId: "n3" },
      { id: "c3", fromId: "n3", toId: "n4" },
      { id: "c4", fromId: "n4", toId: "n5" },
      { id: "c5", fromId: "n4", toId: "n6" },
    ],
  },
};

/* â”€â”€â”€â”€â”€â”€â”€â”€ "How to create a component" guide code â”€â”€â”€â”€â”€â”€â”€â”€ */
const GUIDE_CODE = `// Yeni bir ozel bileseni su sekilde eklenir:
// workflowNodeTypes.js dosyasina yeni bir entry ekleyin:

"custom_musteri_check": {
  label    : "Musteri Var mi?",
  category : "Ozel Bilesanler",
  colorKey : "teal",
  icon     : UserCheck,
  desc     : "Email adresine gore musteri kontrolu",

  // Workflow'dan baglanti ile gelen parametreler:
  inputs: [
    { key: "email", label: "E-posta", type: "string", required: true },
    // { key: "phone", label: "Telefon", type: "string", required: false },
  ],

  // Donus tipi: bool => Evet / Hayir cikisi, object => tek cikis
  returnType: "bool",
  outputLabels: { true: "Evet (Mevcut)", false: "Hayir (Yeni)" },

  // Zorunlu parametre baglanmadiysa node uzerinde kirmizi glow gorunur.
  // Boolean donus => 2 cikis noktasi (yesil=Evet, kirmizi=Hayir)

  // Sag panelde gorunen statik konfigurasyonlar:
  configSchema: [
    { key: "endpoint", label: "Servis URL", type: "text",
      defaultValue: "{{config.agentUrl}}/api/check" },
    { key: "timeout",  label: "Timeout (ms)", type: "text",
      defaultValue: "3000" },
  ],
},

// --- Calısma zamanı (backend) executor ornegi ---

async function executeCustomMusteriCheck(node, context) {
  // context.inputs  => { email: "..." }   baglantidan gelen degerler
  // context.config  => { endpoint, timeout } node konfigu
  // context.model   => guncel veri modeli

  const email = context.inputs.email;
  if (!email) throw new Error("email parametresi eksik");

  const resp = await fetch(context.config.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await resp.json();

  // returnType: "bool" => { result: true/false, model: {...} }
  return { result: data.exists, model: data };
}

// Workflow engine bu sonuca gore:
//   result === true  => "true"  handle uzerinden devam
//   result === false => "false" handle uzerinden devam
//   model            => sonraki nodlara aktarilir

// --- AgentRequest<T> gonderim yapisi ---

AgentRequest<T> {
  dataType  : "CARI_CREATE"    // hangi islem?
  tenantId  : "t1"
  payload   : T                // CariModel | FaturaModel | ...
  timestamp : ISO-8601
  signature : HMAC-SHA256(payload + secret)
}`;

/* â”€â”€â”€â”€â”€â”€â”€â”€ ConfigField: renders a single configSchema field â”€â”€â”€â”€â”€â”€â”€â”€ */
function ConfigField({ field, value, onChange }) {
  const current = value !== undefined ? value : field.defaultValue;

  if (field.type === "text") {
    return (
      <div>
        <label className="text-[11px] font-medium text-muted-foreground block mb-1">{field.label}</label>
        <input
          value={current ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <label className="text-[11px] font-medium text-muted-foreground block mb-1">{field.label}</label>
        <select
          value={current ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  if (field.type === "boolean") {
    const boolVal = current === true || current === "true";
    return (
      <div className="flex items-center justify-between py-0.5">
        <label className="text-[11px] font-medium text-muted-foreground leading-tight pr-2">{field.label}</label>
        <button
          onClick={() => onChange(field.key, !boolVal)}
          className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${boolVal ? "bg-primary" : "bg-muted-foreground/30"}`}
        >
          <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${boolVal ? "translate-x-4" : ""}`} />
        </button>
      </div>
    );
  }

  if (field.type === "textarea" || field.type === "code") {
    return (
      <div>
        <label className="text-[11px] font-medium text-muted-foreground block mb-1">{field.label}</label>
        <textarea
          value={current ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          rows={4}
          className={`w-full rounded-lg border border-input bg-background px-2.5 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed ${field.type === "code" ? "font-mono resize-y" : "resize-none"}`}
        />
      </div>
    );
  }

  if (field.type === "readonly") {
    return (
      <div>
        <label className="text-[11px] font-medium text-muted-foreground block mb-1">{field.label}</label>
        <pre className="w-full rounded-lg bg-slate-900 text-emerald-400 px-3 py-2.5 text-[10px] font-mono overflow-x-auto whitespace-pre leading-relaxed">
          {current}
        </pre>
      </div>
    );
  }

  return null;
}


/* -------- CanvasNode -------- */
function CanvasNode({ node, isSelected, connectMode, pendingFrom, connections, onNodeClick, onDelete, onStartDrag, onHandleClick }) {
  const def = NODE_TYPES[node.type];
  if (!def) return null;
  const colors = COLOR_MAP[def.colorKey];
  const Icon = def.icon;

  const inputHandles  = getInputHandles(def);
  const outputHandles = getOutputHandles(def);
  const rowCount = Math.max(inputHandles.length, outputHandles.length);
  const nodeH    = getNodeHeight(def);
  const isTyped  = !!(def.inputs?.length);

  const connectedInputKeys = new Set(
    connections.filter((c) => c.toId === node.id).map((c) => c.toHandle ?? "input")
  );
  const hasUnconnectedRequired = inputHandles.some((h) => h.required && !connectedInputKeys.has(h.key));
  const isSource = pendingFrom?.nodeId === node.id;

  const borderCls = hasUnconnectedRequired && !isSource
    ? "border-red-300 ring-2 ring-red-100"
    : isSource
    ? "border-primary ring-4 ring-primary/25 shadow-xl"
    : isSelected && !connectMode
    ? "border-primary ring-2 ring-primary/15 shadow-lg"
    : `${colors.nodeBorder} hover:shadow-lg`;

  return (
    <div
      style={{ left: node.x, top: node.y, width: NODE_W, height: nodeH, position: "absolute" }}
      className={`rounded-xl border-2 bg-white shadow-md select-none transition-all ${borderCls} ${connectMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
      onMouseDown={(e) => { if (connectMode) return; e.stopPropagation(); onStartDrag(e, node.id); }}
      onClick={(e) => { e.stopPropagation(); onNodeClick(node.id); }}
    >
      {/* Header */}
      <div style={{ height: HEADER_H }} className={`flex items-center gap-2 px-3 rounded-t-[10px] ${colors.headerBg}`}>
        <div className="h-5 w-5 flex items-center justify-center rounded bg-white/20 flex-shrink-0">
          <Icon size={11} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-white truncate flex-1">{def.label}</span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
          className="h-4 w-4 flex items-center justify-center rounded hover:bg-black/20 flex-shrink-0">
          <X size={9} className="text-white/80" />
        </button>
      </div>

      {/* Handle rows */}
      <div style={{ paddingTop: BODY_PAD, paddingBottom: BODY_PAD }}>
        {Array.from({ length: rowCount }).map((_, rowIdx) => {
          const inp = inputHandles[rowIdx];
          const out = outputHandles[rowIdx];
          const inpConnected = inp && connectedInputKeys.has(inp.key);
          const isActiveOut  = isSource && pendingFrom?.handle === out?.key;

          return (
            <div key={rowIdx} style={{ height: HANDLE_ROW_H }} className="relative flex items-center">
              {/* Input handle dot */}
              {inp && (
                <div
                  style={{ position: "absolute", left: -6, top: "50%", transform: "translateY(-50%)" }}
                  className={`w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 transition-all
                    ${inpConnected ? colors.iconBg : inp.required ? "bg-red-400 ring-2 ring-red-200" : "bg-slate-300"}
                    ${connectMode ? "hover:scale-125 cursor-crosshair" : ""}`}
                  onClick={(e) => { e.stopPropagation(); onHandleClick("input", node.id, inp.key); }}
                />
              )}

              {/* Row content */}
              <div className="px-5 flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
                {isTyped && inp ? (
                  <>
                    <span className="text-[10px] text-muted-foreground truncate">{inp.label}</span>
                    <span className={`text-[9px] font-mono px-1 rounded flex-shrink-0 ${colors.bg} ${colors.text}`}>{inp.type}</span>
                    {inp.required && !inpConnected && (
                      <span className="text-[9px] text-red-500 font-semibold flex-shrink-0">*</span>
                    )}
                  </>
                ) : rowIdx === 0 ? (
                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">{def.desc}</p>
                ) : null}
              </div>

              {/* Output label */}
              {out?.label && (
                <span className="absolute right-5 text-[9px] font-medium text-muted-foreground whitespace-nowrap">{out.label}</span>
              )}

              {/* Output handle dot */}
              {out && (
                <div
                  style={{ position: "absolute", right: -6, top: "50%", transform: "translateY(-50%)" }}
                  className={`w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 transition-all
                    ${isActiveOut ? "bg-primary ring-2 ring-primary/30 scale-125" : colors.iconBg}
                    ${connectMode ? "hover:scale-125 cursor-crosshair" : ""}`}
                  onClick={(e) => { e.stopPropagation(); onHandleClick("output", node.id, out.key); }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip when this node is active source */}
      {isSource && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg pointer-events-none">
          {pendingFrom?.handle ? `[${pendingFrom.handle}] -> giriş noktasına tıkla` : "Çıkış noktasına tıkla ->"}
        </div>
      )}
    </div>
  );
}

/* -------- SVG Connection Lines -------- */
function ConnectionLines({ nodes, connections, onDeleteConnection }) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <defs>
        <marker id="arr-default" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" opacity="0.8" />
        </marker>
        <marker id="arr-true" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" opacity="0.8" />
        </marker>
        <marker id="arr-false" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" opacity="0.8" />
        </marker>
      </defs>
      {connections.map((conn) => {
        const from = nodeMap[conn.fromId];
        const to = nodeMap[conn.toId];
        if (!from || !to) return null;
        const fromDef = NODE_TYPES[from.type];
        const toDef   = NODE_TYPES[to.type];
        if (!fromDef || !toDef) return null;

        const outHandles = getOutputHandles(fromDef);
        const inHandles  = getInputHandles(toDef);
        const outHandleKey = conn.fromHandle ?? "output";
        const inHandleKey  = conn.toHandle   ?? "input";
        const outRowIdx = Math.max(0, outHandles.findIndex((h) => h.key === outHandleKey));
        const inRowIdx  = Math.max(0, inHandles.findIndex((h)  => h.key === inHandleKey));

        const x1 = from.x + NODE_W + 6;
        const y1 = from.y + handleRelY(outRowIdx);
        const x2 = to.x - 6;
        const y2 = to.y + handleRelY(inRowIdx);
        const cp = Math.abs(x2 - x1) * 0.45 + 20;
        const d = `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`;

        const strokeColor = outHandleKey === "true" ? "#22c55e" : outHandleKey === "false" ? "#ef4444" : "#6366f1";
        const markerId    = outHandleKey === "true" ? "arr-true" : outHandleKey === "false" ? "arr-false" : "arr-default";

        return (
          <g key={conn.id} className="pointer-events-auto group">
            <path d={d} fill="none" stroke="transparent" strokeWidth={18}
              onClick={() => onDeleteConnection(conn.id)} style={{ cursor: "pointer" }} />
            <path d={d} fill="none" stroke={strokeColor} strokeWidth={2} strokeOpacity={0.7}
              markerEnd={`url(#${markerId})`}
              className="group-hover:stroke-red-400 group-hover:opacity-100 transition-colors" />
          </g>
        );
      })}
    </svg>
  );
}

/* -------- Template Selector Modal -------- */
function TemplateModal({ onClose, onSelect }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Hazır Şablondan Başla</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X size={15} className="text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 grid gap-3">
          {Object.entries(TEMPLATES).map(([key, tpl]) => (
            <button
              key={key}
              onClick={() => { onSelect(key); onClose(); }}
              className="flex items-center gap-4 rounded-xl border border-border p-4 text-left hover:bg-muted/40 hover:border-primary/40 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <Layers size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{tpl.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tpl.desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------- WebhookUrlBox: shown in trigger_http_json config panel -------- */
const WEBHOOK_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function WebhookUrlBox({ workflowId }) {
  const [copied, setCopied] = useState(false);
  const url = `${WEBHOOK_BASE}/api/v1/webhooks/${workflowId}`;
  const copy = () => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Server size={11} className="text-blue-600 flex-shrink-0" />
        <span className="text-[10px] font-semibold text-blue-700">Webhook URL</span>
        <span className="ml-auto text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full border border-blue-200">POST</span>
      </div>
      <div className="flex items-center gap-1">
        <code className="flex-1 text-[9px] font-mono text-blue-800 bg-white border border-blue-100 rounded px-1.5 py-1 truncate select-all">
          {url}
        </code>
        <button
          onClick={copy}
          className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded border border-blue-200 bg-white text-blue-600 hover:bg-blue-100 transition-colors"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
        </button>
      </div>
      <p className="text-[9px] text-blue-600 leading-snug">
        Dış sistem bu URL'i çağırır. Header: <code className="font-mono">X-API-Key: &lt;api-key&gt;</code>
      </p>
    </div>
  );
}

/* -------- Help / Component Guide Modal -------- */
function HelpModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(GUIDE_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Yeni Bileşeni Nasıl Eklersiniz?</h2>
              <p className="text-xs text-muted-foreground">Mimari rehber ve AgentRequest&lt;T&gt; açıklaması</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X size={15} className="text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { step: "1", title: "Node Tanimi", desc: "workflowNodeTypes.js'e yeni bir entry ekleyin. inputs[], returnType ve configSchema tanimlayin." },
              { step: "2", title: "Executor Yazin", desc: "Backend'de bu node type icin bir executor fonksiyon yazin. Context'i alip donusturup dondurur." },
              { step: "3", title: "Agent'a Gonder", desc: "Son adimda AgentRequest<T> ile yerel Agent'a gonderin. dataType discriminator ile islem secilir." },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-border p-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mb-2">{s.step}</div>
                <p className="text-xs font-semibold text-foreground">{s.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Server size={14} className="text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-700">AgentRequest&lt;T&gt; Genel Yapisi</p>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Agent'a her zaman ayni wrapper model ile gidilir.{" "}
              <code className="bg-emerald-100 px-1 rounded font-mono">dataType</code> alani discriminator gorevi gorur
              — Agent bu degere bakarak <code className="bg-emerald-100 px-1 rounded font-mono">payload: T</code>'yi hangi handler'la isleyecegini anlar.
            </p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-blue-600" />
              <p className="text-xs font-semibold text-blue-700">Sablon Degiskenleri</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {[
                ["{{model.ALAN}}", "Guncel veri modelindeki alan"],
                ["{{config.ANAHTAR}}", "Tenant konfigurasyon degeri (API key vs)"],
                ["{{response.ALAN}}", "Onceki adimin yanit verisi"],
                ["{{workflow.name}}", "Workflow adi"],
              ].map(([v, d]) => (
                <div key={v} className="flex items-start gap-2">
                  <code className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono flex-shrink-0">{v}</code>
            <span className="text-[11px] text-blue-700">{d}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground">Ornek Bileşeni Kodu</p>
              <button onClick={copy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? "Kopyalandı!" : "Kopyala"}
              </button>
            </div>
            <pre className="rounded-xl bg-slate-900 text-slate-100 px-4 py-4 text-[10.5px] font-mono leading-relaxed overflow-x-auto whitespace-pre">
              {GUIDE_CODE}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- Main Page -------- */
export default function WorkflowBuilderPage() {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const { getWorkflow, saveWorkflow, fetchWorkflows } = useWorkflowStore();

  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [connectMode, setConnectMode] = useState(false);
  const [pendingFrom, setPendingFrom] = useState(null); // { nodeId, handle } | null
  const [workflowName, setWorkflowName] = useState("Yeni Workflow");
  const [saved, setSaved] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState(
    () => Object.fromEntries(PALETTE_CATEGORIES.map((c) => [c, true]))
  );

  /* Load workflow – try store first, fallback to backend fetch */
  useEffect(() => {
    if (!workflowId) return;
    const wf = getWorkflow(workflowId);
    if (wf) {
      setWorkflowName(wf.name);
      setNodes(wf.nodes ?? []);
      setConnections(wf.connections ?? []);
      setSelectedNodeId(null); setPendingFrom(null); setConnectMode(false);
      return;
    }
    // Store empty (direct URL access) – fetch all and reload
    fetchWorkflows().then(() => {
      const reloaded = getWorkflow(workflowId);
      if (!reloaded) return;
      setWorkflowName(reloaded.name);
      setNodes(reloaded.nodes ?? []);
      setConnections(reloaded.connections ?? []);
    });
    setSelectedNodeId(null);
    setPendingFrom(null);
    setConnectMode(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  const canvasRef  = useRef(null);
  const draggingRef = useRef(null);

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { setConnectMode(false); setPendingFrom(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* -- Palette drag start -- */
  const handlePaletteDragStart = (e, nodeType) => {
    e.dataTransfer.setData("nodeType", nodeType);
    e.dataTransfer.effectAllowed = "copy";
  };

  /* -- Canvas drop → create node -- */
  const handleCanvasDrop = (e) => {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData("nodeType");
    if (!nodeType || !NODE_TYPES[nodeType]) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const def = NODE_TYPES[nodeType];
    const nh  = getNodeHeight(def);
    const x = Math.max(0, e.clientX - rect.left - NODE_W / 2);
    const y = Math.max(0, e.clientY - rect.top  - nh / 2);
    const newNode = { id: `n-${Date.now()}`, type: nodeType, x, y, config: {} };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setConnectMode(false);
    setPendingFrom(null);
  };

  /* -- Node drag (move existing node) -- */
  const handleNodeDragStart = useCallback((e, nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    draggingRef.current = {
      nodeId,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startNodeX: node.x,     startNodeY: node.y,
    };
    const onMouseMove = (mv) => {
      const d = draggingRef.current;
      if (!d) return;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === d.nodeId
            ? { ...n, x: Math.max(0, d.startNodeX + mv.clientX - d.startMouseX), y: Math.max(0, d.startNodeY + mv.clientY - d.startMouseY) }
            : n
        )
      );
    };
    const onMouseUp = () => {
      draggingRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [nodes]);

  /* -- Node body click: select (connect mode: ignore body clicks) -- */
  const handleNodeClick = useCallback((nodeId) => {
    if (!connectMode) setSelectedNodeId(nodeId);
  }, [connectMode]);

  /* -- Handle dot click: drive connections -- */
  const handleHandleClick = useCallback((type, nodeId, handleKey) => {
    if (type === "output") {
      // Clicking an output handle starts (or cancels) a pending connection
      if (!connectMode) setConnectMode(true);
      setPendingFrom((prev) =>
        prev?.nodeId === nodeId && prev?.handle === handleKey ? null : { nodeId, handle: handleKey }
      );
    } else if (type === "input") {
      // Clicking an input handle completes the connection
      if (!pendingFrom) return;
      if (pendingFrom.nodeId === nodeId) { setPendingFrom(null); return; }
      const alreadyExists = connections.some(
        (c) => c.fromId === pendingFrom.nodeId && c.fromHandle === pendingFrom.handle
             && c.toId === nodeId              && c.toHandle   === handleKey
      );
      if (!alreadyExists) {
        setConnections((prev) => [
          ...prev,
          { id: `c-${Date.now()}`, fromId: pendingFrom.nodeId, fromHandle: pendingFrom.handle, toId: nodeId, toHandle: handleKey },
        ]);
      }
      setPendingFrom(null);
      setConnectMode(false);
    }
  }, [connectMode, pendingFrom, connections]);

  /* -- Delete node + its connections -- */
  const handleDeleteNode = (nodeId) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setConnections((prev) => prev.filter((c) => c.fromId !== nodeId && c.toId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (pendingFrom?.nodeId === nodeId) setPendingFrom(null);
  };

  /* -- Delete connection -- */
  const handleDeleteConnection = (connId) => {
    setConnections((prev) => prev.filter((c) => c.id !== connId));
  };

  /* -- Update node config -- */
  const handleConfigChange = (nodeId, key, value) => {
    setNodes((prev) =>
      prev.map((n) => n.id === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n)
    );
  };

  /* -- Load template -- */
  const handleLoadTemplate = (key) => {
    const tpl = TEMPLATES[key];
    setNodes(tpl.nodes.map((n) => ({ ...n, config: { ...n.config } })));
    setConnections(tpl.connections.map((c) => ({ ...c })));
    setWorkflowName(tpl.name);
    setSelectedNodeId(null);
    setPendingFrom(null);
  };

  const handleClear = () => {
    setNodes([]); setConnections([]);
    setSelectedNodeId(null); setPendingFrom(null);
  };

  const handleSave = async () => {
    if (workflowId) {
      await saveWorkflow(workflowId, { name: workflowName, nodes, connections });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleCat = (cat) => setExpandedCats((p) => ({ ...p, [cat]: !p[cat] }));

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedDef  = selectedNode ? NODE_TYPES[selectedNode.type] : null;
  const paletteGroups = getPaletteGroups();

  return (
    <div className="flex overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>

      {/* -- Left Palette -- */}
      <aside className="flex flex-col w-56 flex-shrink-0 border-r border-border bg-white overflow-y-auto">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Bileşenler</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Canvas'a sürükle &amp; bırak</p>
        </div>
        <div className="flex-1 py-1">
          {paletteGroups.map((group) => {
            const nc = COLOR_MAP[group.nodes[0]?.colorKey || "blue"];
            const isExp = expandedCats[group.category];
            return (
              <div key={group.category}>
                <button
                  onClick={() => toggleCat(group.category)}
                  className="flex w-full items-center justify-between px-4 py-2 hover:bg-muted/40 transition-colors"
                >
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{group.category}</span>
                  <ChevronDown size={11} className={`text-muted-foreground transition-transform ${isExp ? "" : "-rotate-90"}`} />
                </button>
                {isExp && (
                  <div className="px-2 pb-2 space-y-1">
                    {(group.nodes || []).map((nodeDef) => {
                      const colors = COLOR_MAP[nodeDef.colorKey];
                      const Icon = nodeDef.icon;
                      return (
                        <div
                          key={nodeDef.type}
                          draggable
                          onDragStart={(e) => handlePaletteDragStart(e, nodeDef.type)}
                          title={nodeDef.desc}
                          className={`flex items-center gap-2 rounded-lg border ${colors.border} ${colors.bg} px-2.5 py-2 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all select-none`}
                        >
                          <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded ${colors.iconBg}`}>
                            <Icon size={10} className="text-white" />
                          </div>
                          <p className={`text-[11px] font-medium ${colors.text} truncate`}>{nodeDef.label}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* -- Center: Toolbar + Canvas -- */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-white flex-shrink-0">
          <button
            onClick={() => navigate("/tenant/workflows")}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={13} />
            Geri
          </button>
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-sm font-semibold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5 transition-colors w-48 min-w-0"
          />
          <div className="flex-1" />

          <button
            onClick={() => setHelpModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            <BookOpen size={13} />
            Rehber
          </button>

          <button
            onClick={() => setTemplateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            <Layers size={13} />
            Şablonlar
          </button>

          {/* Connect mode toggle */}
          <button
            onClick={() => { setConnectMode((m) => !m); setPendingFrom(null); }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              connectMode
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <Link2 size={13} />
            {connectMode
              ? pendingFrom ? "Giriş seç..." : "Çıkış seç..."
              : "Bağla"}
          </button>

          <button
            onClick={handleClear}
            disabled={nodes.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw size={13} />
            Temizle
          </button>

          <Button size="sm" onClick={handleSave} variant={saved ? "success" : "default"}>
            {saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
            {saved ? "Kaydedildi!" : "Kaydet"}
          </Button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Canvas */}
          <div
            ref={canvasRef}
            onDrop={handleCanvasDrop}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
            onClick={() => { if (!connectMode) { setSelectedNodeId(null); } else { setPendingFrom(null); } }}
            className="flex-1 relative overflow-auto bg-[radial-gradient(circle,_#e2e8f0_1px,_transparent_1px)] bg-[length:24px_24px]"
            style={{ minWidth: 900, minHeight: 500, cursor: connectMode ? "crosshair" : "default" }}
          >
            <ConnectionLines
              nodes={nodes}
              connections={connections}
              onDeleteConnection={handleDeleteConnection}
            />

            {/* Empty state */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 mb-4">
                  <Zap size={28} className="text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Canvas boş</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Soldan bileşeni sürüklEyin veya Şablonlar'dan başlayın
                </p>
              </div>
            )}

            {nodes.map((node) => (
              <CanvasNode
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                connectMode={connectMode}
                pendingFrom={pendingFrom}
                connections={connections}
                onNodeClick={handleNodeClick}
                onDelete={handleDeleteNode}
                onStartDrag={handleNodeDragStart}
                onHandleClick={handleHandleClick}
              />
            ))}
          </div>

          {/* -- Right: Properties Panel -- */}
          {selectedNode && selectedDef && !connectMode && (
            <div className="w-64 flex-shrink-0 border-l border-border bg-white overflow-y-auto">
              {/* Panel header */}
              <div className={`flex items-center gap-2 px-4 py-3 ${COLOR_MAP[selectedDef.colorKey].headerBg}`}>
                <div className="flex h-6 w-6 items-center justify-center rounded bg-white/20">
                  <selectedDef.icon size={12} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{selectedDef.label}</p>
                  <p className="text-[10px] text-white/70">{selectedDef.category}</p>
                </div>
              </div>

              {/* Config fields */}
              <div className="p-3 space-y-3">
                {(selectedDef.configSchema || []).map((field) => (
                  <ConfigField
                    key={field.key}
                    field={field}
                    value={selectedNode.config?.[field.key]}
                    onChange={(key, val) => handleConfigChange(selectedNode.id, key, val)}
                  />
                ))}

                {/* ── Webhook URL (shown when trigger_http_json is saved) ── */}
                {selectedNode.type === "trigger_http_json" && workflowId && (
                  <WebhookUrlBox workflowId={workflowId} />
                )}

                {/* ---- Input Parameters (for typed nodes) ---- */}
                {selectedDef.inputs?.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-2">Giriş Parametreleri</p>
                    {selectedDef.inputs.map((inp) => {
                      const conn = connections.find((c) => c.toId === selectedNode.id && c.toHandle === inp.key);
                      const srcNode = conn ? nodes.find((n) => n.id === conn.fromId) : null;
                      const srcDef  = srcNode ? NODE_TYPES[srcNode.type] : null;
                      return (
                        <div key={inp.key} className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
                          <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${conn ? "bg-emerald-400" : inp.required ? "bg-red-400" : "bg-slate-300"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-medium text-foreground">{inp.label}</p>
                            {conn ? (
                              <p className="text-[9px] text-emerald-600 truncate">
                                {srcDef?.label} [{conn.fromHandle}]
                              </p>
                            ) : (
                              <p className={`text-[9px] ${inp.required ? "text-red-500 font-medium" : "text-muted-foreground/60"}`}>
                                {inp.required ? "Bağlantı zorunlu" : "Opsiyonel"}
                              </p>
                            )}
                          </div>
                          <span className={`text-[9px] font-mono px-1 rounded mt-0.5 ${COLOR_MAP[selectedDef.colorKey].bg} ${COLOR_MAP[selectedDef.colorKey].text}`}>{inp.type}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ---- Output Handles (for bool/typed return) ---- */}
                {selectedDef.returnType && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-2">Çıkış Noktaları</p>
                    {getOutputHandles(selectedDef).map((out) => {
                      const outConns = connections.filter((c) => c.fromId === selectedNode.id && c.fromHandle === out.key);
                      return (
                        <div key={out.key} className="flex items-center gap-2 py-1">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${out.key === "true" ? "bg-emerald-400" : out.key === "false" ? "bg-red-400" : "bg-blue-400"}`} />
                          <span className="text-[10px] font-medium flex-1 truncate">{out.label || out.key}</span>
                          <span className="text-[9px] text-muted-foreground flex-shrink-0">
                            {outConns.length > 0 ? `${outConns.length} bağ.` : "boş"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Connections summary */}
                <div className="pt-2 border-t border-border">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-2">Bağlantılar</p>
                  {connections.filter((c) => c.fromId === selectedNode.id || c.toId === selectedNode.id).length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/60">Henüz bağlantı yok</p>
                  ) : (
                    <div className="space-y-1">
                      {connections
                        .filter((c) => c.fromId === selectedNode.id || c.toId === selectedNode.id)
                        .map((c) => {
                          const otherId  = c.fromId === selectedNode.id ? c.toId : c.fromId;
                          const otherNode = nodes.find((n) => n.id === otherId);
                          const otherDef  = otherNode ? NODE_TYPES[otherNode.type] : null;
                          const isOut     = c.fromId === selectedNode.id;
                          const handleLbl = isOut ? c.fromHandle : c.toHandle;
                          return (
                            <div key={c.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isOut ? "bg-primary" : "bg-slate-400"}`} />
                              {handleLbl && <span className="font-mono text-[9px] bg-muted px-1 rounded flex-shrink-0">{handleLbl}</span>}
                              <span className="truncate flex-1">{isOut ? "-> " : "<- "}{otherDef?.label || otherId}</span>
                              <button onClick={() => handleDeleteConnection(c.id)} className="hover:text-red-500 flex-shrink-0">
                                <X size={9} />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Delete node */}
                <button
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors mt-2"
                >
                  <X size={12} />
                  Bileşeni Sil
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-4 px-4 py-1.5 border-t border-border bg-muted/20 flex-shrink-0">
            <span className="text-[10px] text-muted-foreground">{nodes.length} bileşen · {connections.length} bağlantı</span>
          {connectMode && (
            <span className="text-[10px] text-primary font-semibold">
              ● Bağlantı modu{pendingFrom ? ` — giriş noktasına tıklayın` : ` — çıkış noktasına tıklayın`}
            </span>
          )}
          <div className="flex-1" />
          <span className="text-[10px] text-muted-foreground">Bağlantı silmek için ok üzerine tıkla · Esc ile modu kapat</span>
        </div>
      </div>

      {templateModalOpen && (
        <TemplateModal onClose={() => setTemplateModalOpen(false)} onSelect={handleLoadTemplate} />
      )}
      {helpModalOpen && <HelpModal onClose={() => setHelpModalOpen(false)} />}
    </div>
  );
}
