export interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Discount {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  discountedPrice: number;
}

export interface PriceHistoryEntry {
  date: string; // ISO 8601 string or YYYY-MM-DD
  netPrice: number;
  salesPrice: number;
}

export interface Article {
  id: string;
  name: string;
  category: string; // Storing Category ID instead of Name
  slogan?: string | null;
  imageUrl?: string | null;
  netPrice: number;
  salesPrice: number;
  vatRatio: number;
  stock: number;
  discounts: Discount[];
  createdAt?: string; // ISO 8601 string
  priceHistory?: PriceHistoryEntry[]; // Array of past prices
}
