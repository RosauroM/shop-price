export interface Category {
  id: string;
  name: string;
}

export interface Discount {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  discountedPrice: number;
}

export interface Article {
  id: string;
  name: string;
  category: string;
  slogan?: string | null;
  imageUrl?: string | null;
  netPrice: number;
  salesPrice: number;
  vatRatio: number;
  stock: number;
  discounts: Discount[];
}
