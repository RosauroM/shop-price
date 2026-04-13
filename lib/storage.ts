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
      categories.push(doc.data() as Category);
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
    await setDoc(docRef, category);
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
    // Firestore strictly rejects undefined values. We ensure all optional fields are at least null.
    const safeArticle = {
      ...article,
      slogan: article.slogan === undefined ? null : article.slogan,
      imageUrl: article.imageUrl === undefined ? null : article.imageUrl,
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

export async function resizeImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
}
