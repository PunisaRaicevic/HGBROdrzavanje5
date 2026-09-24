import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';

export function useRoomAccess() {
  const { user } = useAuth();
  return useQuery<{ canManage: boolean; allowedHotel: string | null; allowedHotels: string[] }>({
    queryKey: ['/api/room-access', user?.id],
    enabled: !!user,
    refetchInterval: 10000,
    queryFn: async () => (await apiRequest('GET', '/api/room-access')).json(),
  });
}