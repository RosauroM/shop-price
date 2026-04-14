"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {  getAllCategories, addDiscount, addCategoryDiscount, getAllArticlesIdsByCategory, getArticlesByCategoryIds } from "@/lib/storage";
import { useArticlesPagination } from "@/hooks/useArticlesPagination";
import { useCategoryData } from "@/hooks/useCategoryData";
import { getCategoryDescendants } from "@/lib/categoryUtils";
import { toDateString } from "@/lib/pricing";
import { useAuth } from "@/app/providers";
import { ShopLogo } from "@/components/ShopLogo";
import type { Article, Category } from "@/lib/types";

export default function BulkDiscountsPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());
  const [selectedCategoryIdsForDiscount, setSelectedCategoryIdsForDiscount] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"articles" | "categories">("articles");
  
  const [form, setForm] = useState({
    startDate: toDateString(new Date()),
    endDate: toDateString(new Date()),
    percentageOff: "10",
  });
  
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [sentinelEl, setSentinelEl] = useState<HTMLLIElement | null>(null);
  const sentinelRef = useCallback((node: HTMLLIElement | null) => setSentinelEl(node), []);

  const {
    articles,
    setArticles,
    hasMore,
    isLoadingMore,
    totalCount,
    fetchInitialArticles,
    loadMoreArticles
  } = useArticlesPagination({
    limit: 20,
    categories,
    selectedCategory,
    searchQuery
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/admin");
  }, [loading, user, router]);

  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      getAllCategories().then(cats => {
        setCategories(cats);
        setCategoriesLoaded(true);
      });
    }
  }, [user]);

  useEffect(() => {
    if (categoriesLoaded) {
      const timeoutId = setTimeout(() => {
        fetchInitialArticles();
      }, 300); // Debounce search
      return () => clearTimeout(timeoutId);
    }
  }, [selectedCategory, searchQuery, categoriesLoaded, fetchInitialArticles]);

  useEffect(() => {
    setDisplayLimit(20);
  }, [selectedCategory]);

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

  const { flattenedCategories, validCategoryIds } = useCategoryData({ categories, selectedCategory });

  if (loading || !user) return null;

  const filteredArticles = selectedCategory === "All" 
    ? articles 
    : articles.filter(a => validCategoryIds.includes(a.category));

  const displayedArticles = filteredArticles;

  const toggleArticleSelection = (id: string) => {
    const newSet = new Set(selectedArticleIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedArticleIds(newSet);
  };

  const toggleSelectAll = async () => {
    if (selectedArticleIds.size === totalCount && totalCount > 0) {
      setSelectedArticleIds(new Set()); // Deselect all
    } else {
      const catIdsToFetch = selectedCategory === "All" ? null : validCategoryIds;
      const allIds = await getAllArticlesIdsByCategory(catIdsToFetch);
      setSelectedArticleIds(new Set(allIds)); // Select all currently filtered
    }
  };

  const toggleCategorySelection = (id: string) => {
    const newSet = new Set(selectedCategoryIdsForDiscount);
    const isSelected = newSet.has(id);
    const descendantIds = getCategoryDescendants(categories, id);

    if (isSelected) {
      newSet.delete(id);
      descendantIds.forEach(descId => newSet.delete(descId));
    } else {
      newSet.add(id);
      descendantIds.forEach(descId => newSet.add(descId));
    }
    setSelectedCategoryIdsForDiscount(newSet);
  };

  const toggleSelectAllCategories = () => {
    if (selectedCategoryIdsForDiscount.size === flattenedCategories.length && flattenedCategories.length > 0) {
      setSelectedCategoryIdsForDiscount(new Set());
    } else {
      setSelectedCategoryIdsForDiscount(new Set(flattenedCategories.map(c => c.id)));
    }
  };

  const handleApplyDiscounts = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    
    if (activeTab === "articles" && selectedArticleIds.size === 0) return setError("Please select at least one article.");
    if (activeTab === "categories" && selectedCategoryIdsForDiscount.size === 0) return setError("Please select at least one category.");
    if (!form.startDate || !form.endDate) return setError("Start and End dates are required.");
    if (form.startDate > form.endDate) return setError("Start date cannot be after End date.");
    
    const pct = parseFloat(form.percentageOff);
    if (isNaN(pct) || pct <= 0 || pct >= 100) return setError("Discount percentage must be between 1 and 99.");

    setIsSubmitting(true);

    try {
      const skippedPrice: string[] = [];
      const skippedOverlap: string[] = [];

      let targetArticles: Article[] = [];

      if (activeTab === "articles") {
        targetArticles = await getArticlesByCategoryIds(null);
        targetArticles = targetArticles.filter(a => selectedArticleIds.has(a.id));

        await Promise.all(targetArticles.map(async (article) => {
          // Check overlap
          const overlap = article.discounts?.some(
            (d) => form.startDate <= d.endDate && form.endDate >= d.startDate
          );
          if (overlap) {
            skippedOverlap.push(article.name);
            return; // Skip this article to prevent overlap
          }

          // Calculate new discounted price based on the current sales price
          const discountedPrice = Number((article.salesPrice * (1 - (pct / 100))).toFixed(2));
          
          // Prevent discount price from being lower than the net price
          if (discountedPrice < article.netPrice) {
            skippedPrice.push(article.name);
            return; // Skip this article to prevent a loss
          }
          
          await addDiscount(article.id, {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2),
            startDate: form.startDate,
            endDate: form.endDate,
            discountedPrice
          });
        }));

      } else {
        // Find all descendants for selected categories
        const allCategoryIdsToFetch = new Set<string>();
        selectedCategoryIdsForDiscount.forEach(catId => {
          getCategoryDescendants(categories, catId).forEach(id => allCategoryIdsToFetch.add(id));
        });
        targetArticles = await getArticlesByCategoryIds(Array.from(allCategoryIdsToFetch));

        // For category discounts, we still validate overlap and netPrice logic dynamically for the affected articles
        // However, if an overlap exists or netPrice is breached for SOME articles, we might just skip the whole category, 
        // or we let the frontend logic handle capping it at read time.
        // Wait, if we are applying a category discount, it applies to the CATEGORY. 
        // The user said: "when I select categories and apply discount, in the firebase, must be inserted only startDate, endDate, discountedPercent, categoryId and id."
        
        await Promise.all(Array.from(allCategoryIdsToFetch).map(async (categoryId) => {
          // Add category-level discount
          await addCategoryDiscount(categoryId, {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2),
            startDate: form.startDate,
            endDate: form.endDate,
            discountedPercent: pct
          });
        }));
      }

      // Refresh articles to show updated discounts
      await fetchInitialArticles();
      
      const totalAttempted = activeTab === "articles" ? targetArticles.length : selectedCategoryIdsForDiscount.size;
      const successCount = totalAttempted - skippedPrice.length - skippedOverlap.length;
      
      let msg = `Successfully applied ${pct}% discount to ${successCount} items.`;
      if (skippedPrice.length > 0) {
        msg += ` Skipped ${skippedPrice.length} items (price lower than net).`;
      }
      if (skippedOverlap.length > 0) {
        msg += ` Skipped ${skippedOverlap.length} items (overlapping dates).`;
      }
      
      setSuccessMsg(msg);
      
      if (activeTab === "articles") setSelectedArticleIds(new Set());
      if (activeTab === "categories") setSelectedCategoryIdsForDiscount(new Set());
      
      setForm({ ...form, percentageOff: "10" }); // reset percentage but keep dates for convenience
    } catch (err: any) {
      setError(err.message || "Failed to apply discounts.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <div className="relative z-10 flex-1 flex flex-col max-w-6xl mx-auto w-full p-6 sm:p-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">Bulk Discounts</h1>
          <p className="text-sm text-gray-400 font-medium">Apply promotions across multiple items</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Discount Configurator */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl sticky top-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-purple-400 mb-6">
                Discount Settings
              </h2>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleApplyDiscounts} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Percentage Off (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.percentageOff}
                      onChange={(e) => setForm({...form, percentageOff: e.target.value})}
                      min="1"
                      max="99"
                      required
                      className="w-full bg-white/5 border border-white/10 text-white text-lg font-bold px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-center"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500 font-bold">%</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Start Date</label>
                    <input
                      type="date"
                      required
                      value={form.startDate}
                      onChange={(e) => setForm({...form, startDate: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500/50 transition-all"
                      style={{ colorScheme: "dark" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">End Date</label>
                    <input
                      type="date"
                      required
                      value={form.endDate}
                      onChange={(e) => setForm({...form, endDate: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 text-white text-sm font-medium px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500/50 transition-all"
                      style={{ colorScheme: "dark" }}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || (activeTab === "articles" ? selectedArticleIds.size === 0 : selectedCategoryIdsForDiscount.size === 0)}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center"
                  >
                    <span>{isSubmitting ? "Applying..." : "Apply Discount"}</span>
                    {!isSubmitting && (
                      <span className="text-[10px] font-normal opacity-80 mt-1">
                        {activeTab === "articles" 
                          ? `to ${selectedArticleIds.size} selected items` 
                          : `to ${selectedCategoryIdsForDiscount.size} categories`}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Article/Category Selector */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Tabs */}
            <div className="flex p-1 bg-black/20 border border-white/5 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab("articles")}
                className={`flex-1 py-2.5 text-sm font-bold tracking-wide rounded-xl transition-all duration-300 ${
                  activeTab === "articles"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                Select by Articles
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("categories")}
                className={`flex-1 py-2.5 text-sm font-bold tracking-wide rounded-xl transition-all duration-300 ${
                  activeTab === "categories"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                Select by Categories
              </button>
            </div>

            {activeTab === "articles" ? (
              <>
                {/* Filter Bar */}
                <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 flex flex-col sm:flex-row items-center gap-4 shadow-xl">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500 shrink-0">Category</span>
                    <div className="relative flex-1 sm:max-w-[200px]">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full appearance-none bg-white/5 border border-white/10 text-white text-sm font-medium pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:border-purple-500/50 transition-all cursor-pointer"
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
                  </div>
                  
                  <div className="flex-1 w-full relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search articles..."
                      className="w-full bg-white/5 border border-white/10 text-white text-sm font-medium pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-gray-600"
                    />
                  </div>
                </div>

                {/* Articles List */}
                <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-xl flex-1">
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20">
                <button 
                  onClick={toggleSelectAll}
                  className="flex items-center gap-3 group"
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    selectedArticleIds.size === totalCount && totalCount > 0 
                      ? "bg-purple-500 border-purple-500 text-white" 
                      : "border-white/20 group-hover:border-white/50 text-transparent"
                  }`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">
                    {selectedArticleIds.size === totalCount && totalCount > 0 ? "Deselect All" : "Select All"}
                  </span>
                </button>
                <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                  Showing {totalCount} items
                </span>
              </div>
              
              {filteredArticles.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <p className="font-medium">No articles found in this category.</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {displayedArticles.map((article, index) => {
                    const isSelected = selectedArticleIds.has(article.id);
                    const activeDiscountsCount = article.discounts.length;
                    
                    return (
                      <li 
                        key={`${article.id}-${index}`} 
                        onClick={() => toggleArticleSelection(article.id)}
                        className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${
                          isSelected ? "bg-purple-500/5 hover:bg-purple-500/10" : "hover:bg-white/5"
                        }`}
                      >
                        <div className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors ${
                          isSelected 
                            ? "bg-purple-500 border-purple-500 text-white" 
                            : "border-white/20 text-transparent"
                        }`}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">{article.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                              {article.category || "Uncategorized"}
                            </span>
                            <span className="text-xs text-gray-500">${article.salesPrice.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        {activeDiscountsCount > 0 && (
                          <div className="shrink-0 text-right">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>
                              {activeDiscountsCount} Active
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                  {hasMore && (
                    <li ref={sentinelRef} className="p-6 text-center text-[11px] font-bold uppercase tracking-widest text-gray-500">
                      {isLoadingMore ? "Loading more..." : "Scroll to load more"}
                    </li>
                  )}
                </ul>
              )}
            </div>
              </>
            ) : (
              <>
                {/* Categories List */}
                <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-xl flex-1">
                  <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20">
                    <button 
                      onClick={toggleSelectAllCategories}
                      className="flex items-center gap-3 group"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        selectedCategoryIdsForDiscount.size === flattenedCategories.length && flattenedCategories.length > 0 
                          ? "bg-purple-500 border-purple-500 text-white" 
                          : "border-white/20 group-hover:border-white/50 text-transparent"
                      }`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">
                        {selectedCategoryIdsForDiscount.size === flattenedCategories.length && flattenedCategories.length > 0 ? "Deselect All" : "Select All"}
                      </span>
                    </button>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                      Showing {flattenedCategories.length} categories
                    </span>
                  </div>
                  
                  {flattenedCategories.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <p className="font-medium">No categories found.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                      {flattenedCategories.map((category) => {
                        const isSelected = selectedCategoryIdsForDiscount.has(category.id);
                        
                        return (
                          <li 
                            key={category.id} 
                            onClick={() => toggleCategorySelection(category.id)}
                            className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${
                              isSelected ? "bg-purple-500/5 hover:bg-purple-500/10" : "hover:bg-white/5"
                            }`}
                          >
                            <div className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center transition-colors ${
                              isSelected 
                                ? "bg-purple-500 border-purple-500 text-white" 
                                : "border-white/20 text-transparent"
                            }`}>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            
                            <div className="flex-1 min-w-0 flex items-center gap-2" style={{ paddingLeft: `${category.level * 24}px` }}>
                              <p className="font-bold text-white truncate">{category.name}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
  );
}
