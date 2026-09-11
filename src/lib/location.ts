"use client";

import { BANGLADESH_LOCATIONS } from "@/data/bangladeshLocations";

export interface ILocationInfo {
  city: string;
  area: string;
  division?: string;
  district?: string;
  upazila?: string;
  isDetecting: boolean;
  hasRealLocation: boolean;
  error?: string | null;
  lat?: number;
  lng?: number;
}

let cachedLocation: ILocationInfo = {
  city: "Moulvibazar",
  area: "Maulavi Bazar, Moulvibazar",
  division: "Sylhet",
  district: "Moulvibazar",
  upazila: "Maulavi Bazar",
  isDetecting: false,
  hasRealLocation: true,
};

// Hydrate from localStorage on client side if available
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("food_flow_user_location");
    if (saved) {
      const parsed = JSON.parse(saved);
      cachedLocation = { ...cachedLocation, ...parsed, isDetecting: false };
    }
  } catch {}
}

const LISTENERS = new Set<() => void>();

export function notifyLocationListeners() {
  LISTENERS.forEach((cb) => cb());
}

export function subscribeLocation(callback: () => void) {
  LISTENERS.add(callback);
  return () => {
    LISTENERS.delete(callback);
  };
}

export function getRealTimeLocation(): ILocationInfo {
  if (typeof window !== "undefined" && !cachedLocation.hasRealLocation) {
    try {
      const saved = localStorage.getItem("food_flow_user_location");
      if (saved) {
        const parsed = JSON.parse(saved);
        cachedLocation = { ...cachedLocation, ...parsed, isDetecting: false };
      }
    } catch {}
  }
  return cachedLocation;
}

/**
 * Parse reverse-geocode API response into Bangladesh Division, District, and Upazila
 */
export function parseBangladeshHierarchy(rawData: any): {
  division: string;
  district: string;
  upazila: string;
  city: string;
  area: string;
} {
  const principalSubdivision = String(rawData.principalSubdivision || "").trim();
  const cityRaw = String(rawData.city || "").trim();
  const localityRaw = String(rawData.locality || "").trim();
  
  const adminList = Array.isArray(rawData.localityInfo?.administrative)
    ? rawData.localityInfo.administrative
    : [];

  const combinedSearchText = [
    localityRaw,
    cityRaw,
    principalSubdivision,
    ...adminList.map((a: any) => a.name || ""),
  ].join(" ").toLowerCase();

  let foundDivision = "";
  let foundDistrict = "";
  let foundUpazila = "";

  // Helper dictionary of known district aliases to canonical BANGLADESH_LOCATIONS district name
  const DISTRICT_ALIASES: Record<string, { district: string; division: string }> = {
    moulvibazar: { district: "Moulvibazar", division: "Sylhet" },
    maulvibazar: { district: "Moulvibazar", division: "Sylhet" },
    maulavibazar: { district: "Moulvibazar", division: "Sylhet" },
    "maulvi bazar": { district: "Moulvibazar", division: "Sylhet" },
    "moulvi bazar": { district: "Moulvibazar", division: "Sylhet" },
    "maulavi bazar": { district: "Moulvibazar", division: "Sylhet" },
    sreemangal: { district: "Moulvibazar", division: "Sylhet" },
    kamalganj: { district: "Moulvibazar", division: "Sylhet" },
    kulaura: { district: "Moulvibazar", division: "Sylhet" },
    chattogram: { district: "Chattogram", division: "Chattogram" },
    chittagong: { district: "Chattogram", division: "Chattogram" },
    cumilla: { district: "Cumilla", division: "Chattogram" },
    comilla: { district: "Cumilla", division: "Chattogram" },
    bogura: { district: "Bogura", division: "Rajshahi" },
    bogra: { district: "Bogura", division: "Rajshahi" },
    jashore: { district: "Jashore", division: "Khulna" },
    jessore: { district: "Jashore", division: "Khulna" },
    barishal: { district: "Barishal", division: "Barishal" },
    barisal: { district: "Barishal", division: "Barishal" },
    "cox's bazar": { district: "Cox's Bazar", division: "Chattogram" },
    coxsbazar: { district: "Cox's Bazar", division: "Chattogram" },
    "coxs bazar": { district: "Cox's Bazar", division: "Chattogram" },
    mymensingh: { district: "Mymensingh", division: "Mymensingh" },
    dhaka: { district: "Dhaka", division: "Dhaka" },
    gazipur: { district: "Gazipur", division: "Dhaka" },
    narayanganj: { district: "Narayanganj", division: "Dhaka" },
    sylhet: { district: "Sylhet", division: "Sylhet" },
    habiganj: { district: "Habiganj", division: "Sylhet" },
    sunamganj: { district: "Sunamganj", division: "Sylhet" },
  };

  // 1. Check known aliases first
  for (const [alias, info] of Object.entries(DISTRICT_ALIASES)) {
    if (combinedSearchText.includes(alias)) {
      foundDistrict = info.district;
      foundDivision = info.division;
      break;
    }
  }

  // 2. Check for specific Upazila / Postal Code
  for (const divObj of BANGLADESH_LOCATIONS) {
    for (const distObj of divObj.districts) {
      for (const p of distObj.postalCodes) {
        const pNameLower = p.name.toLowerCase();
        if (
          localityRaw.toLowerCase().includes(pNameLower) ||
          cityRaw.toLowerCase().includes(pNameLower)
        ) {
          foundUpazila = p.name;
          if (!foundDistrict) {
            foundDistrict = distObj.name;
            foundDivision = divObj.division;
          }
          break;
        }
      }
      if (foundUpazila) break;
    }
    if (foundUpazila) break;
  }

  // 3. Check all districts in BANGLADESH_LOCATIONS
  if (!foundDistrict) {
    for (const divObj of BANGLADESH_LOCATIONS) {
      for (const distObj of divObj.districts) {
        const distLower = distObj.name.toLowerCase();
        if (combinedSearchText.includes(distLower)) {
          foundDistrict = distObj.name;
          foundDivision = divObj.division;
          break;
        }
      }
      if (foundDistrict) break;
    }
  }

  // 4. Check for Division
  if (!foundDivision) {
    for (const divObj of BANGLADESH_LOCATIONS) {
      const divLower = divObj.division.toLowerCase();
      if (combinedSearchText.includes(divLower)) {
        foundDivision = divObj.division;
        break;
      }
    }
  }

  // Fallbacks
  if (!foundDivision) {
    if (combinedSearchText.includes("dhaka")) foundDivision = "Dhaka";
    else if (combinedSearchText.includes("chittagong") || combinedSearchText.includes("chattogram")) foundDivision = "Chattogram";
    else if (combinedSearchText.includes("sylhet")) foundDivision = "Sylhet";
    else if (combinedSearchText.includes("rajshahi")) foundDivision = "Rajshahi";
    else if (combinedSearchText.includes("khulna")) foundDivision = "Khulna";
    else if (combinedSearchText.includes("barisal") || combinedSearchText.includes("barishal")) foundDivision = "Barishal";
    else if (combinedSearchText.includes("rangpur")) foundDivision = "Rangpur";
    else if (combinedSearchText.includes("mymensingh")) foundDivision = "Mymensingh";
    else foundDivision = "Dhaka";
  }

  if (!foundDistrict) {
    foundDistrict = foundDivision;
  }

  // Clean area representation
  const cleanArea = foundUpazila
    ? `${foundUpazila}, ${foundDistrict}`
    : localityRaw && localityRaw.toLowerCase() !== foundDistrict.toLowerCase()
    ? `${localityRaw}, ${foundDistrict}`
    : `${foundDistrict} Central`;

  return {
    division: foundDivision,
    district: foundDistrict,
    upazila: foundUpazila,
    city: foundDistrict,
    area: cleanArea,
  };
}

export function updateRealTimeLocation(
  city: string,
  area?: string,
  lat?: number,
  lng?: number,
  hierarchy?: { division?: string; district?: string; upazila?: string }
) {
  const cleanCity = city.trim();
  const cleanArea = area ? area.trim() : `${cleanCity} Central`;

  const newLoc = {
    city: cleanCity,
    area: cleanArea,
    division: hierarchy?.division || cachedLocation.division || cleanCity,
    district: hierarchy?.district || cachedLocation.district || cleanCity,
    upazila: hierarchy?.upazila || cachedLocation.upazila || cleanArea,
    lat: lat ?? cachedLocation.lat,
    lng: lng ?? cachedLocation.lng,
    isDetecting: false,
    hasRealLocation: true,
  };

  const isChanged =
    cachedLocation.district !== newLoc.district ||
    cachedLocation.upazila !== newLoc.upazila ||
    cachedLocation.division !== newLoc.division ||
    !cachedLocation.hasRealLocation;

  cachedLocation = newLoc;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("food_flow_user_location", JSON.stringify(newLoc));
    } catch {}
  }

  if (isChanged) {
    notifyLocationListeners();
  }
}

export async function detectRealTimeLocation(): Promise<ILocationInfo> {
  if (typeof window === "undefined") return cachedLocation;

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      cachedLocation = { ...cachedLocation, isDetecting: false };
      return resolve(cachedLocation);
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          const data = await res.json();

          const parsed = parseBangladeshHierarchy(data);

          const newLoc: ILocationInfo = {
            city: parsed.city,
            area: parsed.area,
            division: parsed.division,
            district: parsed.district,
            upazila: parsed.upazila,
            lat,
            lng: lon,
            isDetecting: false,
            hasRealLocation: true,
          };

          const isChanged =
            cachedLocation.district !== newLoc.district ||
            cachedLocation.upazila !== newLoc.upazila ||
            cachedLocation.division !== newLoc.division ||
            !cachedLocation.hasRealLocation;

          cachedLocation = newLoc;

          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("food_flow_user_location", JSON.stringify(newLoc));
            } catch {}
          }

          if (isChanged) {
            notifyLocationListeners();
          }
          resolve(cachedLocation);
        } catch {
          cachedLocation = { ...cachedLocation, isDetecting: false };
          resolve(cachedLocation);
        }
      },
      (err) => {
        console.warn("Geolocation permission or timeout fallback:", err.message);
        cachedLocation = { ...cachedLocation, isDetecting: false };
        resolve(cachedLocation);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  });
}


