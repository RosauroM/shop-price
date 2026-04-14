"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getArticleById, getAllCategories } from "@/lib/storage";
import { getEffectivePrice, getActiveDiscount, applyVat, formatCurrency, toDateString } from "@/lib/pricing";
import type { Article, Category } from "@/lib/types";
import { ShopLogo } from "@/components/ShopLogo";

export default function CustomerArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<Article | undefined>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const today = toDateString(new Date());

  useEffect(() => {
    async function loadData() {
      const [articleData, categoriesData] = await Promise.all([
        getArticleById(id),
        getAllCategories()
      ]);
      if (!articleData) {
        router.replace("/");
      } else {
        setArticle(articleData);
        setCategories(categoriesData);
      }
      setLoading(false);
    }
    loadData();
  }, [id, router]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  if (!article) return null;

  const discount = getActiveDiscount(article, today);
  const effectivePrice = getEffectivePrice(article, today);
  const grossPrice = applyVat(effectivePrice, article.vatRatio);
  const isDiscounted = effectivePrice < article.salesPrice;
  const discountPct = isDiscounted
    ? Math.round(((article.salesPrice - effectivePrice) / article.salesPrice) * 100)
    : 0;

  return (
    <>
      {/* ── Sub-header for Back Navigation ── */}
      <div className="bg-white/[0.02] border-b border-white/5 sticky top-16 z-20">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 h-12 flex items-center justify-between gap-6">
          <Link
            href="/storefront/collection"
            className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Back to Collection
          </Link>
        </div>
      </div>

      {/* ── Main Product Display ── */}
      <main className="flex-1 relative z-10 flex items-center justify-center">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-12 lg:py-24 w-full">
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row">
            
            {/* Left: Image Area */}
            <div className="lg:w-1/2 relative min-h-[400px] lg:min-h-[600px] flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 overflow-hidden">
              {article.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={article.imageUrl}
                  alt={article.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute inset-0 opacity-40 mix-blend-screen" style={{
                    background: `
                      radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.4), transparent 50%),
                      radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.4), transparent 50%)
                    `
                  }} />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
                  <div className="w-32 h-32 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm flex items-center justify-center shadow-2xl relative overflow-hidden z-10">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10" />
                    <svg className="w-12 h-12 text-blue-400/80 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                    </svg>
                  </div>
                </div>
              )}
              {article.imageUrl && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              )}

              {/* Badges */}
              <div className="absolute top-6 left-6 flex flex-col gap-3">
                {isDiscounted && (
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wide shadow-lg backdrop-blur-md border border-white/20 w-fit">
                    Save {discountPct}%
                  </div>
                )}
                {discount && (
                  <div className="border border-white/20 text-xs text-gray-300 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full shadow-lg w-fit">
                    Ends{" "}
                    {new Date(discount.endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Product Details */}
            <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
              
              <div className="mb-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400 mb-2 block">
                  {categories.find(c => c.id === article.category)?.name || "Premium Article"}
                </span>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
                  {article.name}
                </h1>
              </div>

              {article.slogan && (
                <p className="text-lg text-gray-400 leading-relaxed mb-10">
                  {article.slogan}
                </p>
              )}

              <div className="mb-10">
                {isDiscounted ? (
                  <div className="flex items-end gap-4 mb-2">
                    <span className="text-5xl font-extrabold tabular-nums text-white tracking-tight leading-none">
                      {formatCurrency(effectivePrice)}
                    </span>
                    <span className="text-xl text-gray-500 line-through tabular-nums pb-1 font-medium">
                      {formatCurrency(article.salesPrice)}
                    </span>
                  </div>
                ) : (
                  <div className="text-5xl font-extrabold tabular-nums text-white tracking-tight leading-none mb-2">
                    {formatCurrency(article.salesPrice)}
                  </div>
                )}
                <p className="text-sm text-gray-500 font-medium">
                  includes {article.vatRatio}% VAT: <span className="text-emerald-400 font-bold">{formatCurrency(grossPrice)}</span>
                </p>
              </div>

              <div className="space-y-4">
                <button 
                  disabled={(article.stock ?? 0) <= 0}
                  className="w-full bg-white text-black font-bold py-4 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:bg-gray-200 hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-white disabled:hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:cursor-not-allowed"
                >
                  {(article.stock ?? 0) > 0 ? "Add to Cart" : "Out of Stock"}
                </button>
                <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500">
                  {(article.stock ?? 0) > 0 ? (
                    <>
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      In stock ({article.stock} available)
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Currently unavailable
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}