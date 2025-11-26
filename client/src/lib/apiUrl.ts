import { Capacitor } from '@capacitor/core';

// 🔥 Production Backend URL - Reserved VM (radi 24/7)
// VAŽNO: Za mobilne aplikacije UVIJEK koristi hardkodirani URL
// Ne koristiti VITE_API_URL jer Appflow može uključiti development URL
const BACKEND_URL = "https://HGBRTehnickaSluzba.replit.app";

/**
 * Get the full API URL for a given endpoint
 * - Mobile app (Capacitor): uses hardcoded BACKEND_URL to connect to backend server
 * - Web app: uses relative URLs (frontend and backend on same origin)
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Only use full URL for native mobile apps (Capacitor)
  // Web apps (including Replit preview) should use relative URLs
  if (Capacitor.isNativePlatform()) {
    // UVIJEK koristi hardkodirani production URL za mobilne aplikacije
    // NE koristiti import.meta.env.VITE_API_URL jer može biti development URL
    console.log(`[API] Using backend URL: ${BACKEND_URL}`);
    return `${BACKEND_URL}/${cleanEndpoint}`;
  }
  
  // Web app: use relative URLs (same origin)
  return `/${cleanEndpoint}`;
}
