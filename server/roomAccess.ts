// Reception accounts retain their existing single-hotel scope.
export function receptionHotel(fullName: string): string | null {
  const name = fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ');
  const hotels: Record<string, string> = {
    'recepcija hotel aleksandar': 'Hotel Aleksandar',
    'recepcija slovenska': 'Hotel Slovenska plaža',
    'recepcija slovenska plaza 4': 'Hotel Slovenska plaža',
  };
  return hotels[name] ?? null;
}

const ROOM_HOTELS = ['Hotel Slovenska plaža', 'Hotel Aleksandar'];
const ALL_ROOM_HOTELS = [...ROOM_HOTELS, 'Hotel Mogren', 'Hotel Palas', 'Hotel Castellastva', 'Hotel Palas Lux'];

export function roomAccess(user?: {
  role: string; is_active: boolean; full_name: string; job_title?: string | null;
} | null) {
  const denied = { canManage: false, allowedHotel: null, allowedHotels: [] as string[] };
  if (!user?.is_active) return denied;
  const title = (user.job_title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (!['admin', 'sef', 'operater', 'menadzer', 'recepcioner'].includes(user.role) ||
      /\b(kuvar\w*|kuhar\w*|cook\w*|chef|majstor\w*|serviser\w*|treca\s+lica)\b/.test(title)) return denied;
  if (user.role === 'admin') return { canManage: true, allowedHotel: null, allowedHotels: ALL_ROOM_HOTELS };
  const hotel = user.role === 'recepcioner' ? receptionHotel(user.full_name) : null;
  if (hotel) return { canManage: true, allowedHotel: hotel, allowedHotels: [hotel] };
  // The recepcioner role is also used by housekeepers and other issue reporters.
  // Actual, unassigned reception accounts must not gain access to both hotels.
  if (user.role === 'recepcioner' && /recepci/i.test(`${user.full_name} ${title}`)) return denied;
  return { canManage: true, allowedHotel: null, allowedHotels: ROOM_HOTELS };
}