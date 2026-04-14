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
            <a href="/" className="text-sm font-medium tracking-wide text-white transition-colors duration-200">
              Home
            </a>
            <a href="/collection" className="text-sm font-medium tracking-wide text-gray-400 hover:text-white transition-colors duration-200">
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
        <section className="relative z-10 overflow-hidden border-b border-white/5 bg-transparent flex items-center justify-center min-h-screen">
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
              href="/collection"
              className="inline-flex items-center justify-center gap-3 bg-white text-black text-sm font-bold px-8 py-4 rounded-full hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-0.5 transition-all duration-300 shrink-0 animate-fade-in-up"
              style={{ animationDelay: "300ms" }}
            >
              Explore Collection
              <ArrowRightIcon />
            </a>
          </div>
        </section>
      )}

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

// Remove ProductCard since we moved it

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

// Removed ProductIcon and ArrowRightIcon as they are no longer needed
// SearchIcon remains
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
    <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}