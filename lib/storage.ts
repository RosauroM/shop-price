import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Article, Category } from "./types";

const COLLECTION_NAME = "articles";
const CATEGORIES_COLLECTION = "categories";

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

// --- Articles ---

export async function getAllArticles(): Promise<Article[]> {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const articles: Article[] = [];
    querySnapshot.forEach((doc) => {
      articles.push(doc.data() as Article);
    });
    return articles;
  } catch (error) {
    console.error("Error getting articles:", error);
    return [];
  }
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Article;
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
    const safeArticle = {
      ...article,
      slogan: article.slogan === undefined ? null : article.slogan,
      imageUrl: article.imageUrl === undefined ? null : article.imageUrl,
      priceHistory: newPriceHistory,
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

export async function addDiscount(id: string, discount: any): Promise<void> {
  const article = await getArticleById(id);
  if (article) {
    article.discounts.push(discount);
    await saveArticle(article);
  }
}

export async function deleteDiscount(id: string, discountId: string): Promise<void> {
  const article = await getArticleById(id);
  if (article) {
    article.discounts = article.discounts.filter((d) => d.id !== discountId);
    await saveArticle(article);
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
