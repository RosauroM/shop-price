"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/providers";
import {
  getArticleById,
  saveArticle,
  deleteArticle,
  updateArticleImage,
  addDiscount,
  deleteDiscount,
  resizeImage,
  getAllCategories,
} from "@/lib/storage";
import { getEffectivePrice, getActiveDiscount, applyVat, formatCurrency, toDateString, classifyDiscount } from "@/lib/pricing";
import type { Article, Category } from "@/lib/types";
import { DiscountStatusBadge } from "@/app/components/Badge";
import { ShopLogo } from "@/app/components/ShopLogo";

export default function ManageArticlePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user, loading } = useAuth();

  const [article, setArticle] = useState<Article | undefined>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [date, setDate] = useState("");
  const [imgProcessing, setImgProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    slogan: "",
    netPrice: "",
    salesPrice: "",
    vatRatio: "",
    stock: "",
  });
  const [editError, setEditError] = useState("");

  const [discountForm, setDiscountForm] = useState({
    startDate: "",
    endDate: "",
    discountedPrice: "",
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/admin");
  }, [loading, user, router]);

  const reload = useCallback(async () => {
    const data = await getArticleById(id);
    setArticle(data);
  }, [id]);
  useEffect(() => {
    setDate(toDateString(new Date()));
    if (user) {
      reload();
      getAllCategories().then(setCategories);
    }
  }, [reload, user]);

  if (loading || !user) return null;
  if (!article) return <div className="p-8 text-white">Loading or Not Found...</div>;

  const handleEditClick = () => {
    setEditError("");
    setEditForm({
      name: article.name,
      category: article.category || "",
      slogan: article.slogan || "",
      netPrice: String(article.netPrice),
      salesPrice: String(article.salesPrice),
      vatRatio: String(article.vatRatio),
      stock: String(article.stock ?? 0),
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");

    const net = parseFloat(editForm.netPrice);
    const sales = parseFloat(editForm.salesPrice);
    const vat = parseFloat(editForm.vatRatio);
    const stockVal = parseInt(editForm.stock, 10);

    if (!editForm.name.trim()) return setEditError("Article name is required.");
    if (!editForm.category.trim()) return setEditError("Category is required.");
    if (isNaN(net) || net < 0) return setEditError("Net price must be a positive number.");
    if (isNaN(sales) || sales < 0) return setEditError("Sales price must be a positive number.");
    if (isNaN(vat) || vat < 0) return setEditError("VAT ratio must be a positive number.");
    if (sales < net) return setEditError("Sales price cannot be lower than Net price.");
    if (isNaN(stockVal) || stockVal < 0) return setEditError("Stock must be a positive number.");

    try {
      await saveArticle({
        ...article,
        name: editForm.name.trim(),
        category: editForm.category.trim(),
        slogan: editForm.slogan.trim() || null,
        netPrice: net,
        salesPrice: sales,
        vatRatio: vat,
        stock: stockVal,
      });
      setIsEditing(false);
      reload();
    } catch (err: any) {
      setEditError(err.message || "Failed to update article.");
    }
  };

  const activeDiscount = getActiveDiscount(article, date);
  const price = getEffectivePrice(article, date);
  const grossPrice = applyVat(price, article.vatRatio);
  const isCapped = activeDiscount !== undefined && activeDiscount.discountedPrice < article.netPrice;

  const sortedDiscounts = [...article.discounts].sort((a, b) => a.startDate.localeCompare(b.startDate));

  async function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setImgProcessing(true);
    const resized = await resizeImage(file);
    await updateArticleImage(id, resized || null);
    setImgProcessing(false);
    reload();
  }

  async function handleAddDiscount(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const { startDate, endDate, discountedPrice } = discountForm;
    if (!startDate || !endDate) return setFormError("Start and End dates are required.");
    if (startDate > endDate) return setFormError("Start date cannot be after End date.");
    const dp = parseFloat(discountedPrice);
    if (isNaN(dp) || dp < 0) return setFormError("Invalid discounted price.");

    // Check overlap
    const overlap = article!.discounts.some((d) => startDate <= d.endDate && endDate >= d.startDate);
    if (overlap) return setFormError("This period overlaps with an existing discount.");

    try {
      await addDiscount(id, {
        id: Date.now().toString(36),
        startDate,
        endDate,
        discountedPrice: dp,
      });

      setDiscountForm({ startDate: "", endDate: "", discountedPrice: "" });
      reload();
    } catch (err: any) {
      setFormError(err.message || "Failed to add discount.");
    }
  }

  const fmtDate = (dStr: string) =>
    new Date(dStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

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
        <div className="max-w-3xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
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
        <div className="max-w-3xl mx-auto px-6 sm:px-10 h-14 flex items-center gap-2.5 text-xs font-medium uppercase tracking-widest">
          <Link href="/admin/dashboard" className="text-gray-500 hover:text-white transition-colors">Articles</Link>
          <span className="text-gray-600">›</span>
          <span className="text-gray-300 truncate max-w-[200px]">{article.name}</span>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="border-b border-white/5 relative z-10 bg-transparent">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 pt-8 pb-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-px w-8 bg-blue-500/40" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400">Article</span>
              </div>
              <h1 className="font-extrabold text-3xl text-white leading-tight tracking-tight">{article.name}</h1>
              {article.slogan && (
                <p className="text-[13px] text-gray-400 mt-1.5">{article.slogan}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleEditClick}
                className="shrink-0 text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/80 border border-blue-500/30 px-4 py-2 rounded-full transition-all duration-200"
              >
                Edit Details
              </button>
              <button
                onClick={() => {
                  if (!confirm(`Permanently delete "${article.name}"?`)) return;
                  deleteArticle(id);
                  router.push("/admin/dashboard");
                }}
                className="shrink-0 text-xs font-bold uppercase tracking-widest text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/80 border border-red-500/30 px-4 py-2 rounded-full transition-all duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 sm:px-10 py-8 space-y-8 relative z-10 w-full">

        {/* ── Edit Form Modal ── */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
            <div className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full">
              <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-white">Edit Article Details</h2>
                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                {editError && (
                  <div className="mb-6 flex items-start gap-3 border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-3 text-sm rounded-xl">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {editError}
                  </div>
                )}
                <form id="editForm" onSubmit={handleSaveEdit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Article Name <span className="text-blue-500">*</span></label>
                      <input
                        type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Category <span className="text-blue-500">*</span></label>
                      <select
                        value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50 appearance-none"
                      >
                        <option value="" disabled className="text-gray-500">Select...</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.name} className="bg-zinc-900">{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Stock <span className="text-blue-500">*</span></label>
                      <input
                        type="number" min="0" step="1" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Slogan</label>
                      <input
                        type="text" value={editForm.slogan} onChange={(e) => setEditForm({ ...editForm, slogan: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Net Price <span className="text-blue-500">*</span></label>
                      <input
                        type="number" min="0" step="0.01" value={editForm.netPrice} onChange={(e) => setEditForm({ ...editForm, netPrice: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Sales Price <span className="text-blue-500">*</span></label>
                      <input
                        type="number" min="0" step="0.01" value={editForm.salesPrice} onChange={(e) => setEditForm({ ...editForm, salesPrice: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">VAT Rate (%) <span className="text-blue-500">*</span></label>
                      <input
                        type="number" min="0" step="0.1" value={editForm.vatRatio} onChange={(e) => setEditForm({ ...editForm, vatRatio: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  </div>
                </form>
              </div>
              <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-4">
                <button onClick={() => setIsEditing(false)} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors px-4 py-2">
                  Cancel
                </button>
                <button type="submit" form="editForm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wide px-6 py-2.5 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Product Image ── */}
        <section>
          <SectionLabel>Product Image</SectionLabel>
          <div className="mt-4">
            <input
              type="file"
              accept="image/*"
              ref={fileRef}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
              className="hidden"
            />
            {article.imageUrl ? (
              <div className="relative border border-white/10 rounded-2xl overflow-hidden group/img shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={article.imageUrl} alt={article.name} className="w-full h-64 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/60 backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover/img:opacity-100">
                  {imgProcessing ? (
                    <div className="w-6 h-6 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin" />
                  ) : (
                    <>
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="bg-white text-black text-[11px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-full hover:bg-gray-200 transition-all duration-200"
                      >
                        Change Image
                      </button>
                      <button
                        onClick={() => { updateArticleImage(id, undefined); reload(); }}
                        className="bg-black/50 text-white border border-white/20 text-[11px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-full hover:bg-black/80 transition-all duration-200"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={imgProcessing}
                className="w-full border border-dashed border-white/20 rounded-2xl h-40 flex flex-col items-center justify-center gap-3 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-200 cursor-pointer disabled:opacity-50 bg-zinc-900/30"
              >
                {imgProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-300">Click to upload image</p>
                    <p className="text-[11px] text-gray-500">JPG, PNG, WEBP · Auto-resized to 900px</p>
                  </>
                )}
              </button>
            )}
          </div>
        </section>

        {/* ── Specifications ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <SectionLabel>Specifications</SectionLabel>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
              {article.category || "Uncategorized"}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5 rounded-xl overflow-hidden border border-white/10">
            <StatCell label="Net Price"   value={formatCurrency(article.netPrice)} />
            <StatCell label="Sales Price" value={formatCurrency(article.salesPrice)} />
            <StatCell label="VAT Rate"    value={`${article.vatRatio}%`} />
            <StatCell label="Stock"       value={String(article.stock ?? 0)} />
          </div>
        </section>

        {/* ── Price on Date ── */}
        <section>
          <SectionLabel>Price on Date</SectionLabel>
          <div className="mt-4 bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            {/* Date picker row */}
            <div className="px-6 py-5 border-b border-white/5 flex flex-wrap items-center gap-4 bg-white/[0.02]">
              <div className="flex items-center gap-3 bg-black/50 border border-white/10 px-4 py-2.5 rounded-xl">
                <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer [color-scheme:dark]"
                />
              </div>
              {activeDiscount ? (
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Active Discount
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500/50" />
                  No Discount
                </span>
              )}
            </div>

            {/* Price display */}
            <div className="p-8 grid grid-cols-2 gap-6 sm:gap-10">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">Excl. VAT</p>
                <p className={`text-5xl font-extrabold tabular-nums leading-none tracking-tight ${activeDiscount ? "text-blue-400" : "text-white"}`}>
                  {formatCurrency(price)}
                </p>
                {isCapped ? (
                  <p className="mt-3 text-xs text-red-400 font-bold uppercase tracking-wide">Discount below net — floor applied</p>
                ) : activeDiscount ? (
                  <p className="mt-3 text-xs text-blue-400 font-medium tabular-nums bg-blue-500/10 inline-block px-2 py-1 rounded">
                    {formatCurrency(article.salesPrice - price)} off · ends {fmtDate(activeDiscount.endDate)}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">Incl. {article.vatRatio}% VAT</p>
                <p className="text-5xl font-extrabold tabular-nums leading-none text-emerald-400 tracking-tight">
                  {formatCurrency(grossPrice)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Discount Periods ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <SectionLabel>Discount Periods</SectionLabel>
            {sortedDiscounts.length > 0 && (
              <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">{sortedDiscounts.length} period{sortedDiscounts.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {sortedDiscounts.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl px-6 py-10 text-center mb-6 bg-zinc-900/30">
              <p className="text-sm text-gray-500 font-medium">No discount periods defined yet.</p>
            </div>
          ) : (
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden mb-6 shadow-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-black/20">
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-widest uppercase text-gray-500">Status</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-widest uppercase text-gray-500">Period</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold tracking-widest uppercase text-gray-500">Price</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold tracking-widest uppercase text-gray-500 hidden sm:table-cell">Saving</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedDiscounts.map((d) => {
                    const status = classifyDiscount(d, date);
                    const capped = d.discountedPrice < article.netPrice;
                    const effectiveP = Math.max(d.discountedPrice, article.netPrice);
                    const saving = !capped ? article.salesPrice - effectiveP : null;
                    return (
                      <tr key={d.id} className={`transition-colors ${status === "active" ? "bg-blue-500/5" : "hover:bg-white/[0.03]"}`}>
                        <td className="px-6 py-4"><DiscountStatusBadge status={status} /></td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-300 whitespace-nowrap">
                          {fmtDate(d.startDate)}<span className="mx-2 text-gray-600">–</span>{fmtDate(d.endDate)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold tabular-nums tracking-tight ${status === "active" ? "text-blue-400" : "text-gray-300"}`}>
                            {formatCurrency(d.discountedPrice)}
                          </span>
                          {capped && <span className="ml-2 text-[10px] font-bold uppercase text-red-400">floor</span>}
                        </td>
                        <td className="px-6 py-4 text-right hidden sm:table-cell text-xs font-medium tabular-nums text-gray-500">
                          {saving !== null && saving > 0 ? `${formatCurrency(saving)} off` : capped ? "net floor" : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={async () => { await deleteDiscount(id, d.id); reload(); }}
                            className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add discount form */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-6">
              Add Discount Period
            </h3>
            <form onSubmit={handleAddDiscount} className="space-y-6">
              {formError && (
                <div className="flex items-start gap-3 border border-red-500/30 bg-red-500/10 text-red-400 px-5 py-4 text-sm rounded-xl">
                  <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <DateField label="Start Date" value={discountForm.startDate} onChange={(v) => setDiscountForm((p) => ({ ...p, startDate: v }))} />
                <DateField label="End Date"   value={discountForm.endDate}   onChange={(v) => setDiscountForm((p) => ({ ...p, endDate: v }))} />
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Discounted Price ($)
                  </label>
                  <input
                    type="number" min="0" step="0.01"
                    value={discountForm.discountedPrice}
                    onChange={(e) => setDiscountForm((p) => ({ ...p, discountedPrice: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-black/50 border border-white/10 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-gray-600"
                  />
                  <p className="mt-2 text-[11px] text-gray-500 font-medium">
                    Floor: <span className="tabular-nums text-gray-300">{formatCurrency(article.netPrice)}</span>
                  </p>
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-white text-black text-xs font-bold uppercase tracking-widest px-6 py-3.5 rounded-full hover:bg-gray-200 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] w-full sm:w-auto"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Discount
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
      {children}
    </h2>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm px-6 py-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">{label}</p>
      <p className="text-2xl font-extrabold tabular-nums tracking-tight text-white leading-none">{value}</p>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">{label}</label>
      <input
        type="date" value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/50 border border-white/10 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer [color-scheme:dark]"
      />
    </div>
  );
}