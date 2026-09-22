export interface TCartItem {
  _id?: string;
  userId: string;
  foodId: string;
  restaurantId: string;
  name: string;
  price: number;
  discountPrice?: number;
  image?: string;
  restaurantName?: string;
  quantity: number;
  specialInstructions?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TCart {
  items: TCartItem[];
  totalItems: number;
  totalPrice: number;
}

export interface TCartApiResponse {
  success: boolean;
  message?: string;
  data?: TCart | TCartItem | null;
}
