export type TZoneShapeType = 'circle' | 'polygon' | 'rectangle' | 'polyline';

export interface ICoordinates {
  latitude: number;
  longitude: number;
}

export interface IZone {
  _id?: string;
  zoneId?: number;
  name: string;
  slug?: string;
  shapeType: TZoneShapeType;
  color: string;
  centerCoordinates: ICoordinates;
  radiusKm: number;
  polygonCoordinates?: ICoordinates[];
  city: string;
  division: string;
  district: string;
  upazila?: string;
  maxDeliveryRadiusKm: number;
  baseDeliveryFee: number;
  perKmDeliveryFee: number;
  estimatedBaseDeliveryMinutes?: number;
  isActive: boolean;
  totalRestaurants?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IZoneDetectionResponse {
  isInsideServiceArea: boolean;
  primaryZone: IZone | null;
  candidateZoneIds: string[];
  candidateZones: IZone[];
  adjacentZones?: IZone[];
  nearestZone?: IZone;
  distanceToNearestKm?: number;
  maxDeliveryRadiusKm?: number;
  baseDeliveryFee?: number;
  perKmDeliveryFee?: number;
  message?: string;
}

export interface IZoneApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}
