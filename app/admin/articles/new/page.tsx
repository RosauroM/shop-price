"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/providers";
import { saveArticle, resizeImage } from "@/lib/storage";
import { applyVat, formatCurrency } from "@/lib/pricing";
import { ShopLogo } from "@/app/components/ShopLogo";

export default function NewArticlePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/admin");
  }, [loading, user, router]);

  const [form, setForm] = useState({
    name: "",
    slogan: "",
    netPrice: "",
    salesPrice: "",
    vatRatio: "19",
  });
  const [imageUrl, setImageUrl] = useState<string>("");
  const [error, setError] = useState("");

  if (loading || !user) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const net = parseFloat(form.netPrice);
    const sales = parseFloat(form.salesPrice);
    const vat = parseFloat(form.vatRatio);

    if (!form.name.trim()) return setError("Article name is required.");
    if (isNaN(net) || net < 0) return setError("Net price must be a positive number.");
    if (isNaN(sales) || sales < 0) return setError("Sales price must be a positive number.");
    if (isNaN(vat) || vat < 0) return setError("VAT ratio must be a positive number.");
    if (sales < net) return setError("Sales price cannot be lower than Net price.");

    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);

    await saveArticle({
      id,
      name: form.name.trim(),
      slogan: form.slogan.trim() || undefined,
      imageUrl: imageUrl || undefined,
      netPrice: net,
      salesPrice: sales,
      vatRatio: vat,
      discounts: [],
    });

    router.push("/admin/dashboard");
  };

  const previewSales = parseFloat(form.salesPrice);
  const previewVat = parseFloat(form.vatRatio);
  const previewNet = parseFloat(form.netPrice);
  const hasValidSales = !isNaN(previewSales) && previewSales >= 0;
  const hasValidNet = !isNaN(previewNet) && previewNet >= 0;
  
  const grossPrice = hasValidSales && !isNaN(previewVat) 
    ? applyVat(previewSales, previewVat) 
    : null;
    
  const margin = hasValidSales && hasValidNet ? previewSales - previewNet : null;
  const marginPct = margin !== null && hasValidSales && previewSales > 0 
    ? (margin / previewSales) * 100 
    : null;

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col relative selection:bg-blue-500/30 selection:text-blue-200 font-sans">
      {/* Global Ambient Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0" 
        style={{
          background: `
            radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.08), transparent 50%),
            radial-gradient(circle at 85% 30%, rgba(168, 85, 247, 0.08), transparent 50%),
            radial-gradient(circle at 50% 100%, rgba(6, 182, 212, 0.08), transparent 50%)
          `
        }}
      />

      {/* ── Header ── */}
      <header className="bg-black/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 transition-all duration-300">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShopLogo size="md" />
            <Link
              href="/admin/dashboard"
              className="font-bold text-white text-lg tracking-tight uppercase hover:text-gray-300 transition-colors"
            >
              PREMIA
            </Link>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border border-white/10 px-2 py-0.5 rounded-sm">
              Admin
            </span>
          </div>
        </div>
      </header>

      {/* ── Sub-header ── */}
      <div className="border-b border-white/5 bg-white/[0.02] relative z-10">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 h-14 flex items-center gap-2.5 text-xs font-medium uppercase tracking-widest">
          <Link href="/admin/dashboard" className="text-gray-500 hover:text-white transition-colors">
            Articles
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-gray-300">New Article</span>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="border-b border-white/5 relative z-10 bg-transparent">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 pt-8 pb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-px w-8 bg-blue-500/40" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400">New Article</span>
          </div>
          <h1 className="font-extrabold text-3xl text-white tracking-tight">
            Add to Collection
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">
            Configure identity, image, pricing, and tax for a new article.
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <main className="flex-1 relative z-10">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

            {/* ── Form ── */}
            <div className="lg:col-span-2 space-y-6">
              {error && (
                <div className="flex items-start gap-3 border border-red-500/30 bg-red-500/10 text-red-400 px-5 py-4 text-sm rounded-xl shadow-lg">
                  <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identity */}
                <FormSection title="Identity">
                  <Field label="Article Name" required name="name" value={form.name} onChange={handleChange} placeholder="e.g. Cashmere Overcoat" />
                  <Field label="Slogan" name="slogan" value={form.slogan} onChange={handleChange} placeholder="e.g. Effortless warmth, redefined" />
                </FormSection>

                {/* Image */}
                <FormSection title="Product Image">
                  <ImageUpload imageUrl={imageUrl} onChange={setImageUrl} />
                </FormSection>

                {/* Pricing */}
                <FormSection title="Pricing">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Net Price ($)" required hint="Your cost — floor for all discounts" name="netPrice" value={form.netPrice} onChange={handleChange} type="number" placeholder="0.00" min="0" step="0.01" />
                    <Field label="Sales Price ($)" required hint="Regular price shown to customers" name="salesPrice" value={form.salesPrice} onChange={handleChange} type="number" placeholder="0.00" min="0" step="0.01" />
                  </div>
                </FormSection>

                {/* Tax */}
                <FormSection title="Tax">
                  <div className="max-w-[180px]">
                    <Field label="VAT Rate (%)" required name="vatRatio" value={form.vatRatio} onChange={handleChange} type="number" placeholder="19" min="0" step="0.1" />
                  </div>
                </FormSection>

                {/* Actions */}
                <div className="flex items-center gap-5 pt-4">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wide px-8 py-3.5 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Save Article
                  </button>
                  <Link href="/admin/dashboard" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
                    Cancel
                  </Link>
                </div>
              </form>
            </div>

            {/* ── Live preview ── */}
            <div className="lg:col-span-1 lg:sticky lg:top-[7.5rem]">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Preview</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                {/* Image preview area */}
                <div className="relative h-56 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center overflow-hidden">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_60%,rgba(255,255,255,0.05),transparent)]" />
                      <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center relative bg-white/5">
                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                        </svg>
                      </div>
                    </>
                  )}
                  {imageUrl && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  )}
                </div>

                <div className="p-5 border-b border-white/5 bg-white/[0.02]">
                  <p className="font-bold text-lg text-white min-h-[1.75rem] tracking-tight">
                    {form.name || (
                      <span className="text-gray-500 font-medium italic text-sm">Article name</span>
                    )}
                  </p>
                  {form.slogan ? (
                    <p className="text-[13px] text-gray-400 mt-1">{form.slogan}</p>
                  ) : (
                    <p className="text-[13px] italic text-gray-600 mt-1">Slogan</p>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  <PreviewRow label="Sales Price" value={hasValidSales ? formatCurrency(previewSales) : "—"} />
                  <PreviewRow
                    label={`Incl. ${!isNaN(previewVat) ? previewVat : 0}% VAT`}
                    value={grossPrice !== null ? formatCurrency(grossPrice) : "—"}
                    variant="price"
                  />
                  {margin !== null && margin >= 0 && marginPct !== null && (
                    <PreviewRow
                      label="Gross Margin"
                      value={`${formatCurrency(margin)} (${marginPct.toFixed(1)}%)`}
                      variant="positive"
                    />
                  )}
                </div>

                {grossPrice !== null && (
                  <div className="px-5 py-3.5 border-t border-white/5 bg-blue-500/5">
                    <p className="text-[10px] text-blue-400 font-bold text-center uppercase tracking-widest">
                      Updates as you type
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Image upload ──────────────────────────────────────────────────────────────

function ImageUpload({ imageUrl, onChange }: { imageUrl: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setProcessing(true);
    const resized = await resizeImage(file);
    onChange(resized);
    setProcessing(false);
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        ref={fileRef}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        className="hidden"
      />

      {imageUrl ? (
        <div className="relative border border-white/10 rounded-xl overflow-hidden group/img shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Article" className="w-full h-56 object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/60 backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover/img:opacity-100">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="bg-white text-black text-[11px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-full hover:bg-gray-200 transition-all duration-200"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="bg-black/50 text-white border border-white/20 text-[11px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-full hover:bg-black/80 transition-all duration-200"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          disabled={processing}
          className={`w-full border border-dashed rounded-xl h-44 flex flex-col items-center justify-center gap-4 transition-all duration-200 ${
            dragging
              ? "border-blue-500 bg-blue-500/10"
              : "border-white/20 hover:border-blue-500/50 hover:bg-blue-500/5 bg-zinc-900/30"
          } ${processing ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
        >
          {processing ? (
            <div className="w-6 h-6 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1">
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-300">
                  {dragging ? "Drop image here" : "Click to upload or drag & drop"}
                </p>
                <p className="text-[11px] text-gray-500 mt-1.5 font-medium">JPG, PNG, WEBP · Auto-resized to 900px</p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Form helpers ──────────────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-6">{title}</h2>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function PreviewRow({ label, value, variant }: { label: string; value: string; variant?: "price" | "positive" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className={`text-sm font-bold tabular-nums tracking-tight ${
        variant === "price"    ? "text-emerald-400" :
        variant === "positive" ? "text-blue-400"    :
        "text-white"
      }`}>
        {value}
      </span>
    </div>
  );
}

function Field({
  label, required, hint, name, value, onChange, type = "text", placeholder, min, step,
}: {
  label: string; required?: boolean; hint?: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; placeholder?: string; min?: string; step?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
        {label}
        {required && <span className="ml-1.5 text-blue-500">*</span>}
      </label>
      <input
        name={name} value={value} onChange={onChange} type={type}
        placeholder={placeholder} min={min} step={step}
        className="w-full bg-black/50 border border-white/10 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-300 placeholder:text-gray-600"
      />
      {hint && <p className="mt-2 text-[11px] text-gray-500 font-medium">{hint}</p>}
    </div>
  );
}