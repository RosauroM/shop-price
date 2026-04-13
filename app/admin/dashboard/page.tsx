"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/providers";
import { getAllArticles } from "@/lib/storage";
import { getEffectivePrice, getActiveDiscount, applyVat, formatCurrency, toDateString, classifyDiscount } from "@/lib/pricing";
import type { Article } from "@/lib/types";
import { DateSelector } from "@/app/components/DateSelector";
import { StatusBadge } from "@/app/components/Badge";
import type { ArticleStatus } from "@/app/components/Badge";
import { ShopLogo } from "@/app/components/ShopLogo";
import type { User } from "@/app/providers";

export default function AdminDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [date, setDate] = useState("");
  const today = toDateString(new Date());

  useEffect(() => {
    if (!loading && !user) router.replace("/admin");
  }, [loading, user, router]);

  useEffect(() => {
    async function loadArticles() {
      const data = await getAllArticles();
      setArticles(data);
    }
    setDate(today);
    loadArticles();
  }, [today]);

  if (loading || !user) return null;

  const activeCount = articles.filter((a) => getActiveDiscount(a, date)).length;
  const scheduledCount = articles.filter((a) => !getActiveDiscount(a, date) && a.discounts.some((d) => d.startDate > date)).length;

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
        <div className="max-w-6xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShopLogo size="md" />
            <span className="font-bold text-white text-lg tracking-tight uppercase">
              Premia
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border border-white/10 px-2 py-0.5 rounded-sm">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-full transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              View Storefront
            </Link>
            <div className="w-px h-6 bg-white/10 hidden sm:block" />
            <AdminUserMenu user={user} onSignOut={signOut} />
          </div>
        </div>
      </header>

      {/* ── Sub-header: page title + New Article ── */}
      <div className="border-b border-white/5 bg-white/[0.02] relative z-10">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 h-14 flex items-center justify-between gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2.5 text-xs font-medium uppercase tracking-widest">
            <span className="text-gray-500">Dashboard</span>
            <span className="text-gray-600">›</span>
            <span className="text-gray-300">Articles</span>
          </div>
          {/* New Article */}
          <Link
            href="/admin/articles/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wide px-5 py-2.5 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 transition-all duration-300 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Article
          </Link>
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
                {articles.length === 0
                  ? "No articles yet"
                  : `${articles.length} Article${articles.length !== 1 ? "s" : ""}`}
              </h1>
            </div>
            <DateSelector date={date} today={today} onChange={setDate} />
          </div>

          {/* Stats strip */}
          {articles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5 rounded-xl overflow-hidden border border-white/10">
              {[
                { label: "Total", value: String(articles.length) },
                { label: "Active Discounts", value: String(activeCount), highlight: activeCount > 0 },
                { label: "Scheduled", value: String(scheduledCount) },
                {
                  label: "Avg. Sales Price",
                  value: formatCurrency(articles.reduce((s, a) => s + a.salesPrice, 0) / articles.length),
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
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 sm:px-10 py-8 relative z-10">
        {articles.length === 0 ? (
          <AdminEmptyState />
        ) : (
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-black/20">
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-widest uppercase text-gray-500">Article</th>
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
                  {articles.map((article) => (
                    <ArticleRow key={article.id} article={article} date={date} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 mt-auto relative z-10 bg-black/40 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-6 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 uppercase tracking-widest font-bold">Admin Dashboard</span>
          <Link href="/" className="text-[11px] text-gray-500 hover:text-white uppercase tracking-widest transition-colors font-bold">
            View Storefront ↗
          </Link>
        </div>
      </footer>
    </div>
  );
}

// ─── Article row ───────────────────────────────────────────────────────────────

function ArticleRow({ article, date }: { article: Article; date: string }) {
  const activeDiscount = getActiveDiscount(article, date);
  const price = getEffectivePrice(article, date);
  const grossPrice = applyVat(price, article.vatRatio);
  const isCapped =
    activeDiscount !== undefined && activeDiscount.discountedPrice < article.netPrice;

  const status: ArticleStatus = activeDiscount
    ? "active"
    : article.discounts.some((d) => d.startDate > date)
    ? "scheduled"
    : "none";

  return (
    <tr className="hover:bg-white/[0.03] transition-colors duration-150">
      {/* Article */}
      <td className="px-6 py-4">
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
            {article.slogan && (
              <p className="text-[13px] text-gray-400 mt-0.5 leading-snug">{article.slogan}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-right">
        <span className="tabular-nums text-gray-400 text-sm font-medium">{formatCurrency(article.netPrice)}</span>
      </td>
      <td className="px-4 py-4 text-right">
        <span className="tabular-nums text-gray-400 text-sm font-medium">{formatCurrency(article.salesPrice)}</span>
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

// ─── Admin user menu ───────────────────────────────────────────────────────────

function AdminUserMenu({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  return (
    <div className="flex items-center gap-3">
      {user.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.photoURL} alt={user.displayName ?? ""} className="w-8 h-8 rounded-full border border-white/10" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-gray-400 text-xs font-bold select-none">
          {(user.displayName?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
        </div>
      )}
      <button
        onClick={onSignOut}
        className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
        </svg>
        Sign out
      </button>
    </div>
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