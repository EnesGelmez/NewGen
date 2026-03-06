import { useState } from "react";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  X, Braces,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "../../components/ui/Card";

// ── Alan tip tanımları ────────────────────────────────────────────────────────
const FIELD_TYPES = [
  { value: "string",   label: "Metin (string)"        },
  { value: "number",   label: "Sayı (number)"          },
  { value: "boolean",  label: "Evet/Hayır (boolean)"   },
  { value: "date",     label: "Tarih (date)"           },
  { value: "datetime", label: "Tarih & Saat (datetime)" },
  { value: "array",    label: "Dizi [ ]"               },
  { value: "object",   label: "Nesne { }"              },
];

const TYPE_COLORS = {
  string:   "bg-blue-50 text-blue-700 border-blue-200",
  number:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  boolean:  "bg-amber-50 text-amber-700 border-amber-200",
  date:     "bg-purple-50 text-purple-700 border-purple-200",
  datetime: "bg-violet-50 text-violet-700 border-violet-200",
  array:    "bg-orange-50 text-orange-700 border-orange-200",
  object:   "bg-rose-50 text-rose-700 border-rose-200",
};

// ── Yardımcılar ───────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

const newField = () => ({
  id: uid(),
  name: "",
  type: "string",
  required: false,
  description: "",
  itemType: "string",   // type === "array" olduğunda dizi içeriği
  fields: [],           // type === "object" veya array<object> olduğunda iç alanlar
  expanded: false,      // iç alan editörü açık mı
});

const newClass = () => ({
  id: uid(),
  name: "",
  description: "",
  fields: [newField()],
});

// ── Tip Rozeti ────────────────────────────────────────────────────────────────
function TypeBadge({ type, itemType }) {
  const label = type === "array"
    ? `array<${itemType ?? "string"}>`
    : type;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold",
        TYPE_COLORS[type] ?? "bg-slate-50 text-slate-600 border-slate-200"
      )}
    >
      {label}
    </span>
  );
}

// ── Özyinelemeli Alan Editörü ─────────────────────────────────────────────────
function FieldEditor({ fields, onChange, depth = 0 }) {
  const add = () => onChange([...fields, newField()]);

  const update = (id, patch) =>
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const remove = (id) => onChange(fields.filter((f) => f.id !== id));

  const toggle = (id) =>
    onChange(fields.map((f) => (f.id === id ? { ...f, expanded: !f.expanded } : f)));

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-5 pl-3 border-l-2 border-slate-200")}>
      {fields.map((field) => {
        const isObj = field.type === "object";
        const isArr = field.type === "array";
        const itemIsObj = isArr && field.itemType === "object";
        const canExpand = isObj || itemIsObj;

        return (
          <div
            key={field.id}
            className={cn(
              "rounded-lg border border-border",
              depth === 0 ? "bg-white" : "bg-slate-50",
            )}
          >
            {/* ── Ana satır ── */}
            <div className="flex items-center gap-2 px-3 py-2">
              {/* Genişlet butonu */}
              {canExpand ? (
                <button
                  type="button"
                  onClick={() => toggle(field.id)}
                  className="flex-shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  title={field.expanded ? "Gizle" : "İç alanları göster"}
                >
                  {field.expanded
                    ? <ChevronDown size={14} />
                    : <ChevronRight size={14} />}
                </button>
              ) : (
                <div className="w-[18px] flex-shrink-0" />
              )}

              {/* Alan adı */}
              <input
                className="min-w-0 flex-1 bg-transparent font-mono text-sm placeholder:text-muted-foreground/40 focus:outline-none"
                placeholder="alanAdi"
                value={field.name}
                onChange={(e) => update(field.id, { name: e.target.value })}
              />

              {/* Tip seçici */}
              <select
                className="rounded border border-border bg-transparent px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={field.type}
                onChange={(e) =>
                  update(field.id, { type: e.target.value, expanded: false })
                }
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              {/* Dizi içerik tipi */}
              {isArr && (
                <select
                  className="rounded border border-border bg-transparent px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={field.itemType}
                  onChange={(e) =>
                    update(field.id, { itemType: e.target.value, expanded: false })
                  }
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              )}

              {/* Zorunlu */}
              <button
                type="button"
                title={field.required ? "Zorunlu — tıkla opsiyonel yap" : "Opsiyonel — tıkla zorunlu yap"}
                onClick={() => update(field.id, { required: !field.required })}
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
                onClick={() => remove(field.id)}
                className="flex-shrink-0 rounded p-1 text-muted-foreground hover:text-red-500 transition-colors"
                title="Alanı sil"
              >
                <X size={13} />
              </button>
            </div>

            {/* Açıklama */}
            <div className="flex items-center gap-2 px-3 pb-2">
              <div className="w-[18px] flex-shrink-0" />
              <input
                className="min-w-0 flex-1 bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/35 focus:outline-none"
                placeholder="Açıklama (opsiyonel)"
                value={field.description}
                onChange={(e) => update(field.id, { description: e.target.value })}
              />
            </div>

            {/* İç alan editörü */}
            {canExpand && field.expanded && (
              <div className="px-3 pb-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                  {isObj ? "Nesne alanları" : "Dizi eleman alanları"}
                </p>
                <FieldEditor
                  fields={field.fields ?? []}
                  onChange={(nested) => update(field.id, { fields: nested })}
                  depth={depth + 1}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Alan ekle */}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-slate-400 hover:text-foreground"
      >
        <Plus size={12} />
        Alan ekle{depth > 0 ? " (iç içe)" : ""}
      </button>
    </div>
  );
}

// ── Sınıf Editör Paneli (sağdan kayar) ───────────────────────────────────────
function ClassEditorPanel({ cls, onSave, onClose }) {
  const [form, setForm] = useState(() =>
    cls
      ? { ...cls, fields: JSON.parse(JSON.stringify(cls.fields)) }
      : newClass()
  );

  const canSave = form.name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Arka plan */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 ml-auto flex h-full w-full max-w-[600px] flex-col bg-white shadow-2xl">
        {/* Başlık */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {cls ? "Sınıfı Düzenle" : "Yeni Sınıf"}
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
          {/* Sınıf adı */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-foreground">
              Sınıf Adı <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              className="w-full rounded-lg border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="CariKontrolIstegi"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <p className="text-[11px] text-muted-foreground">
              PascalCase önerilir: SiparisDetay, CariIstegi…
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
              placeholder="Bu yapının ne için kullanıldığını açıklayın…"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>

          {/* Alanlar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Alanlar
              </label>
              <span className="text-[11px] text-muted-foreground">
                {form.fields.length} alan
              </span>
            </div>

            {/* Sütun başlıkları */}
            <div className="flex items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50">
              <div className="w-[18px] flex-shrink-0" />
              <span className="flex-1">Alan Adı</span>
              <span className="w-28 text-center">Tip</span>
              <span className="w-16 text-center">Zorunlu</span>
              <div className="w-5 flex-shrink-0" />
            </div>

            <FieldEditor
              fields={form.fields}
              onChange={(fields) => setForm((p) => ({ ...p, fields }))}
            />
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
            {cls ? "Güncelle" : "Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Alan önizleme (kart içi) ──────────────────────────────────────────────────
function FieldPreview({ field, depth = 0 }) {
  const isObj = field.type === "object";
  const isArr = field.type === "array";
  const hasNested =
    (isObj || (isArr && field.itemType === "object")) &&
    field.fields?.length > 0;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1.5 py-0.5",
          depth > 0 && "ml-4 text-muted-foreground"
        )}
      >
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground">
          {field.name || <span className="italic text-muted-foreground/50">(isimsiz)</span>}
          {field.required && (
            <span className="ml-0.5 text-[10px] text-red-500">*</span>
          )}
        </span>
        <TypeBadge type={field.type} itemType={field.itemType} />
      </div>
      {hasNested &&
        field.fields.map((f) => (
          <FieldPreview key={f.id} field={f} depth={depth + 1} />
        ))}
    </>
  );
}

// ── Alan sayısı (iç içe dahil) ───────────────────────────────────────────────
function countAllFields(fields) {
  return fields.reduce((n, f) => {
    n += 1;
    if (f.fields?.length) n += countAllFields(f.fields);
    return n;
  }, 0);
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
const STARTER_CLASSES = [
  {
    id: "cls-starter",
    name: "CariKontrolIstegi",
    description: "Cari kontrol isteği için örnek veri yapısı",
    fields: [
      {
        id: "f1", name: "cariKod", type: "string", required: true,
        description: "Sorgulanacak cari kodu veya referansı",
        itemType: "string", fields: [], expanded: false,
      },
      {
        id: "f2", name: "kontrolEdilecekMi", type: "boolean", required: false,
        description: "", itemType: "string", fields: [], expanded: false,
      },
      {
        id: "f3", name: "adresler", type: "array", required: false,
        description: "Cari adresleri listesi", itemType: "string",
        fields: [], expanded: false,
      },
    ],
  },
];

export default function SiniflarPage() {
  const [classes, setClasses] = useState(STARTER_CLASSES);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingCls, setEditingCls] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const openNew = () => {
    setEditingCls(null);
    setPanelOpen(true);
  };

  const openEdit = (cls) => {
    setEditingCls(cls);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingCls(null);
  };

  const handleSave = (form) => {
    setClasses((prev) =>
      editingCls
        ? prev.map((c) => (c.id === form.id ? form : c))
        : [...prev, form]
    );
    closePanel();
  };

  const handleDelete = (id) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Başlık */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Sınıflar</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Veri modellerinizi ve yapılarınızı tanımlayın. Workflow mapping'lerinde kullanılır.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          <Plus size={15} />
          Yeni Sınıf
        </button>
      </div>

      {/* Boş durum */}
      {classes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Braces size={26} className="text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Henüz sınıf tanımlanmadı</h3>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Yapılarınızı buraya tanımlayın. Workflow mapping'lerde ve entegrasyonlarda kullanabilirsiniz.
          </p>
          <button
            onClick={openNew}
            className="mt-4 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            <Plus size={14} />
            İlk Sınıfı Oluştur
          </button>
        </div>
      )}

      {/* Sınıf kartları */}
      {classes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((cls) => {
            const total = countAllFields(cls.fields);
            const requiredCount = cls.fields.filter((f) => f.required).length;
            const isConfirm = deleteConfirm === cls.id;

            return (
              <Card
                key={cls.id}
                className="flex flex-col transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-2">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900">
                      <Braces size={16} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate font-mono text-sm">
                        {cls.name}
                      </CardTitle>
                      {cls.description && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                          {cls.description}
                        </p>
                      )}
                    </div>
                    {/* Aksiyon butonları */}
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        onClick={() => openEdit(cls)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Düzenle"
                      >
                        <Pencil size={13} />
                      </button>
                      {!isConfirm ? (
                        <button
                          onClick={() => setDeleteConfirm(cls.id)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                          title="Sil"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(cls.id)}
                            className="rounded px-2 py-0.5 text-[11px] font-semibold text-white bg-red-500 transition-colors hover:bg-red-600"
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
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-slate-50/70 p-3 space-y-0.5">
                    {cls.fields.length === 0 ? (
                      <p className="py-2 text-center text-xs italic text-muted-foreground">
                        Alan tanımlanmadı
                      </p>
                    ) : (
                      cls.fields.map((f) => (
                        <FieldPreview key={f.id} field={f} />
                      ))
                    )}
                  </div>

                  {/* İstatistik */}
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

      {/* Editör Paneli */}
      {panelOpen && (
        <ClassEditorPanel
          cls={editingCls}
          onSave={handleSave}
          onClose={closePanel}
        />
      )}
    </div>
  );
}
