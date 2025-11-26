import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Save } from 'lucide-react';

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
}

export default function EditTaskDialog({ open, onOpenChange, taskId }: EditTaskDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'normal' | 'can_wait'>('normal');

  const { data: allTasksResponse } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks'],
    enabled: open && !!taskId,
  });

  const task = allTasksResponse?.tasks?.find(t => t.id === taskId);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setLocation(task.location || '');
      setRoomNumber(task.room_number || '');
      setPriority(task.priority || 'normal');
    }
  }, [task]);

  const updateTaskMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; location: string; room_number: string; priority: string }) => {
      return apiRequest('PATCH', `/api/tasks/${taskId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Uspješno",
        description: "Zadatak je uspješno ažuriran.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message || "Nije moguće ažurirati zadatak.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "Greška",
        description: "Naziv zadatka je obavezan.",
        variant: "destructive",
      });
      return;
    }

    if (!location.trim()) {
      toast({
        title: "Greška",
        description: "Lokacija je obavezna.",
        variant: "destructive",
      });
      return;
    }

    updateTaskMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      room_number: roomNumber.trim(),
      priority,
    });
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-edit-task">
        <DialogHeader>
          <DialogTitle data-testid="text-edit-task-title">Uredi zadatak</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Naziv zadatka</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Unesite naziv zadatka"
              data-testid="input-edit-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Lokacija</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Unesite lokaciju"
              data-testid="input-edit-location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="roomNumber">Broj sobe (opciono)</Label>
            <Input
              id="roomNumber"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="Unesite broj sobe"
              data-testid="input-edit-room"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioritet</Label>
            <Select value={priority} onValueChange={(value: 'urgent' | 'normal' | 'can_wait') => setPriority(value)}>
              <SelectTrigger id="priority" data-testid="select-edit-priority">
                <SelectValue placeholder="Izaberite prioritet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent" data-testid="option-priority-urgent">Hitno</SelectItem>
                <SelectItem value="normal" data-testid="option-priority-normal">Normalno</SelectItem>
                <SelectItem value="can_wait" data-testid="option-priority-can-wait">Može sačekati</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Opis problema</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Unesite opis problema"
              rows={4}
              data-testid="textarea-edit-description"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-edit"
            >
              Otkaži
            </Button>
            <Button
              type="submit"
              disabled={updateTaskMutation.isPending}
              data-testid="button-save-edit"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateTaskMutation.isPending ? 'Čuvanje...' : 'Sačuvaj'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
