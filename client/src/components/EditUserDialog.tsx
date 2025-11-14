import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Save, X } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department: string | null;
  phone: string | null;
  is_active: boolean;
}

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: '',
    department: '',
    phone: '',
    password: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        department: user.department || '',
        phone: user.phone || '',
        password: ''
      });
    }
  }, [user]);

  const updateUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) return;
      
      const payload: any = {
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        department: data.department || null,
        phone: data.phone || null
      };

      // Only include password if it's changed
      if (data.password) {
        payload.password = data.password;
      }

      console.log('[EDIT USER] Sending request for user:', user.id);
      const response = await apiRequest('PATCH', `/api/users/${user.id}`, payload);
      const result = await response.json();
      console.log('[EDIT USER] Success:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Uspeh',
        description: 'Korisnik je uspešno ažuriran.'
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Greška',
        description: error.message || 'Nije moguće ažurirati korisnika.',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.full_name || !formData.role) {
      toast({
        title: 'Greška',
        description: 'Email, ime i uloga su obavezni.',
        variant: 'destructive'
      });
      return;
    }

    updateUserMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Izmeni korisnika</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Puno ime</Label>
              <Input
                id="edit-user-name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                data-testid="input-edit-user-name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input
                id="edit-user-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-edit-user-email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-role">Uloga</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger data-testid="select-edit-user-role">
                  <SelectValue placeholder="Izaberi ulogu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operater">Operater</SelectItem>
                  <SelectItem value="sef">Šef</SelectItem>
                  <SelectItem value="radnik">Radnik</SelectItem>
                  <SelectItem value="serviser">Serviser</SelectItem>
                  <SelectItem value="recepcioner">Recepcioner</SelectItem>
                  <SelectItem value="menadzer">Menadžer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-department">Odjeljenje</Label>
              <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                <SelectTrigger data-testid="select-edit-user-department">
                  <SelectValue placeholder="Izaberi odjeljenje" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tehnicka">Tehnička služba</SelectItem>
                  <SelectItem value="domacinstvo">Domaćinstvo</SelectItem>
                  <SelectItem value="recepcija">Recepcija</SelectItem>
                  <SelectItem value="restoran">Restoran</SelectItem>
                  <SelectItem value="bazen">Bazen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-phone">Telefon</Label>
              <Input
                id="edit-user-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="input-edit-user-phone"
                placeholder="+382 68 123 456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-password">Nova lozinka (opciono)</Label>
              <Input
                id="edit-user-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                data-testid="input-edit-user-password"
                placeholder="Ostavi prazno ako ne menjaš"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-edit-user"
            >
              <X className="w-4 h-4 mr-2" />
              Otkaži
            </Button>
            <Button
              type="submit"
              disabled={updateUserMutation.isPending}
              data-testid="button-save-user"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateUserMutation.isPending ? 'Čuvanje...' : 'Sačuvaj'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
