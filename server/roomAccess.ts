// Only explicitly recognized reception accounts may manage hotel rooms.
// Other issue reporters also have the recepcioner role, so role alone is insufficient.
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