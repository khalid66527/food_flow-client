export interface TFavoriteItem {
  _id: string;
  favoriteId: string;
  foodId: string;
  userId: string;
  createdAt: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  image: string;
  images?: string[];
  category: string;
  restaurantId: string;
  restaurantName: string;
  rating?: number;
  isAvailable?: boolean;
  status?: string;
  prepTime?: string;
}

export interface TFavoriteApiResponse {
  success: boolean;
  message?: string;
  data?: any;
}
