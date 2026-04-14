"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/providers";
import { getAllCategories, deleteArticle, getAllArticlesIdsByCategory } from "@/lib/storage";
import { useArticlesPagination } from "@/hooks/useArticlesPagination";
import { useCategoryData } from "@/hooks/useCategoryData";
import { getEffectivePrice, getActiveDiscount, applyVat, formatCurrency, toDateString, getBasePriceOnDate, formatDateShort } from "@/lib/pricing";
import { buildCategoryTree, flattenCategoryTree, getCategoryDescendants } from "@/lib/categoryUtils";
import type { Article, Category } from "@/lib/types";
import { DateSelector } from "@/components/DateSelector";
import { StatusBadge } from "@/components/Badge";
import type { ArticleStatus } from "@/components/Badge";
import { ShopLogo } from "@/components/ShopLogo";
import type { User } from "@/app/providers";

export default function AdminDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState("");
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [sentinelEl, setSentinelEl] = useState<HTMLTableRowElement | null>(null);
  const sentinelRef = useCallback((node: HTMLTableRowElement | null) => setSentinelEl(node), []);
  const today = toDateString(new Date());

  const {
    articles,
    hasMore,
    isLoadingMore,
    totalCount,
    fetchInitialArticles,
    loadMoreArticles
  } = useArticlesPagination({
    limit: 20,
    categories,
    selectedCategory,
    searchQuery,
    date
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/admin");
  }, [loading, user, router]);

  const [dashboardStats, setDashboardStats] = useState({ active: 0, scheduled: 0, total: 0, avgNet: 0, avgSales: 0 });

  const { flattenedCategories, validCategoryIds } = useCategoryData({ categories, selectedCategory });

  const fetchDashboardData = useCallback(async () => {
    // We let the hook fetch the actual articles
    await fetchInitialArticles();
    
    // We still need to fetch stats for the dashboard header
    const catIdsToFetch = selectedCategory === "All" ? null : validCategoryIds;
    
    import("@/lib/storage").then(({ getDashboardStats }) => {
      getDashboardStats(date, catIdsToFetch).then(setDashboardStats);
    });
  }, [selectedCategory, validCategoryIds, date, fetchInitialArticles]);

  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  useEffect(() => {
    setDate(today);
    getAllCategories().then(cats => {
      setCategories(cats);
      setCategoriesLoaded(true);
    });
  }, [today]);

  useEffect(() => {
    if (categoriesLoaded) {
      fetchDashboardData();
    }
  }, [selectedCategory, categoriesLoaded, fetchDashboardData]);

  useEffect(() => {
    setDisplayLimit(20);
  }, [searchQuery, selectedCategory, date]);

  useEffect(() => {
    if (!sentinelEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMore) {
          loadMoreArticles();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [sentinelEl, isLoadingMore, hasMore, loadMoreArticles]);

  if (loading || !user) return null;

  const displayedArticles = articles;

  const activeCount = dashboardStats.active;
  const scheduledCount = dashboardStats.scheduled;

  const fmtDate = (dStr: string) => formatDateShort(dStr);

  return (
    <>
      {/* ── Sub-header: page title + New Article ── */}
      <div className="border-b border-white/5 bg-white/[0.02] relative z-10">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 h-14 flex items-center justify-between gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2.5 text-xs font-medium uppercase tracking-widest">
            <span className="text-gray-500">Dashboard</span>
            <span className="text-gray-600">›</span>
            <span className="text-gray-300">Articles</span>
          </div>
            {/* Actions */}
          <div className="flex items-center gap-3">
              <>
                <Link
                  href="/admin/articles/new"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wide px-5 py-2.5 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 transition-all duration-300 shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  New Article
                </Link>
              </>
          </div>
        </div>
      </div>

      {/* ── Hero / stats ── */}
      <div className="border-b border-white/5 relative z-10 bg-transparent">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 pt-8 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px w-8 bg-blue-500/40" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-400">Articles</span>
              </div>
              <h1 className="font-extrabold text-3xl text-white tracking-tight">
                {dashboardStats?.total === 0
                    ? "No articles yet"
                    : `${dashboardStats?.total} Article${dashboardStats?.total !== 1 ? "s" : ""}`}
              </h1>
            </div>
            
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
              {/* Category dropdown */}
              <div className="relative w-full sm:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none bg-white/5 border border-white/10 text-white text-sm font-medium pl-3 pr-8 py-2.5 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                >
                  <option value="All" className="bg-zinc-900">All Categories</option>
                  {flattenedCategories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-zinc-900">
                      {"\u00A0\u00A0".repeat(c.level)}{c.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white text-sm font-medium pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-600"
                />
              </div>
              <DateSelector date={date} today={today} onChange={setDate} />
            </div>
          </div>

          {/* Stats strip */}
          {totalCount > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5 rounded-xl overflow-hidden border border-white/10">
              {[
                { label: "Total", value: String(dashboardStats?.total) },
                { label: "Active Discounts", value: String(activeCount), highlight: activeCount > 0 },
                { label: "Scheduled", value: String(scheduledCount) },
                {
                  label: "Avg. Sales Price",
                  value: dashboardStats?.total > 0
                    ? formatCurrency(dashboardStats.avgSales)
                    : "—",
                },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="bg-zinc-900/80 backdrop-blur-sm px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-1.5">{label}</p>
                  <p className={`text-xl font-bold tabular-nums tracking-tight ${highlight ? "text-blue-400" : "text-white"}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <main className="flex-1 w-full px-6 sm:px-10 py-8 relative z-10">
        {totalCount === 0 && !loading && (
          <AdminEmptyState />
        )}
        
        {totalCount > 0 && (
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            {/* Table label */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">All Articles</span>
              <span className="text-[11px] text-gray-400">
                Prices for{" "}
                <span className="text-white font-bold">
                  {date === today ? "Today" : fmtDate(date)}
                </span>
              </span>
            </div>

            {/* Table */}
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-black/20">
                    <th className="px-4 py-4 text-left text-[10px] font-bold tracking-widest uppercase text-gray-500">Article</th>
                    <th className="px-4 py-4 text-center text-[10px] font-bold tracking-widest uppercase text-gray-500">Stock</th>
                    <th className="px-4 py-4 text-right text-[10px] font-bold tracking-widest uppercase text-gray-500">Net</th>
                    <th className="px-4 py-4 text-right text-[10px] font-bold tracking-widest uppercase text-gray-500">Sales</th>
                    <th className="px-4 py-4 text-center text-[10px] font-bold tracking-widest uppercase text-gray-500">VAT</th>
                    <th className="px-4 py-4 text-left text-[10px] font-bold tracking-widest uppercase text-gray-500">Status</th>
                    <th className="px-4 py-4 text-right text-[10px] font-bold tracking-widest uppercase text-gray-500">Price on Date</th>
                    <th className="px-4 py-4 text-right text-[10px] font-bold tracking-widest uppercase text-gray-500">Incl. VAT</th>
                    <th className="px-4 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayedArticles.map((article, index) => (
                    <ArticleRow 
                      key={`${article.id}-${index}`} 
                      article={article} 
                      date={date} 
                      categories={categories}
                    />
                  ))}
                  {hasMore && (
                    <tr ref={sentinelRef}>
                      <td colSpan={9} className="px-6 py-6 text-center text-[11px] font-bold uppercase tracking-widest text-gray-500">
                        {isLoadingMore ? "Loading more..." : "Scroll to load more"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

// ─── Article row ───────────────────────────────────────────────────────────────

function ArticleRow({ article, date, categories }: { article: Article; date: string; categories: Category[] }) {
  const activeDiscount = getActiveDiscount(article, date);
  const price = getEffectivePrice(article, date);
  const grossPrice = applyVat(price, article.vatRatio);
  
  // Get the base prices that were applicable on the selected date
  const { salesPrice: baseSalesPrice, netPrice: baseNetPrice } = getBasePriceOnDate(article, date);
  
  const isCapped =
    activeDiscount !== undefined && (activeDiscount.discountedPrice ?? baseSalesPrice) < baseNetPrice;

  const status: ArticleStatus = activeDiscount
    ? "active"
    : article.discounts.some((d) => d.startDate > date)
    ? "scheduled"
    : "none";

  const categoryName = categories.find(c => c.id === article.category)?.name || "Uncategorized";

  return (
    <tr className={`hover:bg-white/[0.03] transition-colors duration-150`}>
      {/* Article */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-4">
          {article.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.imageUrl}
              alt={article.name}
              className="w-12 h-12 object-cover shrink-0 rounded-lg border border-white/10"
            />
          ) : (
            <div className="w-12 h-12 bg-zinc-900 rounded-lg border border-white/10 shrink-0 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
          )}
          <div>
            <p className="font-bold text-white leading-snug tracking-tight">{article.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                {categoryName}
              </span>
              {article.slogan && (
                <span className="text-[13px] text-gray-400 leading-snug truncate max-w-[200px]">{article.slogan}</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <span className={`tabular-nums text-sm font-bold ${article.stock > 0 ? "text-emerald-400" : "text-red-400"}`}>
          {article.stock ?? 0}
        </span>
      </td>
      <td className="px-4 py-4 text-right">
        <span className="tabular-nums text-gray-400 text-sm font-medium">{formatCurrency(baseNetPrice)}</span>
      </td>
      <td className="px-4 py-4 text-right">
        <span className="tabular-nums text-gray-400 text-sm font-medium">{formatCurrency(baseSalesPrice)}</span>
      </td>
      <td className="px-4 py-4 text-center">
        <span className="tabular-nums text-gray-500 text-sm font-medium">{article.vatRatio}%</span>
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={status} />
      </td>
      <td className="px-4 py-4 text-right">
        <div className="flex items-baseline justify-end gap-1.5">
          <span className={`tabular-nums font-bold text-sm tracking-tight ${activeDiscount ? "text-blue-400" : "text-white"}`}>
            {formatCurrency(price)}
          </span>
          {isCapped && <span className="text-[10px] font-bold uppercase text-red-400">floor</span>}
        </div>
      </td>
      <td className="px-4 py-4 text-right">
        <span className="tabular-nums font-bold text-emerald-400 text-sm tracking-tight">{formatCurrency(grossPrice)}</span>
      </td>
      <td className="px-4 py-4 text-right">
        <Link
          href={`/admin/articles/${article.id}`}
          className="text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-4 py-2 rounded-full transition-all duration-200 whitespace-nowrap bg-white/5 hover:bg-white/10"
        >
          Manage
        </Link>
      </td>
    </tr>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function AdminEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center bg-zinc-900/50 border border-white/10 rounded-2xl backdrop-blur-sm">
      <div className="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center mb-6 text-gray-400 bg-white/5 shadow-lg">
        <ShopLogo size="md" />
      </div>
      <div className="h-px w-10 bg-blue-500/30 mb-6 mx-auto" />
      <h3 className="text-2xl font-extrabold text-white mb-2 tracking-tight">No articles yet</h3>
      <p className="text-sm text-gray-400 mb-8 max-w-xs leading-relaxed">
        Add your first article to start managing prices and discounts.
      </p>
      <Link
        href="/admin/articles/new"
        className="inline-flex items-center gap-2.5 bg-white text-black text-[11px] font-bold uppercase tracking-widest px-8 py-3.5 rounded-full hover:bg-gray-200 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        New Article
      </Link>
    </div>
  );
}
