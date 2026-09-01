export interface RiderProfile {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  userId: string;
  avatar: string;
  vehicleType: string;
  vehicleBrand: string;
  vehicleNumber: string;
  deliveryZone: string;
  city: string;
  address: {
    street: string;
    area: string;
    city: string;
    fullAddress: string;
  };
  isAvailable: boolean;
  status: string;
  totalDeliveries: number;
  rating: number;
  totalEarnings: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface DeliveryAssignment {
  _id?: string;
  orderId: string;
  riderId: string;
  riderName?: string;
  riderPhone?: string;
  riderEmail?: string;
  status: "available" | "accepted" | "picked_up" | "on_the_way" | "delivered" | "failed";
  riderLocation?: { lat: number; lng: number; updatedAt: string };
  pickupRestaurant: {
    restaurantId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    phone?: string;
  };
  dropoffCustomer: {
    customerId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    phone: string;
  };
  deliveryFee: number;
  tip: number;
  totalEarning: number;
  acceptedAt?: string;
  pickedUpAt?: string;
  onTheWayAt?: string;
  deliveredAt?: string;
  estimatedDistance: number;
  estimatedTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface RiderStats {
  todayDeliveries: number;
  todayEarnings: number;
  totalDeliveries: number;
  totalEarnings: number;
  rating: number;
  isAvailable: boolean;
}

export interface EarningsPeriod {
  period: string;
  totalEarnings: number;
  totalDeliveries: number;
  avgDeliveryFee: number;
}

export interface EarningsChartData {
  date: string;
  earnings: number;
  deliveries: number;
}

export interface Notification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
