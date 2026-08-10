import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { validateSobaInput } from '@shared/rooms';
import { BedDouble, CheckCircle, Loader2, History } from 'lucide-react';

export interface OutOfOrderRoom {
  id: string;
  hotel: string;
  room_number: string;
  reason: string;
  status: 'active' | 'resolved';
  created_by_name: string | null;
  created_at: string;
  resolved_by_name: string | null;
  resolved_at: string | null;
}

const HOTELS = [
  'Hotel Slovenska plaža',
  'Hotel Aleksandar',
  'Hotel Mogren',
  'Hotel Palas',
  'Hotel Castellastva',
  'Hotel Palas Lux',
];

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('sr-Latn-ME', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('sr-Latn-ME', { hour: '2-digit', minute: '2-digit' });
}

export default function OutOfOrderRoomsTab() {
  const { toast } = useToast();
  const [hotel, setHotel] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [reason, setReason] = useState('');
  const [filterHotel, setFilterHotel] = useState<string>('all');
  const [showHistory, setShowHistory] = useState(false);

  const { data, isLoading } = useQuery<{ rooms: OutOfOrderRoom[] }>({
    queryKey: ['/api/out-of-order-rooms', '?status=all'],
    refetchInterval: 60000,
  });

  const allRooms = data?.rooms || [];
  const activeRooms = allRooms.filter(r => r.status === 'active');
  const resolvedRooms = allRooms.filter(r => r.status === 'resolved');
  const visibleActive = filterHotel === 'all' ? activeRooms : activeRooms.filter(r => r.hotel === filterHotel);

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/out-of-order-rooms', {
        hotel,
        room_number: roomNumber.trim(),
        reason: reason.trim(),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Sačuvano', description: `Soba ${roomNumber.trim()} je označena kao van funkcije` });
      setRoomNumber('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['/api/out-of-order-rooms'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Greška', description: error.message, variant: 'destructive' });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('PATCH', `/api/out-of-order-rooms/${id}/resolve`);
      return response.json();
    },
    onSuccess: (_data, _id) => {
      toast({ title: 'Sačuvano', description: 'Soba je vraćena u funkciju' });
      queryClient.invalidateQueries({ queryKey: ['/api/out-of-order-rooms'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Greška', description: error.message, variant: 'destructive' });
    },
  });

  const liveSobaError = hotel && roomNumber.trim() ? validateSobaInput(roomNumber.trim(), hotel) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel || !roomNumber.trim() || !reason.trim()) {
      toast({ title: 'Greška', description: 'Popunite hotel, broj sobe i razlog', variant: 'destructive' });
      return;
    }
    if (liveSobaError) {
      toast({ title: 'Greška', description: liveSobaError, variant: 'destructive' });
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BedDouble className="w-5 h-5" />
            Stavi sobu van funkcije
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ooo-hotel">Hotel *</Label>
                <Select value={hotel} onValueChange={setHotel}>
                  <SelectTrigger id="ooo-hotel" data-testid="select-ooo-hotel">
                    <SelectValue placeholder="Izaberite hotel" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOTELS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ooo-room">Broj sobe *</Label>
                <Input
                  id="ooo-room"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="npr. 1001"
                  data-testid="input-ooo-room"
                />
                {liveSobaError && (
                  <p className="text-sm text-destructive" data-testid="text-ooo-room-error">{liveSobaError}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ooo-reason">Razlog (tehnički ili drugi problem) *</Label>
              <Textarea
                id="ooo-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="npr. kvar na klimi, curenje vode, renoviranje..."
                rows={2}
                data-testid="input-ooo-reason"
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-ooo-submit">
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Stavi van funkcije
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
          <CardTitle>Sobe van funkcije ({visibleActive.length})</CardTitle>
          <Select value={filterHotel} onValueChange={setFilterHotel}>
            <SelectTrigger className="w-56" data-testid="select-ooo-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi hoteli</SelectItem>
              {HOTELS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Učitavanje...</p>
          ) : visibleActive.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nema soba van funkcije.</p>
          ) : (
            visibleActive.map(room => (
              <div
                key={room.id}
                className="flex items-start justify-between gap-3 border rounded-lg p-3"
                data-testid={`ooo-room-${room.id}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="destructive">Soba {room.room_number}</Badge>
                    <span className="text-sm font-medium">{room.hotel}</span>
                  </div>
                  <p className="text-sm mt-1">{room.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {room.created_by_name ? `${room.created_by_name} · ` : ''}{formatDate(room.created_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveMutation.mutate(room.id)}
                  disabled={resolveMutation.isPending}
                  data-testid={`button-ooo-resolve-${room.id}`}
                >
                  {resolveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-1" />
                  )}
                  Vrati u funkciju
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div>
        <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} data-testid="button-ooo-history">
          <History className="w-4 h-4 mr-1" />
          {showHistory ? 'Sakrij istoriju' : `Istorija (${resolvedRooms.length})`}
        </Button>
        {showHistory && (
          <Card className="mt-2">
            <CardContent className="pt-4 space-y-2">
              {resolvedRooms.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nema istorije.</p>
              ) : (
                resolvedRooms.map(room => (
                  <div key={room.id} className="text-sm border-b last:border-0 pb-2">
                    <span className="font-medium">Soba {room.room_number}</span> · {room.hotel} · {room.reason}
                    <div className="text-xs text-muted-foreground">
                      Van funkcije: {formatDate(room.created_at)} — Vraćena: {formatDate(room.resolved_at)}
                      {room.resolved_by_name ? ` (${room.resolved_by_name})` : ''}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
