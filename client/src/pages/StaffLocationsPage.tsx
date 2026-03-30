/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { setOptions as setMapsOptions, importLibrary as importMapsLibrary } from '@googlemaps/js-api-loader';
import { MapPin, RefreshCw, Wifi, WifiOff, Navigation, List, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { getApiUrl } from '@/lib/apiUrl';

const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444',
  operater: '#f97316',
  sef: '#8b5cf6',
  radnik: '#3b82f6',
  serviser: '#06b6d4',
  recepcioner: '#10b981',
  menadzer: '#f59e0b',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  operater: 'Operater',
  sef: 'Šef',
  radnik: 'Radnik',
  serviser: 'Serviser',
  recepcioner: 'Recepcioner',
  menadzer: 'Menadžer',
};

const HOTEL_CENTER = { lat: 42.2874, lng: 18.8400 };

interface LocationUser {
  id: string;
  full_name: string;
  role: string;
  department: string;
  latitude: number;
  longitude: number;
  location_updated_at: string;
  last_active_at: string;
  is_online: boolean;
}

interface StatusUser {
  id: string;
  full_name: string;
  role: string;
  department: string;
  last_active_at: string | null;
}

interface LocationsData {
  locations: LocationUser[];
  onlineNoGps: StatusUser[];
  offline: StatusUser[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMin < 1) return 'upravo sada';
  if (diffMin < 60) return `prije ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `prije ${diffHours}h`;
  return `prije ${Math.floor(diffHours / 24)}d`;
}

function createMarkerSvg(initials: string, color: string, isOnline: boolean, size = 40): string {
  const borderColor = isOnline ? '#22c55e' : '#9ca3af';
  const opacity = isOnline ? 1 : 0.6;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="${borderColor}" stroke-width="3" opacity="${opacity}"/>
      <text x="${size / 2}" y="${size / 2 + 5}" text-anchor="middle" fill="white" font-size="${size * 0.35}px" font-family="Roboto, Arial, sans-serif" font-weight="600">${initials}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function StaffLocationsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [selectedUser, setSelectedUser] = useState<LocationUser | null>(null);
  const selectedUserRef = useRef<LocationUser | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');

  const isAdmin = user?.role === 'admin';

  const { data: mapsConfig } = useQuery<{ apiKey: string }>({
    queryKey: ['/api/config/maps'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(getApiUrl('/api/config/maps'), { credentials: 'include', headers });
      return res.json();
    },
    staleTime: Infinity,
  });

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery<LocationsData>({
    queryKey: ['/api/users/locations'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(getApiUrl('/api/users/locations'), { credentials: 'include', headers });
      if (!res.ok) throw new Error('Failed to fetch locations');
      return res.json();
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!mapsConfig?.apiKey || mapReady) return;

    setMapsOptions({ key: mapsConfig.apiKey, v: 'weekly' });

    importMapsLibrary('maps').then(({ Map, InfoWindow }) => {
      if (!mapRef.current) return;

      const map = new Map(mapRef.current, {
        center: HOTEL_CENTER,
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      googleMapRef.current = map;
      infoWindowRef.current = new InfoWindow();
      setMapReady(true);
    }).catch((err: Error) => {
      console.error('[MAPS] Failed to load Google Maps:', err);
      setMapError('Nije moguće učitati Google Maps. Provjerite API ključ.');
    });
  }, [mapsConfig?.apiKey, mapReady]);

  const focusOnUser = useCallback((u: LocationUser) => {
    if (!googleMapRef.current) return;
    setSelectedUser(u);
    selectedUserRef.current = u;
    googleMapRef.current.panTo({ lat: u.latitude, lng: u.longitude });
    googleMapRef.current.setZoom(16);

    const marker = markersRef.current.get(u.id);
    if (marker && infoWindowRef.current) {
      infoWindowRef.current.setContent(buildInfoContent(u));
      infoWindowRef.current.open(googleMapRef.current, marker);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLocation('/');
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!mapReady || !googleMapRef.current || !data) return;

    const map = googleMapRef.current;
    const existingIds = new Set(markersRef.current.keys());

    data.locations.forEach((u) => {
      existingIds.delete(u.id);
      const color = ROLE_COLORS[u.role] || '#64748b';
      const iconUrl = createMarkerSvg(getInitials(u.full_name), color, u.is_online);

      if (markersRef.current.has(u.id)) {
        const marker = markersRef.current.get(u.id)!;
        marker.setPosition({ lat: u.latitude, lng: u.longitude });
        marker.setIcon({ url: iconUrl, scaledSize: new google.maps.Size(40, 40), anchor: new google.maps.Point(20, 20) });
      } else {
        const marker = new google.maps.Marker({
          position: { lat: u.latitude, lng: u.longitude },
          map,
          icon: { url: iconUrl, scaledSize: new google.maps.Size(40, 40), anchor: new google.maps.Point(20, 20) },
          title: u.full_name,
        });

        marker.addListener('click', () => {
          setSelectedUser(u);
          selectedUserRef.current = u;
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(buildInfoContent(u));
            infoWindowRef.current.open(map, marker);
          }
        });

        markersRef.current.set(u.id, marker);
      }
    });

    existingIds.forEach((id) => {
      markersRef.current.get(id)?.setMap(null);
      markersRef.current.delete(id);
    });

    if (data.locations.length > 1 && !selectedUserRef.current) {
      const bounds = new google.maps.LatLngBounds();
      data.locations.forEach((u) => bounds.extend({ lat: u.latitude, lng: u.longitude }));
      map.fitBounds(bounds, 80);
    }
  }, [mapReady, data]);

  if (!isAdmin) return null;

  function buildInfoContent(u: LocationUser): string {
    const color = ROLE_COLORS[u.role] || '#64748b';
    const statusDot = u.is_online
      ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-right:4px"></span>Online'
      : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#9ca3af;margin-right:4px"></span>Offline';
    return `
      <div style="font-family:Roboto,Arial,sans-serif;padding:4px 2px;min-width:180px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:13px;flex-shrink:0">${getInitials(u.full_name)}</div>
          <div>
            <div style="font-weight:600;font-size:14px">${u.full_name}</div>
            <div style="font-size:12px;color:#64748b">${ROLE_LABELS[u.role] || u.role}</div>
          </div>
        </div>
        <div style="font-size:12px;color:#374151;line-height:1.6">
          <div>${statusDot}</div>
          ${u.department ? `<div>Odjeljenje: ${u.department}</div>` : ''}
          <div>GPS: ${formatTimeAgo(u.location_updated_at)}</div>
          <div style="color:#9ca3af;font-size:11px">${u.latitude.toFixed(5)}, ${u.longitude.toFixed(5)}</div>
        </div>
      </div>
    `;
  }

  const onlineCount = (data?.locations.filter((u) => u.is_online).length || 0) + (data?.onlineNoGps.length || 0);
  const mapCount = data?.locations.length || 0;
  const offlineCount = data?.offline.length || 0;

  return (
    <div className="flex flex-col h-full" data-testid="staff-locations-page">
      {/* Header */}
      <div className="shrink-0 border-b bg-background">
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocation('/admin')}
              className="md:hidden p-1 rounded-md hover:bg-accent transition-colors"
              data-testid="button-back"
              aria-label="Nazad"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <MapPin className="h-4 w-4 text-primary" />
            <h1 className="text-base font-semibold">Lokacije osoblja</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full" data-testid="badge-online">
              <Wifi className="h-3 w-3" />{onlineCount}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full" data-testid="badge-on-map">
              <Navigation className="h-3 w-3" />{mapCount}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full" data-testid="badge-offline">
              <WifiOff className="h-3 w-3" />{offlineCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              data-testid="button-refresh-locations"
              disabled={isLoading}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {/* Mobile toggle: Mapa / Lista */}
        <div className="md:hidden flex border-t">
          <button
            onClick={() => setMobileView('map')}
            data-testid="toggle-map-view"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors border-b-2 ${
              mobileView === 'map' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'
            }`}
          >
            <MapPin className="h-4 w-4" />
            Mapa
          </button>
          <button
            onClick={() => setMobileView('list')}
            data-testid="toggle-list-view"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors border-b-2 ${
              mobileView === 'list' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent'
            }`}
          >
            <List className="h-4 w-4" />
            Lista
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map panel */}
        <div className={`relative bg-muted flex-1 ${mobileView === 'list' ? 'hidden md:block' : 'block'}`}>
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground p-8">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{mapError}</p>
              </div>
            </div>
          )}
          {!mapError && !mapReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
                <p>Učitavanje mape...</p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* List panel */}
        <div className={`w-full md:w-72 md:shrink-0 border-l bg-background flex-col overflow-hidden ${mobileView === 'map' ? 'hidden md:flex' : 'flex'}`}>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              <Card data-testid="card-on-map">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-blue-600" />
                    Na mapi ({mapCount})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  {(data?.locations.length || 0) === 0 ? (
                    <p className="text-xs text-muted-foreground">Niko nema aktivnu lokaciju</p>
                  ) : (
                    <div className="space-y-1">
                      {data?.locations.map((u) => {
                        const color = ROLE_COLORS[u.role] || '#64748b';
                        return (
                          <button
                            key={u.id}
                            onClick={() => focusOnUser(u)}
                            data-testid={`user-location-${u.id}`}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-accent transition-colors ${selectedUser?.id === u.id ? 'bg-accent' : ''}`}
                          >
                            <div className="relative shrink-0">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                                style={{ backgroundColor: color }}
                              >
                                {getInitials(u.full_name)}
                              </div>
                              <span
                                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background"
                                style={{ backgroundColor: u.is_online ? '#22c55e' : '#9ca3af' }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{u.full_name}</p>
                              <p className="text-xs text-muted-foreground">{formatTimeAgo(u.location_updated_at)}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {(data?.onlineNoGps.length || 0) > 0 && (
                <Card data-testid="card-online-no-gps" className="border-green-200 bg-green-50">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-green-800">
                      <Wifi className="h-4 w-4" />
                      Online - bez GPS ({data?.onlineNoGps.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-0">
                    <div className="space-y-1">
                      {data?.onlineNoGps.map((u) => {
                        const color = ROLE_COLORS[u.role] || '#64748b';
                        return (
                          <div key={u.id} className="flex items-center gap-2 px-2 py-1" data-testid={`user-online-${u.id}`}>
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                              style={{ backgroundColor: color }}
                            >
                              {getInitials(u.full_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate text-green-900">{u.full_name}</p>
                              <p className="text-xs text-green-700">{ROLE_LABELS[u.role] || u.role}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(data?.offline.length || 0) > 0 && (
                <Card data-testid="card-offline" className="border-gray-200 bg-gray-50">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-gray-600">
                      <WifiOff className="h-4 w-4" />
                      Offline ({data?.offline.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-0">
                    <div className="space-y-1">
                      {data?.offline.map((u) => {
                        const color = ROLE_COLORS[u.role] || '#64748b';
                        return (
                          <div key={u.id} className="flex items-center gap-2 px-2 py-1 opacity-60" data-testid={`user-offline-${u.id}`}>
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                              style={{ backgroundColor: color }}
                            >
                              {getInitials(u.full_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate text-gray-700">{u.full_name}</p>
                              <p className="text-xs text-gray-500">
                                {u.last_active_at ? formatTimeAgo(u.last_active_at) : 'Nikad'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedUser && (
                <Card data-testid="card-selected-user" className="border-primary/30 bg-primary/5">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm text-primary">Odabrani korisnik</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                        style={{ backgroundColor: ROLE_COLORS[selectedUser.role] || '#64748b' }}
                      >
                        {getInitials(selectedUser.full_name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{selectedUser.full_name}</p>
                        <p className="text-xs text-muted-foreground">{ROLE_LABELS[selectedUser.role] || selectedUser.role}</p>
                      </div>
                    </div>
                    {selectedUser.department && (
                      <p className="text-xs text-muted-foreground">Odjeljenje: {selectedUser.department}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      GPS: {selectedUser.latitude.toFixed(5)}, {selectedUser.longitude.toFixed(5)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ažurirano: {formatTimeAgo(selectedUser.location_updated_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Zadnja aktivnost: {formatTimeAgo(selectedUser.last_active_at)}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: selectedUser.is_online ? '#22c55e' : '#9ca3af' }}
                      />
                      <span className="text-xs">{selectedUser.is_online ? 'Online' : 'Offline'}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card data-testid="card-legend">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm">Legenda</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(ROLE_LABELS).map(([role, label]) => (
                      <div key={role} className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: ROLE_COLORS[role] || '#64748b' }}
                        />
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {dataUpdatedAt > 0 && (
                <p className="text-xs text-center text-muted-foreground pb-1">
                  Osvježeno: {new Date(dataUpdatedAt).toLocaleTimeString('sr-RS')}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
