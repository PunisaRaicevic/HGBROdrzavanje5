import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';

export function useRoomAccess() {
  const { user } = useAuth();
  return useQuery<{ canManage: boolean; allowedHotel: string | null; allowedHotels: string[] }>({
    queryKey: ['/api/room-access', user?.id],
    enabled: !!user,
    queryFn: async () => (await apiRequest('GET', '/api/room-access')).json(),
  });
}