"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getAllArticles, getAllCategories } from "@/lib/storage";
import {
  getEffectivePrice,
  getActiveDiscount,
  applyVat,
  formatCurrency,
  toDateString,
} from "@/lib/pricing";
import type { Article, Category } from "@/lib/types";
import { ShopLogo } from "@/app/components/ShopLogo";

export default function StorefrontPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(6);
  const searchRef = useRef<HTMLInputElement>(null);
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => setSentinelEl(node), []);
  const today = toDateString(new Date());

  useEffect(() => {
    async function loadData() {
      const [articlesData, categoriesData] = await Promise.all([
        getAllArticles(),
        getAllCategories()
      ]);
      setArticles(articlesData);
      setCategories(categoriesData);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  // Reset display limit when filters change
  useEffect(() => {
    setDisplayLimit(6);
  }, [searchQuery, selectedCategory]);

  const filteredArticles = articles.filter((a) => {
    const matchesSearch = searchQuery
      ? a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.slogan?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      : true;

    const matchesCategory =
      selectedCategory === "All" ? true : a.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const displayedArticles = filteredArticles.slice(0, displayLimit);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayLimit((prev) => prev + 6);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [sentinelEl]);

  const dateLabel = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

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
        <div className="max-w-6xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between gap-6">

          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <ShopLogo size="md" />
            <span className="font-bold text-white text-lg tracking-tight">
              PREMIA
            </span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-10">
            <a href="/" className="text-sm font-medium tracking-wide text-gray-400 hover:text-white transition-colors duration-200">
              Home
            </a>
            <a href="#products" className="text-sm font-medium tracking-wide text-gray-400 hover:text-white transition-colors duration-200">
              Collections
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-xs font-medium text-gray-400 hover:text-white transition-colors">Admin</a>
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className={`p-2 transition-colors duration-200 ${searchOpen ? "text-blue-400" : "text-gray-400 hover:text-white"}`}
              aria-label="Search"
            >
              <SearchIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Search bar — outside header, conditionally rendered */}
      {searchOpen && (
        <div className="sticky top-16 z-20 bg-black/60 backdrop-blur-xl border-b border-white/5 animate-fade-in">
          <div className="max-w-6xl mx-auto px-6 sm:px-10 h-14 flex items-center gap-4">
            <SearchIcon className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles by name or description…"
              className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-600 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors shrink-0"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setSearchOpen(false)}
              className="text-gray-500 hover:text-white transition-colors shrink-0"
            >
              <XIcon />
            </button>
          </div>
        </div>
      )}

      {/* ── Hero (hidden while searching) ── */}
      {!searchQuery && (
        <section className="relative z-10 overflow-hidden border-b border-white/5 bg-transparent flex items-center justify-center min-h-[70vh]">
          {/* Glowing Background Orbs */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 py-24 sm:py-36 text-center flex flex-col items-center">
            <div className="inline-flex items-center gap-3 mb-8 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md animate-fade-in-up">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs font-medium tracking-wide text-gray-300">
                New Collection
              </span>
            </div>
            
            <h1 className="font-extrabold text-5xl sm:text-7xl lg:text-8xl text-white leading-[1.1] tracking-tighter mb-8 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              Elevate Your <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 text-transparent bg-clip-text">
                Everyday Lifestyle
              </span>
            </h1>
            
            <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-xl mx-auto mb-12 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              Discover curated products with transparent pricing, live discounts, and VAT included — absolute clarity, no surprises.
            </p>
            
            <a
              href="#products"
              className="inline-flex items-center justify-center gap-3 bg-white text-black text-sm font-bold px-8 py-4 rounded-full hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 transition-all duration-300 shrink-0 animate-fade-in-up"
              style={{ animationDelay: "300ms" }}
            >
              Shop the Collection
              <ArrowRightIcon />
            </a>
          </div>
        </section>
      )}

      {/* ── Products ── */}
      <main className="flex-1 relative z-10" id="products">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-14 sm:py-18">

          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-6 flex-1 min-w-0">
              <span className="text-sm font-medium tracking-wide text-gray-400 shrink-0">
                {searchQuery
                  ? `${filteredArticles.length} result${filteredArticles.length !== 1 ? "s" : ""} for "${searchQuery}"`
                  : selectedCategory !== "All"
                  ? `${filteredArticles.length} Article${filteredArticles.length !== 1 ? "s" : ""} in ${selectedCategory}`
                  : "All Articles"}
              </span>
              <div className="flex-1 h-px bg-white/5" />
              {!searchQuery && (
                <span className="text-sm text-gray-500 tracking-wide shrink-0">
                  {filteredArticles.length} {filteredArticles.length === 1 ? "piece" : "pieces"} · {dateLabel}
                </span>
              )}
            </div>

            {/* Category Dropdown */}
            {categories.length > 0 && (
              <div className="relative shrink-0">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 text-white text-sm font-medium pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                >
                  <option value="All" className="bg-zinc-900">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name} className="bg-zinc-900">{c.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {filteredArticles.length === 0 ? (
            searchQuery ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-px w-12 bg-white/10 mb-8 mx-auto" />
                <p className="text-xl font-bold text-white mb-2 tracking-tight">No results found</p>
                <p className="text-sm text-gray-500">
                  Try searching for a different name or description.
                </p>
              </div>
            ) : (
              <StorefrontEmpty />
            )
          ) : (
            <div className="flex flex-col items-center">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {displayedArticles.map((article) => (
                  <ProductCard
                    key={article.id}
                    article={article}
                    today={today}
                  />
                ))}
              </div>
              
              {/* Sentinel Element for Infinite Scroll */}
              {displayLimit < filteredArticles.length && (
                <div ref={sentinelRef} className="mt-12 mb-4 flex justify-center w-full">
                  <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      Loading more...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 relative z-10 bg-black/40 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShopLogo size="sm" />
            <div>
              <p className="text-sm font-bold text-white tracking-tight">PREMIA</p>
              <p className="text-xs text-gray-500 mt-0.5">Premium articles, transparent pricing.</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Premia &nbsp;·&nbsp; All prices include VAT
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ article, today }: { article: Article; today: string }) {
  const discount = getActiveDiscount(article, today);
  const effectivePrice = getEffectivePrice(article, today);
  const grossPrice = applyVat(effectivePrice, article.vatRatio);
  const isDiscounted = effectivePrice < article.salesPrice;
  const discountPct = isDiscounted
    ? Math.round(((article.salesPrice - effectivePrice) / article.salesPrice) * 100)
    : 0;

  return (
    <div className="group bg-zinc-900/50 border border-white/10 hover:border-white/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-1 transition-all duration-500 flex flex-col relative overflow-hidden rounded-2xl backdrop-blur-sm cursor-pointer" onClick={() => window.location.href = `/articles/${article.id}`}>
      {/* Image area */}
      <div className={`relative h-72 overflow-hidden ${article.imageUrl ? "" : `bg-gradient-to-br from-zinc-800 to-zinc-950`}`}>
        {article.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl}
            alt={article.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full relative overflow-hidden bg-zinc-900 group-hover:scale-105 transition-transform duration-500">
            <div className="absolute inset-0 opacity-40 mix-blend-screen" style={{
              background: `
                radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.4), transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.4), transparent 50%)
              `
            }} />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm flex items-center justify-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10" />
                <ProductIcon />
              </div>
            </div>
          </div>
        )}
        {article.imageUrl && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        )}
        {isDiscounted && (
          <div className="absolute top-4 left-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold px-3 py-1 rounded-full tracking-wide shadow-lg backdrop-blur-md border border-white/20">
            Save {discountPct}%
          </div>
        )}
        {discount && (
          <div className="absolute bottom-4 right-4 border border-white/20 text-[11px] text-gray-300 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full shadow-lg">
            Ends{" "}
            {new Date(discount.endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg text-white leading-snug group-hover:text-blue-400 transition-colors duration-200 tracking-tight">
            {article.name}
          </h3>
          {article.stock > 0 ? (
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
              In Stock: {article.stock}
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full shrink-0">
              Out of Stock
            </span>
          )}
        </div>
        
        {article.slogan ? (
          <p className="text-[13px] text-gray-400 mb-4 leading-relaxed">{article.slogan}</p>
        ) : (
          <div className="mb-4" />
        )}

        {/* Price */}
        <div className="mt-auto">
          {isDiscounted ? (
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-2xl font-bold tabular-nums text-white leading-none tracking-tight">
                {formatCurrency(effectivePrice)}
              </span>
              <span className="text-sm text-gray-500 line-through tabular-nums">
                {formatCurrency(article.salesPrice)}
              </span>
            </div>
          ) : (
            <p className="text-2xl font-bold tabular-nums text-white leading-none mb-1 tracking-tight">
              {formatCurrency(article.salesPrice)}
            </p>
          )}
          <p className="text-[12px] text-gray-500 tabular-nums">
            incl. {article.vatRatio}% VAT:{" "}
            <span className="text-gray-300 font-medium">{formatCurrency(grossPrice)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function StorefrontEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center mb-6 text-gray-400 bg-white/5">
        <ShopLogo size="md" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
        Collection Coming Soon
      </h3>
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
        Our curated collection is being prepared. Check back soon.
      </p>
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function ProductIcon() {
  return (
    <svg className="w-8 h-8 text-blue-400/80 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4 text-gray-500 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}