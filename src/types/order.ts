import { TAddress } from './address';

export type TPaymentMethod = 'COD' | 'STRIPE';

export type TPaymentStatus = 'Pending' | 'Paid' | 'Failed';

export type TOrderStatus =
  | 'Placed'
  | 'Confirmed'
  | 'Preparing'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export interface TOrderItem {
  foodId: string;
  name: string;
  price: number;
  discountPrice?: number;
  quantity: number;
  image?: string;
  restaurantId?: string;
  restaurantName?: string;
}

export interface TOrder {
  _id?: string;
  id?: string;
  orderId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  items: TOrderItem[];
  deliveryAddress: TAddress;
  subtotal: number;
  deliveryFee: number;
  vatAmount?: number;
  platformFee?: number;
  couponCode?: string;
  discount?: number;
  totalAmount: number;
  paymentMethod: TPaymentMethod;
  paymentStatus: TPaymentStatus;
  orderStatus: TOrderStatus;
  stripeSessionId?: string;
  riderInfo?: {
    riderId?: string;
    name?: string;
    phone?: string;
    vehicleNumber?: string;
    latitude?: number;
    longitude?: number;
    deliveredAt?: string;
  };
  deliveryStatus?: string;
  deliveredAt?: string;
  deliveryOtp?: string;
  deliveryOtpCreatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TCreateOrderPayload {
  items: TOrderItem[];
  deliveryAddress: TAddress;
  paymentMethod: TPaymentMethod;
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  totalAmount: number;
}

export interface TOrderApiResponse {
  success: boolean;
  message?: string;
  orderId?: string;
  checkoutUrl?: string;
  data?: TOrder | TOrder[];
}
