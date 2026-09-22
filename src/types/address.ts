export interface TAddress {
  _id?: string;
  id?: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  streetAddress: string;
  area: string;
  building?: string;
  postalCode?: string;
  deliveryInstructions?: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TAddressApiResponse {
  success: boolean;
  message?: string;
  data?: TAddress | TAddress[] | null;
}
