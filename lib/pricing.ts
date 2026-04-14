import type { Article, Discount } from "./types";

export function getActiveDiscount(article: Article, date: string): Discount | undefined {
  return article.discounts.find((d) => d.startDate <= date && d.endDate >= date);
}

export function getEffectivePrice(article: Article, date: string): number {
  // First, find the base price for the given date from price history
  let baseSalesPrice = article.salesPrice;
  let baseNetPrice = article.netPrice;

  if (article.priceHistory && article.priceHistory.length > 0) {
    // History is sorted chronologically. We want the most recent price that was established *on or before* the given date.
    // If the date is before the very first history entry, we just use that first entry.
    const relevantHistory = [...article.priceHistory].reverse().find(entry => entry.date <= date);
    if (relevantHistory) {
      baseSalesPrice = relevantHistory.salesPrice;
      baseNetPrice = relevantHistory.netPrice;
    } else {
      // Date is before any history we have recorded, default to the oldest known
      baseSalesPrice = article.priceHistory[0].salesPrice;
      baseNetPrice = article.priceHistory[0].netPrice;
    }
  }

  const discount = getActiveDiscount(article, date);
  if (!discount) return baseSalesPrice;
  return Math.max(discount.discountedPrice ?? baseSalesPrice, baseNetPrice);
}

export function getBasePriceOnDate(article: Article, date: string): { salesPrice: number, netPrice: number } {
  let baseSalesPrice = article.salesPrice;
  let baseNetPrice = article.netPrice;

  if (article.priceHistory && article.priceHistory.length > 0) {
    const relevantHistory = [...article.priceHistory].reverse().find(entry => entry.date <= date);
    if (relevantHistory) {
      baseSalesPrice = relevantHistory.salesPrice;
      baseNetPrice = relevantHistory.netPrice;
    } else {
      baseSalesPrice = article.priceHistory[0].salesPrice;
      baseNetPrice = article.priceHistory[0].netPrice;
    }
  }
  
  return { salesPrice: baseSalesPrice, netPrice: baseNetPrice };
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

export function formatDateShort(dStr: string): string {
  return new Date(dStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function classifyDiscount(discount: Discount, currentDate: string): "active" | "scheduled" | "expired" {
  if (discount.endDate < currentDate) return "expired";
  if (discount.startDate <= currentDate && discount.endDate >= currentDate) return "active";
  return "scheduled";
}
