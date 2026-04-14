import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, limit, startAfter, orderBy, DocumentData, QueryDocumentSnapshot, where } from "firebase/firestore";
import { db } from "./firebase";
import type { Article, Category, Discount } from "./types";

const COLLECTION_NAME = "articles";
const CATEGORIES_COLLECTION = "categories";
const DISCOUNTS_COLLECTION = "discounts";

// --- Categories ---

export async function getAllCategories(): Promise<Category[]> {
  try {
    const querySnapshot = await getDocs(collection(db, CATEGORIES_COLLECTION));
    const categories: Category[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Category;
      if (data.parentId === undefined) {
        data.parentId = null;
      }
      categories.push(data);
    });
    return categories;
  } catch (error) {
    console.error("Error getting categories:", error);
    return [];
  }
}

export async function saveCategory(category: Category): Promise<void> {
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, category.id);
    const safeCategory = {
      ...category,
      parentId: category.parentId === undefined ? null : category.parentId,
    };
    await setDoc(docRef, safeCategory);
  } catch (error) {
    console.error("Error saving category:", error);
    throw error;
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
}

// --- Helpers ---

function applyDiscountsToArticles(articles: Article[], allDiscounts: Discount[]): Article[] {
  return articles.map(article => {
    // Gather all matching discounts for this article
    const rawDiscounts = allDiscounts.filter(
      d => d.articleId === article.id || (d.categoryId && d.categoryId === article.category)
    );

    // Pre-calculate prices so we can compare them during overlap resolution
    const calculatedRawDiscounts = rawDiscounts.map(d => {
      if (d.categoryId && d.discountedPercent) {
        let price = Number((article.salesPrice * (1 - (d.discountedPercent / 100))).toFixed(2));
        if (price < article.netPrice) price = article.netPrice;
        return { ...d, discountedPrice: price };
      }
      return d;
    });

    // Sort discounts by start date (and then by end date) so we can process them chronologically
    calculatedRawDiscounts.sort((a, b) => {
      if (a.startDate === b.startDate) {
        return a.endDate.localeCompare(b.endDate);
      }
      return a.startDate.localeCompare(b.startDate);
    });

    const validDiscounts: Discount[] = [];
    
    // Filter out any overlapping dates. "Only one can be applicable at a time"
    for (const d of calculatedRawDiscounts) {
      // Find index of an overlapping discount we've already accepted
      const overlapIndex = validDiscounts.findIndex(
        valid => d.startDate <= valid.endDate && d.endDate >= valid.startDate
      );
      
      if (overlapIndex !== -1) {
        // There is an overlap. Keep the one with the higher price.
        const existingDiscount = validDiscounts[overlapIndex];
        const existingPrice = existingDiscount.discountedPrice ?? 0;
        const newPrice = d.discountedPrice ?? 0;
        
        if (newPrice > existingPrice) {
          // Replace the existing one with the new one
          validDiscounts[overlapIndex] = d;
        }
      } else {
        // No overlap, safe to add
        validDiscounts.push(d);
      }
    }
      
    return { ...article, discounts: validDiscounts };
  });
}

async function fetchAndApplyDiscounts(articles: Article[]): Promise<Article[]> {
  if (articles.length === 0) return [];
  const discountSnapshot = await getDocs(collection(db, DISCOUNTS_COLLECTION));
  const allDiscounts: Discount[] = [];
  discountSnapshot.forEach((doc) => allDiscounts.push(doc.data() as Discount));
  return applyDiscountsToArticles(articles, allDiscounts);
}

// --- Articles ---

export async function getDashboardStats(date: string, categoryIds?: string[] | null): Promise<{ active: number, scheduled: number, total: number, avgNet: number, avgSales: number }> {
  try {
    let active = 0;
    let scheduled = 0;
    let totalNet = 0;
    let totalSales = 0;
    let count = 0;
    
    let articlesData: Article[] = [];

    if (categoryIds && categoryIds.length > 0) {
      // Chunk categoryIds into groups of 10 to bypass Firestore limit
      const chunks = [];
      for (let i = 0; i < categoryIds.length; i += 10) {
        chunks.push(categoryIds.slice(i, i + 10));
      }

      const snapshots = await Promise.all(chunks.map(async (chunk) => {
        const q = query(collection(db, COLLECTION_NAME), where("category", "in", chunk));
        return getDocs(q);
      }));
      
      snapshots.forEach(querySnapshot => {
        querySnapshot.forEach((doc) => articlesData.push(doc.data() as Article));
      });
    } else {
      const q = query(collection(db, COLLECTION_NAME));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => articlesData.push(doc.data() as Article));
    }

    articlesData = await fetchAndApplyDiscounts(articlesData);

    articlesData.forEach((data) => {
      const articleDiscounts = data.discounts;
      
      // Skip articles created after the selected date
      if (data.createdAt && data.createdAt.split('T')[0] > date) return;

      count++;
      
      // Use price history if available to get the correct price for the selected date
      let currentSalesPrice = data.salesPrice;
      let currentNetPrice = data.netPrice;
      
      if (data.priceHistory && data.priceHistory.length > 0) {
        const relevantHistory = [...data.priceHistory].reverse().find(entry => entry.date <= date);
        if (relevantHistory) {
          currentSalesPrice = relevantHistory.salesPrice;
          currentNetPrice = relevantHistory.netPrice;
        } else {
          currentSalesPrice = data.priceHistory[0].salesPrice;
          currentNetPrice = data.priceHistory[0].netPrice;
        }
      }

      totalNet += currentNetPrice || 0;
      totalSales += currentSalesPrice || 0;
      
      const activeDiscount = articleDiscounts.find((d) => d.startDate <= date && d.endDate >= date);
      if (activeDiscount) {
        active++;
      } else if (articleDiscounts.some((d) => d.startDate > date)) {
        scheduled++;
      }
    });
    
    return { 
      active, 
      scheduled, 
      total: count, 
      avgNet: count > 0 ? totalNet / count : 0, 
      avgSales: count > 0 ? totalSales / count : 0 
    };
  } catch (error) {
    console.error("Error getting stats:", error);
    return { active: 0, scheduled: 0, total: 0, avgNet: 0, avgSales: 0 };
  }
}

export async function getAllArticlesIdsByCategory(categoryIds?: string[] | null): Promise<string[]> {
  try {
    if (categoryIds && categoryIds.length === 0) return []; // No categories selected, return empty

    let ids: string[] = [];

    if (!categoryIds) {
      // Fetch all
      const q = query(collection(db, COLLECTION_NAME));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => ids.push(doc.id));
      return ids;
    }

    // Chunk categoryIds into groups of 10
    const chunks = [];
    for (let i = 0; i < categoryIds.length; i += 10) {
      chunks.push(categoryIds.slice(i, i + 10));
    }

    await Promise.all(chunks.map(async (chunk) => {
      const q = query(collection(db, COLLECTION_NAME), where("category", "in", chunk));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => ids.push(doc.id));
    }));

    return ids;
  } catch (error) {
    console.error("Error getting all article IDs by category:", error);
    return [];
  }
}

export async function getArticlesByCategoryIds(categoryIds?: string[] | null): Promise<Article[]> {
  try {
    if (categoryIds && categoryIds.length === 0) return []; // No categories selected, return empty

    let articles: Article[] = [];

    if (!categoryIds) {
      // Fetch all
      const q = query(collection(db, COLLECTION_NAME));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Article, "discounts">;
        articles.push({ ...data, discounts: [] } as Article);
      });
    } else {
      // Chunk categoryIds into groups of 10
      const chunks = [];
      for (let i = 0; i < categoryIds.length; i += 10) {
        chunks.push(categoryIds.slice(i, i + 10));
      }

      await Promise.all(chunks.map(async (chunk) => {
        const q = query(collection(db, COLLECTION_NAME), where("category", "in", chunk));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Article, "discounts">;
          articles.push({ ...data, discounts: [] } as Article);
        });
      }));
    }

    articles = await fetchAndApplyDiscounts(articles);

    return articles;
  } catch (error) {
    console.error("Error getting all articles by category:", error);
    return [];
  }
}
export async function getArticlesPaginated(
  pageSize: number,
  lastVisible?: QueryDocumentSnapshot<DocumentData> | null,
  categoryIds?: string[] | null,
  searchQuery?: string,
  minPrice?: number,
  maxPrice?: number,
  discountOnly?: boolean,
  date?: string
): Promise<{ articles: Article[]; lastVisible: QueryDocumentSnapshot<DocumentData> | null; totalCount?: number }> {
  try {
    const hasLocalFilters = !!searchQuery || minPrice !== undefined || maxPrice !== undefined || discountOnly || !!date;

    let allArticles: Article[] = [];
    let lastVisibleDoc: QueryDocumentSnapshot<DocumentData> | null = null;

    if (categoryIds && categoryIds.length > 0) {
      // Chunk categoryIds into groups of 10
      const chunks = [];
      for (let i = 0; i < categoryIds.length; i += 10) {
        chunks.push(categoryIds.slice(i, i + 10));
      }

      if (hasLocalFilters) {
        // Fetch all matching categories and filter locally
        await Promise.all(chunks.map(async (chunk) => {
          const q = query(collection(db, COLLECTION_NAME), where("category", "in", chunk));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            const data = doc.data() as Omit<Article, "discounts">;
            allArticles.push({ ...data, discounts: [] } as Article);
          });
        }));
      } else {
        // If NO local filters, we must paginate. Since Firestore doesn't support pagination across multiple OR/IN queries easily when chunked,
        // the safest way for >10 categories is to fetch all matching categories and paginate locally.
        // If there's <= 10, we can use native firestore pagination.
        if (chunks.length === 1) {
          const queryConstraints: any[] = [where("category", "in", chunks[0]), orderBy("id")];
          if (lastVisible) queryConstraints.push(startAfter(lastVisible));
          queryConstraints.push(limit(pageSize));
          
          const q = query(collection(db, COLLECTION_NAME), ...queryConstraints);
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            const data = doc.data() as Omit<Article, "discounts">;
            allArticles.push({ ...data, discounts: [] } as Article);
          });
          lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
        } else {
           // >10 categories, no local filters: fetch all chunks, sort, and slice locally
           await Promise.all(chunks.map(async (chunk) => {
            const q = query(collection(db, COLLECTION_NAME), where("category", "in", chunk));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
              const data = doc.data() as Omit<Article, "discounts">;
              allArticles.push({ ...data, discounts: [] } as Article);
            });
          }));
          
          allArticles.sort((a, b) => a.id.localeCompare(b.id));
          // Local pagination logic will handle slicing this below
        }
      }
    } else {
      // No categories selected (fetch all)
      const queryConstraints: any[] = [];
      if (!hasLocalFilters) {
        queryConstraints.push(orderBy("id"));
        if (lastVisible) queryConstraints.push(startAfter(lastVisible));
        queryConstraints.push(limit(pageSize));
      }
      
      const q = query(collection(db, COLLECTION_NAME), ...queryConstraints);
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Article, "discounts">;
        allArticles.push({ ...data, discounts: [] } as Article);
      });
      
      if (!hasLocalFilters) {
        lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      }
    }

    allArticles = await fetchAndApplyDiscounts(allArticles);

    // If we have local filters, apply them now before paginating
    if (hasLocalFilters) {
      allArticles = allArticles.filter((a) => {
        // Date Filter
        if (date && a.createdAt && a.createdAt.split('T')[0] > date) return false;

        // Search Filter
        const matchesSearch = searchQuery
          ? a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.slogan?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
          : true;

        // Price Filter
        // We use salesPrice as a proxy for the base if getEffectivePrice isn't available here, 
        // or we just use the raw salesPrice/netPrice since we are in the backend logic.
        const price = a.salesPrice; 
        const matchesMinPrice = minPrice !== undefined ? price >= minPrice : true;
        const matchesMaxPrice = maxPrice !== undefined ? price <= maxPrice : true;

        // Discount Filter
        const hasDiscount = date ? (a.discounts?.some(d => d.startDate <= date && d.endDate >= date) || false) : (a.discounts?.length > 0);
        const matchesDiscount = discountOnly ? hasDiscount : true;

        return matchesSearch && matchesMinPrice && matchesMaxPrice && matchesDiscount;
      });

      // Local Pagination
      const totalCount = allArticles.length;
      
      // Find the index of the lastVisible article if it exists
      let startIndex = 0;
      if (lastVisible) {
        const lastId = lastVisible.id;
        const lastIndex = allArticles.findIndex(a => a.id === lastId);
        if (lastIndex !== -1) {
          startIndex = lastIndex + 1;
        }
      }

      const paginatedArticles = allArticles.slice(startIndex, startIndex + pageSize);
      
      // We don't have a true QueryDocumentSnapshot to return for local pagination, 
      // but the caller only checks if it's truthy, so we can return a mock or just rely on the ID.
      // To keep types happy and the loop working, we'll return the last article as a pseudo-snapshot.
      const newLastVisible = paginatedArticles.length > 0 
        ? { id: paginatedArticles[paginatedArticles.length - 1].id } as any
        : null;

      return { articles: paginatedArticles, lastVisible: newLastVisible, totalCount };
    }

    // Normal Firestore Pagination
    let totalCount: number | undefined = undefined;
    if (!lastVisible) {
      const countConstraints: any[] = [];
      if (categoryIds && categoryIds.length > 0) {
        countConstraints.push(where("category", "in", categoryIds.slice(0, 10)));
      }
      
      const countQuery = query(collection(db, COLLECTION_NAME), ...countConstraints);
      const countSnapshot = await getDocs(countQuery);
      totalCount = countSnapshot.size;
    }

    return { articles: allArticles, lastVisible: lastVisibleDoc, totalCount };

  } catch (error) {
    console.error("Error getting paginated articles:", error);
    return { articles: [], lastVisible: null };
  }
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const articleData = docSnap.data() as Article;
      
      let articlesData = [{ ...articleData, discounts: [] } as Article];
      articlesData = await fetchAndApplyDiscounts(articlesData);
      
      return articlesData[0];
    }
    return undefined;
  } catch (error) {
    console.error("Error getting article:", error);
    return undefined;
  }
}

export async function saveArticle(article: Article): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, article.id);
    
    // Handle Price History Tracking
    const existingArticle = await getArticleById(article.id);
    let newPriceHistory = existingArticle?.priceHistory || [];
    
    // If the article exists and the price has changed, record the old price
    if (existingArticle && (existingArticle.netPrice !== article.netPrice || existingArticle.salesPrice !== article.salesPrice)) {
      const today = new Date().toISOString().split('T')[0];
      
      // Prevent multiple history entries on the exact same day by updating the last entry if it's from today
      // Or just push a new entry. Usually, we record what the price *was* up until today.
      // We will record the newly established price and the date it was established.
      newPriceHistory.push({
        date: today,
        netPrice: article.netPrice,
        salesPrice: article.salesPrice
      });
      
      // Sort by date ascending
      newPriceHistory.sort((a, b) => a.date.localeCompare(b.date));
    } else if (!existingArticle) {
      // First time creation, establish initial price history
      newPriceHistory = [{
        date: new Date().toISOString().split('T')[0],
        netPrice: article.netPrice,
        salesPrice: article.salesPrice
      }];
    }

    // Firestore strictly rejects undefined values. We ensure all optional fields are at least null.
    // Also, omit discounts array from being saved into the article document
    const { discounts, ...articleWithoutDiscounts } = article;

    const safeArticle = {
      ...articleWithoutDiscounts,
      slogan: article.slogan === undefined ? null : article.slogan,
      imageUrl: article.imageUrl === undefined ? null : article.imageUrl,
      priceHistory: newPriceHistory,
      createdAt: article.createdAt || new Date().toISOString().split('T')[0], // Ensure createdAt exists
    };
    await setDoc(docRef, safeArticle);
  } catch (error) {
    console.error("Error saving article:", error);
    throw error;
  }
}

export async function deleteArticle(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting article:", error);
  }
}

export async function updateArticleImage(id: string, imageUrl: string | null): Promise<void> {
  const article = await getArticleById(id);
  if (article) {
    article.imageUrl = imageUrl;
    await saveArticle(article);
  }
}

export async function addDiscount(id: string, discount: Omit<Discount, "articleId">): Promise<void> {
  try {
    const fullDiscount: Discount = {
      ...discount,
      articleId: id
    };
    const discountRef = doc(db, DISCOUNTS_COLLECTION, discount.id);
    await setDoc(discountRef, fullDiscount);
  } catch (error) {
    console.error("Error adding discount:", error);
    throw error;
  }
}

export async function addCategoryDiscount(categoryId: string, discount: Omit<Discount, "categoryId">): Promise<void> {
  try {
    const fullDiscount: Discount = {
      ...discount,
      categoryId: categoryId
    };
    const discountRef = doc(db, DISCOUNTS_COLLECTION, discount.id);
    await setDoc(discountRef, fullDiscount);
  } catch (error) {
    console.error("Error adding category discount:", error);
    throw error;
  }
}

export async function deleteDiscount(id: string, discountId: string): Promise<void> {
  try {
    const discountRef = doc(db, DISCOUNTS_COLLECTION, discountId);
    await deleteDoc(discountRef);
  } catch (error) {
    console.error("Error deleting discount:", error);
    throw error;
  }
}

export function resizeImage(file: File, maxWidth = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Helper to convert data URL to Blob
function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
