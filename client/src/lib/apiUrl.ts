import { Capacitor } from '@capacitor/core';

// 🔥 Backend URL - ISTI KAO U main.tsx
const BACKEND_URL = "https://0f8348da-785a-4a32-a048-3781e2402d8c-00-1ifebzeou9igx.picard.replit.dev";

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
    // Koristi environment variable ako postoji, inače fallback na hardkodiran URL
    const apiBaseUrl = import.meta.env.VITE_API_URL || BACKEND_URL;
    
    console.log(`[API] Using backend URL: ${apiBaseUrl}`);
    return `${apiBaseUrl}/${cleanEndpoint}`;
  }
  
  // Web app: use relative URLs (same origin)
  return `/${cleanEndpoint}`;
}
