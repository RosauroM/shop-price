import { useMemo } from "react";
import { buildCategoryTree, flattenCategoryTree, getCategoryDescendants } from "@/lib/categoryUtils";
import type { Category, CategoryNode } from "@/lib/types";

interface UseCategoryDataProps {
  categories: Category[];
  selectedCategory?: string;
}

export function useCategoryData({ categories, selectedCategory = "All" }: UseCategoryDataProps) {
  // Memoize the full category tree
  const categoryTree = useMemo(() => {
    return buildCategoryTree(categories);
  }, [categories]);

  // Memoize the flattened list (used for rendering dropdowns/lists with indentations)
  const flattenedCategories = useMemo(() => {
    return flattenCategoryTree(categoryTree);
  }, [categoryTree]);

  // Memoize the list of valid descendant IDs for a specific selected category
  const validCategoryIds = useMemo(() => {
    return getCategoryDescendants(categories, selectedCategory);
  }, [categories, selectedCategory]);

  return {
    categoryTree,
    flattenedCategories,
    validCategoryIds,
  };
}