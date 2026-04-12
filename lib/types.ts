export interface Discount {
  id: string;
  startDate: string;
  endDate: string;
  discountedPrice: number;
}

export interface Article {
  id: string;
  name: string;
  slogan?: string;
  imageUrl?: string;
  netPrice: number;
  salesPrice: number;
  vatRatio: number;
  discounts: Discount[];
}
