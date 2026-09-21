/**
 * Dynamic Server Base URL Resolver:
 * Automatically uses window.location.hostname when accessed from another PC/phone on the same Wi-Fi/LAN,
 * ensuring seamless API and Socket connectivity across local network devices.
 */
export function getServerBaseUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_SERVER_BASE_URL ||
    process.env.NEXT_PUBLIC_SERVER_API_URL ||
    process.env.NEXT_PUBLIC_API_URL;

  // If in browser and accessed via LAN IP (e.g., 192.168.X.X), dynamically point to that same host on port 5000
  if (
    typeof window !== "undefined" &&
    window.location &&
    window.location.hostname &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    const protocol = window.location.protocol || "http:";
    return `${protocol}//${window.location.hostname}:5000`;
  }

  return (envUrl || "http://localhost:5000")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return `${getServerBaseUrl()}/api`;
}
