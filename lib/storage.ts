import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Article } from "./types";

const COLLECTION_NAME = "articles";

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
    await setDoc(docRef, article);
  } catch (error) {
    console.error("Error saving article:", error);
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

export async function updateArticleImage(id: string, imageUrl?: string): Promise<void> {
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
