import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, X, Box,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";

// ─── Sabitler ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = "ng_models_v1";

const FIELD_TYPES = [
  { value: "string",   label: "string"      },
  { value: "number",   label: "number"      },
  { value: "boolean",  label: "boolean"     },
  { value: "date",     label: "date"        },
  { value: "datetime", label: "datetime"    },
  { value: "array",    label: "array [ ]"   },
  { value: "object",   label: "object { }"  },
];

const TYPE_BADGE = {
  string:   "bg-blue-50 text-blue-700 border-blue-200",
  number:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  boolean:  "bg-amber-50 text-amber-700 border-amber-200",
  date:     "bg-purple-50 text-purple-700 border-purple-200",
  datetime: "bg-violet-50 text-violet-700 border-violet-200",
  array:    "bg-orange-50 text-orange-700 border-orange-200",
  object:   "bg-rose-50 text-rose-700 border-rose-200",
};

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

const newField = () => ({
  id: uid(),
  name: "",
  type: "string",
  itemType: "string",
  required: false,
  description: "",
  fields: [],
  expanded: true,
});

const newModel = () => ({
  id: uid(),
  name: "",
  description: "",
  fields: [],
});

function loadModels() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// ─── TypeBadge ────────────────────────────────────────────────────────────────
function TypeBadge({ type, itemType }) {
  const text = type === "array" ? `array<${itemType ?? "string"}>` : type;
  return (
    <span className={cn(
      "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap",
      TYPE_BADGE[type] ?? "bg-slate-50 text-slate-600 border-slate-200"
    )}>
      {text}
    </span>
  );
}

// ─── FieldRow (özyinelemeli her satır) ────────────────────────────────────────
function FieldRow({ field, depth, onChange, onDelete }) {
  const isObject = field.type === "object";
  const isArray  = field.type === "array";
  const arrOfObj = isArray && field.itemType === "object";
  const hasNested = isObject || arrOfObj;

  const update = (patch) => onChange({ ...field, ...patch });

  const handleTypeChange = (type) => {
    update({ type, fields: [], expanded: type === "object" });
  };

  const handleItemTypeChange = (itemType) => {
    update({ itemType, fields: [], expanded: itemType === "object" });
  };

  return (
    <div className={cn(
      "rounded-lg border",
      depth === 0 ? "border-border bg-white" : "border-slate-200 bg-slate-50/80"
    )}>
      {/* ── Ana satır ── */}
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        {/* Genişlet */}
        {hasNested ? (
          <button
            type="button"
            onClick={() => update({ expanded: !field.expanded })}
            className="flex-shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            {field.expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <div className="w-5 flex-shrink-0" />
        )}

        {/* Alan adı */}
        <input
          className="min-w-0 flex-1 bg-transparent font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none"
          placeholder="alanAdi"
          value={field.name}
          onChange={(e) => update({ name: e.target.value })}
        />

        {/* Tip seçici */}
        <select
          className="rounded border border-border bg-white px-1.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={field.type}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Dizi eleman tipi */}
        {isArray && (
          <>
            <span className="flex-shrink-0 text-[10px] text-muted-foreground">of</span>
            <select
              className="rounded border border-border bg-white px-1.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={field.itemType}
              onChange={(e) => handleItemTypeChange(e.target.value)}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </>
        )}

        {/* Zorunlu */}
        <button
          type="button"
          onClick={() => update({ required: !field.required })}
          className={cn(
            "flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold transition-colors",
            field.required
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-600"
          )}
        >
          {field.required ? "zorunlu" : "opt"}
        </button>

        {/* Sil */}
        <button
          type="button"
          onClick={onDelete}
          className="flex-shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-red-500"
        >
          <X size={12} />
        </button>
      </div>

      {/* Açıklama satırı */}
      <div className="flex items-center gap-1.5 px-2.5 pb-1.5">
        <div className="w-5 flex-shrink-0" />
        <input
          className="min-w-0 flex-1 bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/35 focus:outline-none"
          placeholder="Açıklama (opsiyonel)"
          value={field.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </div>

      {/* İç içe alan editörü */}
      {hasNested && field.expanded && (
        <div className="px-3 pb-3">
          <div className="ml-5 border-l-2 border-slate-200 pl-3">
            <p className="py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
              {isObject ? "{ } İç Alanlar" : "[ ] Eleman Şeması"}
            </p>
            <FieldList
              fields={field.fields ?? []}
              onChange={(fields) => update({ fields })}
              depth={depth + 1}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FieldList ────────────────────────────────────────────────────────────────
function FieldList({ fields, onChange, depth = 0 }) {
  const add = () => onChange([...fields, newField()]);

  return (
    <div className="space-y-1.5">
      {fields.map((f) => (
        <FieldRow
          key={f.id}
          field={f}
          depth={depth}
          onChange={(updated) => onChange(fields.map((x) => (x.id === f.id ? updated : x)))}
          onDelete={() => onChange(fields.filter((x) => x.id !== f.id))}
        />
      ))}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-slate-400 hover:text-foreground"
      >
        <Plus size={12} />
        {depth === 0 ? "Alan ekle" : "İç alan ekle"}
      </button>
    </div>
  );
}

// ─── FieldPreview (kart içi önizleme) ────────────────────────────────────────
function FieldPreview({ field, depth = 0 }) {
  const isObject = field.type === "object";
  const isArray  = field.type === "array";
  const arrOfObj = isArray && field.itemType === "object";
  const hasNested = (isObject || arrOfObj) && field.fields?.length > 0;

  return (
    <>
      <div className={cn("flex items-center gap-1.5 py-0.5", depth > 0 && "ml-4")}>
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground">
          {field.name || <em className="text-muted-foreground/40 not-italic">(isimsiz)</em>}
          {field.required && <span className="ml-0.5 text-[10px] text-red-500">*</span>}
        </span>
        <TypeBadge type={field.type} itemType={field.itemType} />
      </div>
      {hasNested && field.fields.map((f) => (
        <FieldPreview key={f.id} field={f} depth={depth + 1} />
      ))}
    </>
  );
}

// ─── ModelEditorPanel ─────────────────────────────────────────────────────────
function ModelEditorPanel({ model, onSave, onClose }) {
  const [form, setForm] = useState(() =>
    model ? JSON.parse(JSON.stringify(model)) : newModel()
  );

  const canSave = form.name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 ml-auto flex h-full w-full max-w-[680px] flex-col bg-white shadow-2xl">
        {/* Başlık */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {model ? "Modeli Düzenle" : "Yeni Model"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Veri yapısını ve alanlarını tanımlayın
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* İçerik */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Model adı */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-foreground">
              Model Adı <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              className="w-full rounded-lg border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="BankaEkstresi"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <p className="text-[11px] text-muted-foreground">
              Önerilen: PascalCase — BankaEkstresi, SiparisDetay, IslemKaydi…
            </p>
          </div>

          {/* Açıklama */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-foreground">
              Açıklama
            </label>
            <textarea
              rows={2}
              className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Bu modelin ne için kullanıldığını açıklayın…"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          {/* Alanlar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Alanlar
              </label>
              <span className="text-[11px] text-muted-foreground">
                {form.fields.length} ana alan
              </span>
            </div>

            {/* Sütun başlıkları */}
            <div className="flex items-center gap-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50">
              <div className="w-5 flex-shrink-0" />
              <span className="flex-1">Alan Adı</span>
              <span>Tip</span>
            </div>

            <FieldList
              fields={form.fields}
              onChange={(fields) => setForm((p) => ({ ...p, fields }))}
            />

            {/* Örnek ipucu */}
            {form.fields.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Alanlar henüz eklenmedi.
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  <strong>object</strong> tipli alan ekleyerek iç içe yapı oluşturabilirsiniz.{" "}
                  <strong>array of object</strong> seçerek dizi modelleyebilirsiniz.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Alt butonlar */}
        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            İptal
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!canSave}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {model ? "Güncelle" : "Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Alan sayacı (iç içe dahil) ───────────────────────────────────────────────
function countFields(fields) {
  return fields.reduce(
    (n, f) => n + 1 + (f.fields?.length ? countFields(f.fields) : 0),
    0
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function ModelsPage() {
  const [models, setModels] = useState(loadModels);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // localStorage'a kaydet
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
    } catch {}
  }, [models]);

  const openNew = () => { setEditingModel(null); setPanelOpen(true); };
  const openEdit = (m) => { setEditingModel(m); setPanelOpen(true); };
  const closePanel = () => { setPanelOpen(false); setEditingModel(null); };

  const handleSave = (form) => {
    setModels((prev) =>
      editingModel
        ? prev.map((m) => (m.id === form.id ? form : m))
        : [...prev, form]
    );
    closePanel();
  };

  const handleDelete = (id) => {
    setModels((prev) => prev.filter((m) => m.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Sayfa başlığı */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Modeller</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Veri modellerinizi ve yapılarını tanımlayın. Workflow mapping'lerinde kullanılır.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          <Plus size={15} />
          Yeni Model
        </button>
      </div>

      {/* Boş durum */}
      {models.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Box size={26} className="text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Henüz model tanımlanmadı</h3>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Yapılarınızı buraya tanımlayın. Workflow mapping ve entegrasyonlarda kullanabilirsiniz.
          </p>
          <button
            onClick={openNew}
            className="mt-4 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            <Plus size={14} />
            İlk Modeli Oluştur
          </button>
        </div>
      )}

      {/* Model kartları */}
      {models.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {models.map((model) => {
            const total = countFields(model.fields);
            const requiredCount = model.fields.filter((f) => f.required).length;
            const isConfirm = deleteConfirm === model.id;

            return (
              <Card key={model.id} className="flex flex-col transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-2">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900">
                      <Box size={15} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate font-mono text-sm">{model.name}</CardTitle>
                      {model.description && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                          {model.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        onClick={() => openEdit(model)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Düzenle"
                      >
                        <Pencil size={13} />
                      </button>
                      {!isConfirm ? (
                        <button
                          onClick={() => setDeleteConfirm(model.id)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                          title="Sil"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(model.id)}
                            className="rounded bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white transition-colors hover:bg-red-600"
                          >
                            Sil
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="rounded px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted"
                          >
                            İptal
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 pt-0">
                  {/* Alan önizleme */}
                  <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-lg border border-border bg-slate-50/70 p-3">
                    {model.fields.length === 0 ? (
                      <p className="py-2 text-center text-xs italic text-muted-foreground">
                        Alan tanımlanmadı
                      </p>
                    ) : (
                      model.fields.map((f) => <FieldPreview key={f.id} field={f} />)
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span>
                      <span className="font-semibold text-foreground">{total}</span> alan
                    </span>
                    <span>
                      <span className="font-semibold text-foreground">{requiredCount}</span> zorunlu
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Editör paneli */}
      {panelOpen && (
        <ModelEditorPanel
          model={editingModel}
          onSave={handleSave}
          onClose={closePanel}
        />
      )}
    </div>
  );
}
