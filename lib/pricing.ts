import type { Article, Discount } from "./types";

export function getActiveDiscount(article: Article, date: string): Discount | undefined {
  return article.discounts.find((d) => d.startDate <= date && d.endDate >= date);
}

export function getEffectivePrice(article: Article, date: string): number {
  const discount = getActiveDiscount(article, date);
  if (!discount) return article.salesPrice;
  return Math.max(discount.discountedPrice, article.netPrice);
}

export function applyVat(netPrice: number, vatRatio: number): number {
  return netPrice * (1 + vatRatio / 100);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function classifyDiscount(discount: Discount, currentDate: string): "active" | "scheduled" | "expired" {
  if (discount.endDate < currentDate) return "expired";
  if (discount.startDate <= currentDate && discount.endDate >= currentDate) return "active";
  return "scheduled";
}
