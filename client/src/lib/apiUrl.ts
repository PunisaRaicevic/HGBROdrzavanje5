import { Capacitor } from '@capacitor/core';

/**
 * Get the full API URL for a given endpoint
 * - Mobile app (Capacitor): uses VITE_API_URL to connect to backend server
 * - Web app: uses relative URLs (frontend and backend on same origin)
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Only use full URL for native mobile apps (Capacitor)
  // Web apps (including Replit preview) should use relative URLs
  if (Capacitor.isNativePlatform()) {
    const apiBaseUrl = import.meta.env.VITE_API_URL;
    
    if (!apiBaseUrl) {
      console.error('[API] VITE_API_URL not set for mobile app!');
      throw new Error('VITE_API_URL environment variable is required for mobile apps');
    }
    
    return `${apiBaseUrl}/${cleanEndpoint}`;
  }
  
  // Web app: use relative URLs (same origin)
  return `/${cleanEndpoint}`;
}
