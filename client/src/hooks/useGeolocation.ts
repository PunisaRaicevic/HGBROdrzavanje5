import { useEffect, useRef } from 'react';
import { getApiUrl } from '@/lib/apiUrl';

const LOCATION_INTERVAL_MS = 60000;

export function useGeolocation(userId: string | undefined) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;
    if (!('geolocation' in navigator)) return;

    const sendLocation = (lat: number, lng: number) => {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch(getApiUrl('/api/users/location'), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      }).catch((err) => console.warn('[GEO] Failed to send location:', err.message));
    };

    const fetchAndSend = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
        (err) => console.warn('[GEO] Position unavailable:', err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    };

    fetchAndSend();
    intervalRef.current = setInterval(fetchAndSend, LOCATION_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId]);
}
