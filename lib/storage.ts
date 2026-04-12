import type { Article } from "./types";

const STORAGE_KEY = "premia_articles";

function getStoredArticles(): Article[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  return [];
}

function saveArticles(articles: Article[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  }
}

export function getAllArticles(): Article[] {
  return getStoredArticles();
}

export function getArticleById(id: string): Article | undefined {
  return getStoredArticles().find((a) => a.id === id);
}

export function saveArticle(article: Article): void {
  const articles = getStoredArticles();
  const index = articles.findIndex((a) => a.id === article.id);
  if (index >= 0) articles[index] = article;
  else articles.push(article);
  saveArticles(articles);
}

export function deleteArticle(id: string): void {
  const articles = getStoredArticles().filter((a) => a.id !== id);
  saveArticles(articles);
}

export function updateArticleImage(id: string, imageUrl?: string): void {
  const article = getArticleById(id);
  if (article) {
    article.imageUrl = imageUrl;
    saveArticle(article);
  }
}

export function addDiscount(id: string, discount: any): void {
  const article = getArticleById(id);
  if (article) {
    article.discounts.push(discount);
    saveArticle(article);
  }
}

export function deleteDiscount(id: string, discountId: string): void {
  const article = getArticleById(id);
  if (article) {
    article.discounts = article.discounts.filter((d) => d.id !== discountId);
    saveArticle(article);
  }
}

export async function resizeImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
}
