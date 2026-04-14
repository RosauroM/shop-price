import { useState, useCallback } from "react";
import { getArticlesPaginated } from "@/lib/storage";
import { getCategoryDescendants } from "@/lib/categoryUtils";
import type { Article, Category } from "@/lib/types";

interface UseArticlesPaginationOptions {
  limit: number;
  categories: Category[];
  selectedCategory: string;
  searchQuery?: string;
  minPrice?: string;
  maxPrice?: string;
  discountOnly?: boolean;
  date?: string;
}

export function useArticlesPagination(options: UseArticlesPaginationOptions) {
  const {
    limit: pageSize,
    categories,
    selectedCategory,
    searchQuery = "",
    minPrice,
    maxPrice,
    discountOnly = false,
    date
  } = options;

  const [articles, setArticles] = useState<Article[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const getCatIdsToFetch = useCallback(() => {
    const validCategoryIds = getCategoryDescendants(categories, selectedCategory);
    return selectedCategory === "All" ? null : validCategoryIds;
  }, [categories, selectedCategory]);

  const fetchInitialArticles = useCallback(async () => {
    const catIdsToFetch = getCatIdsToFetch();
    
    const parsedMinPrice = minPrice ? parseFloat(minPrice) : undefined;
    const parsedMaxPrice = maxPrice ? parseFloat(maxPrice) : undefined;

    setArticles([]);
    
    try {
      const paginatedData = await getArticlesPaginated(
        pageSize, 
        null, 
        catIdsToFetch, 
        searchQuery, 
        parsedMinPrice, 
        parsedMaxPrice, 
        discountOnly,
        date
      );
      
      setArticles(paginatedData.articles);
      setLastVisible(paginatedData.lastVisible);
      setHasMore(paginatedData.articles.length === pageSize);
      if (paginatedData.totalCount !== undefined) {
        setTotalCount(paginatedData.totalCount);
      }
    } catch (err) {
      console.error("Failed to fetch initial articles:", err);
    }
  }, [pageSize, getCatIdsToFetch, searchQuery, minPrice, maxPrice, discountOnly, date]);

  const loadMoreArticles = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    
    try {
      const catIdsToFetch = getCatIdsToFetch();
      const parsedMinPrice = minPrice ? parseFloat(minPrice) : undefined;
      const parsedMaxPrice = maxPrice ? parseFloat(maxPrice) : undefined;
      
      const paginatedData = await getArticlesPaginated(
        pageSize, 
        lastVisible, 
        catIdsToFetch, 
        searchQuery, 
        parsedMinPrice, 
        parsedMaxPrice, 
        discountOnly,
        date
      );
      
      setArticles((prev) => {
        // Simple deduplication based on ID just in case
        const existingIds = new Set(prev.map(a => a.id));
        const newArticles = paginatedData.articles.filter(a => !existingIds.has(a.id));
        return [...prev, ...newArticles];
      });
      setLastVisible(paginatedData.lastVisible);
      setHasMore(paginatedData.articles.length === pageSize);
    } catch (err) {
      console.error("Failed to load more articles:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, pageSize, lastVisible, getCatIdsToFetch, searchQuery, minPrice, maxPrice, discountOnly, date]);

  return {
    articles,
    setArticles,
    hasMore,
    isLoadingMore,
    totalCount,
    setTotalCount,
    fetchInitialArticles,
    loadMoreArticles
  };
}