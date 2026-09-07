"use client";

export interface ILocationInfo {
  city: string;
  area: string;
  isDetecting: boolean;
  error?: string | null;
  lat?: number;
  lng?: number;
}

let cachedLocation: ILocationInfo = {
  city: "Chattogram",
  area: "GEC, Chattogram",
  isDetecting: false,
};

let storageLoaded = false;

export function loadLocationFromStorage(): ILocationInfo {
  if (typeof window === "undefined" || storageLoaded) return cachedLocation;
  storageLoaded = true;

  const storedCity = localStorage.getItem("foodflow_real_city");
  const storedArea = localStorage.getItem("foodflow_real_area");
  const storedLat = localStorage.getItem("foodflow_real_lat");
  const storedLng = localStorage.getItem("foodflow_real_lng");

  if (storedCity || storedArea) {
    cachedLocation = {
      city: storedCity || "Chattogram",
      area: storedArea || "GEC, Chattogram",
      lat: storedLat ? parseFloat(storedLat) : undefined,
      lng: storedLng ? parseFloat(storedLng) : undefined,
      isDetecting: false,
    };
  }
  return cachedLocation;
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
  return cachedLocation;
}

export function updateRealTimeLocation(city: string, area?: string, lat?: number, lng?: number) {
  if (typeof window === "undefined") return;
  const cleanCity = city.trim();
  const cleanArea = area ? area.trim() : `${cleanCity} Central`;
  cachedLocation = {
    city: cleanCity,
    area: cleanArea,
    lat: lat ?? cachedLocation.lat,
    lng: lng ?? cachedLocation.lng,
    isDetecting: false,
  };
  localStorage.setItem("foodflow_real_city", cleanCity);
  localStorage.setItem("foodflow_real_area", cleanArea);
  if (lat !== undefined) localStorage.setItem("foodflow_real_lat", String(lat));
  if (lng !== undefined) localStorage.setItem("foodflow_real_lng", String(lng));
  notifyLocationListeners();
}

export async function detectRealTimeLocation(): Promise<ILocationInfo> {
  if (typeof window === "undefined") return cachedLocation;

  loadLocationFromStorage();

  cachedLocation = { ...cachedLocation, isDetecting: true };
  notifyLocationListeners();


  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      cachedLocation = { ...cachedLocation, isDetecting: false };
      notifyLocationListeners();
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

          const detectedCityRaw =
            data.city ||
            data.principalSubdivision ||
            data.locality ||
            "Chattogram";

          const detectedAreaRaw =
            data.locality || data.localityInfo?.locality?.[0]?.name || detectedCityRaw;

          let city = "Chattogram";
          const lowerRaw = detectedCityRaw.toLowerCase();
          if (lowerRaw.includes("dhaka")) city = "Dhaka";
          else if (lowerRaw.includes("chittagong") || lowerRaw.includes("chattogram")) city = "Chattogram";
          else if (lowerRaw.includes("sylhet")) city = "Sylhet";
          else if (lowerRaw.includes("rajshahi")) city = "Rajshahi";
          else if (lowerRaw.includes("khulna")) city = "Khulna";
          else if (lowerRaw.includes("barisal") || lowerRaw.includes("barishal")) city = "Barishal";
          else if (lowerRaw.includes("rangpur")) city = "Rangpur";
          else if (lowerRaw.includes("comilla") || lowerRaw.includes("cumilla")) city = "Comilla";
          else if (lowerRaw.includes("mymensingh")) city = "Mymensingh";
          else if (detectedCityRaw) city = detectedCityRaw;

          const area = detectedAreaRaw ? `${detectedAreaRaw}, ${city}` : `${city} Central`;

          cachedLocation = {
            city,
            area,
            lat,
            lng: lon,
            isDetecting: false,
          };

          localStorage.setItem("foodflow_real_city", city);
          localStorage.setItem("foodflow_real_area", area);
          localStorage.setItem("foodflow_real_lat", String(lat));
          localStorage.setItem("foodflow_real_lng", String(lon));
          notifyLocationListeners();
          resolve(cachedLocation);
        } catch {
          cachedLocation = { ...cachedLocation, isDetecting: false };
          notifyLocationListeners();
          resolve(cachedLocation);
        }
      },
      (err) => {
        console.warn("Geolocation permission or timeout fallback:", err.message);
        cachedLocation = { ...cachedLocation, isDetecting: false };
        notifyLocationListeners();
        resolve(cachedLocation);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  });
}
