import { IZone } from "@/types/zone";
import { TAddress } from "@/types/address";

const GENERIC_STOP_WORDS = new Set([
  "sadar",
  "hub",
  "zone",
  "road",
  "point",
  "area",
  "house",
  "block",
  "sector",
  "division",
  "district",
  "city",
  "north",
  "south",
  "east",
  "west",
  "central",
  "and",
  "&",
  "food",
]);

/**
 * Calculate Haversine distance in kilometers between two GPS coordinates
 */
export function getHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Compute Dynamic Delivery Fee based on distance and zone pricing rules
 */
export function calculateDynamicDeliveryFee(
  distanceKm: number,
  baseFee = 30,
  perKmFee = 10,
  baseDistKm = 2
): number {
  if (distanceKm <= baseDistKm) {
    return Math.round(baseFee);
  }
  const extraKm = distanceKm - baseDistKm;
  return Math.round(baseFee + extraKm * perKmFee);
}

export interface IResolvedDeliveryFee {
  deliveryFee: number;
  baseFee: number;
  perKmFee: number;
  zoneName: string | null;
  zoneId?: number | string | null;
  distanceKm?: number;
  matchedZone: IZone | null;
  resolutionSource: "COORDINATES" | "TEXT_MATCH" | "RESTAURANT_ZONE" | "GLOBAL_FALLBACK";
}

/**
 * Checks if an address text specifically matches a Zone, ignoring generic words like 'sadar' or 'hub'
 */
function isZoneSpecificTextMatch(combinedAddressText: string, z: IZone): boolean {
  const zoneNameLower = (z.name || "").toLowerCase();
  const cityLower = (z.city || "").toLowerCase();
  const districtLower = (z.district || "").toLowerCase();
  const upazilaLower = (z.upazila || "").toLowerCase();

  // 1. Direct contains check for city, district, upazila
  if (cityLower && cityLower.length >= 3 && combinedAddressText.includes(cityLower)) return true;
  if (districtLower && districtLower.length >= 3 && combinedAddressText.includes(districtLower)) return true;
  if (upazilaLower && upazilaLower.length >= 3 && combinedAddressText.includes(upazilaLower)) return true;

  // 2. Specific prefix matching (e.g. "mym" for "Mymensingh")
  const addrWords = combinedAddressText.split(/[\s,.-]+/).filter(Boolean);
  if (cityLower.length >= 3 && addrWords.includes(cityLower.slice(0, 3))) {
    return true;
  }

  // 3. Filter specific non-generic tokens
  const nameTokens = zoneNameLower
    .split(/[\s,&/-]+/)
    .filter((t) => t.length >= 3 && !GENERIC_STOP_WORDS.has(t));
  const addrTokens = combinedAddressText
    .split(/[\s,.-]+/)
    .filter((t) => t.length >= 3 && !GENERIC_STOP_WORDS.has(t));

  for (const nTok of nameTokens) {
    for (const aTok of addrTokens) {
      if (
        nTok === aTok ||
        (nTok.length >= 4 && aTok.includes(nTok)) ||
        (aTok.length >= 4 && nTok.includes(aTok))
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Resolves the accurate Zone and computes dynamic delivery fee for an address and restaurant
 */
export function resolveZoneDeliveryFee(params: {
  address: TAddress | null | undefined;
  allZones: IZone[];
  restaurant?: any | null;
  fallbackBaseFee?: number;
  activeLocation?: { lat?: number; lng?: number; zoneName?: string } | null;
}): IResolvedDeliveryFee {
  const {
    address,
    allZones = [],
    restaurant,
    fallbackBaseFee = 40,
    activeLocation,
  } = params;

  if (!allZones || allZones.length === 0) {
    return {
      deliveryFee: fallbackBaseFee,
      baseFee: fallbackBaseFee,
      perKmFee: 0,
      zoneName: null,
      matchedZone: null,
      resolutionSource: "GLOBAL_FALLBACK",
    };
  }

  const restLat = Number(
    restaurant?.address?.coordinates?.latitude ||
      restaurant?.latitude ||
      restaurant?.coordinates?.latitude
  );
  const restLng = Number(
    restaurant?.address?.coordinates?.longitude ||
      restaurant?.longitude ||
      restaurant?.coordinates?.longitude
  );
  const hasRestCoords =
    Number.isFinite(restLat) &&
    Number.isFinite(restLng) &&
    (restLat !== 0 || restLng !== 0);

  // 1. Check Address GPS Coordinates if available
  const addrLat = Number(address?.latitude);
  const addrLng = Number(address?.longitude);
  const hasValidCoords =
    Number.isFinite(addrLat) &&
    Number.isFinite(addrLng) &&
    (addrLat !== 0 || addrLng !== 0);

  if (hasValidCoords) {
    let matchedZone: IZone | null = null;
    let minDistance = Infinity;

    for (const z of allZones) {
      if (!z.isActive && z.isActive !== undefined) continue;
      const zLat = Number(z.centerCoordinates?.latitude);
      const zLng = Number(z.centerCoordinates?.longitude);
      if (Number.isFinite(zLat) && Number.isFinite(zLng)) {
        const dist = getHaversineDistanceKm(addrLat, addrLng, zLat, zLng);
        if (dist <= (z.maxDeliveryRadiusKm || z.radiusKm || 10)) {
          if (dist < minDistance) {
            minDistance = dist;
            matchedZone = z;
          }
        }
      }
    }

    if (matchedZone) {
      let calculatedFee = matchedZone.baseDeliveryFee ?? 30;
      let calculatedDist: number | undefined;

      if (hasRestCoords) {
        calculatedDist = getHaversineDistanceKm(addrLat, addrLng, restLat, restLng);
        calculatedFee = calculateDynamicDeliveryFee(
          calculatedDist,
          matchedZone.baseDeliveryFee ?? 30,
          matchedZone.perKmDeliveryFee ?? 10
        );
      } else if (restaurant?.distanceKm) {
        calculatedDist = Number(restaurant.distanceKm);
        calculatedFee = calculateDynamicDeliveryFee(
          calculatedDist,
          matchedZone.baseDeliveryFee ?? 30,
          matchedZone.perKmDeliveryFee ?? 10
        );
      }

      return {
        deliveryFee: calculatedFee,
        baseFee: matchedZone.baseDeliveryFee ?? 30,
        perKmFee: matchedZone.perKmDeliveryFee ?? 10,
        zoneName: matchedZone.name,
        zoneId: matchedZone.zoneId ?? matchedZone._id,
        distanceKm: calculatedDist,
        matchedZone,
        resolutionSource: "COORDINATES",
      };
    }
  }

  // 2. Text / Area Pattern Matching with Zone Meta (Names, Cities, Upazilas, Districts)
  if (address) {
    const combinedAddressText = [
      address.streetAddress,
      address.area,
      address.building,
      address.postalCode,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    for (const z of allZones) {
      if (!z.isActive && z.isActive !== undefined) continue;
      if (isZoneSpecificTextMatch(combinedAddressText, z)) {
        let calculatedDist: number | undefined;
        let calculatedFee = z.baseDeliveryFee ?? 30;

        const zLat = Number(z.centerCoordinates?.latitude);
        const zLng = Number(z.centerCoordinates?.longitude);

        if (hasRestCoords && Number.isFinite(zLat) && Number.isFinite(zLng)) {
          calculatedDist = getHaversineDistanceKm(zLat, zLng, restLat, restLng);
          calculatedFee = calculateDynamicDeliveryFee(
            calculatedDist,
            z.baseDeliveryFee ?? 30,
            z.perKmDeliveryFee ?? 10
          );
        } else if (restaurant?.distanceKm) {
          calculatedDist = Number(restaurant.distanceKm);
          calculatedFee = calculateDynamicDeliveryFee(
            calculatedDist,
            z.baseDeliveryFee ?? 30,
            z.perKmDeliveryFee ?? 10
          );
        }

        return {
          deliveryFee: calculatedFee,
          baseFee: z.baseDeliveryFee ?? 30,
          perKmFee: z.perKmDeliveryFee ?? 10,
          zoneName: z.name,
          zoneId: z.zoneId ?? z._id,
          distanceKm: calculatedDist,
          matchedZone: z,
          resolutionSource: "TEXT_MATCH",
        };
      }
    }
  }

  // 3. Fallback to Restaurant's Assigned Zone
  if (restaurant) {
    const rZoneId =
      restaurant.zoneId || restaurant.numericZoneId || restaurant.address?.zoneId;
    const rZoneMongoId = restaurant.zoneMongoId || restaurant.zoneObjectId;

    const matchedByRest = allZones.find((z) => {
      if (
        rZoneId !== undefined &&
        (z.zoneId === Number(rZoneId) || String(z.zoneId) === String(rZoneId))
      ) {
        return true;
      }
      if (
        rZoneMongoId &&
        (z._id === String(rZoneMongoId) || z._id?.toString() === String(rZoneMongoId))
      ) {
        return true;
      }
      return false;
    });

    if (matchedByRest) {
      let calculatedDist: number | undefined = restaurant?.distanceKm
        ? Number(restaurant.distanceKm)
        : undefined;

      return {
        deliveryFee: matchedByRest.baseDeliveryFee ?? 30,
        baseFee: matchedByRest.baseDeliveryFee ?? 30,
        perKmFee: matchedByRest.perKmDeliveryFee ?? 10,
        zoneName: matchedByRest.name,
        zoneId: matchedByRest.zoneId ?? matchedByRest._id,
        distanceKm: calculatedDist,
        matchedZone: matchedByRest,
        resolutionSource: "RESTAURANT_ZONE",
      };
    }
  }

  // 4. Global Platform Fallback
  return {
    deliveryFee: fallbackBaseFee,
    baseFee: fallbackBaseFee,
    perKmFee: 0,
    zoneName: null,
    matchedZone: null,
    resolutionSource: "GLOBAL_FALLBACK",
  };
}
