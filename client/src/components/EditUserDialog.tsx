import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Save, X, Trash2, Eye, EyeOff } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  job_title?: string | null;
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: '',
    job_title: '',
    department: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        job_title: user.job_title || '',
        department: user.department || '',
        phone: user.phone || '',
        password: '',
        confirmPassword: ''
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [user]);

  const updateUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) return;
      
      const payload: any = {
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        job_title: data.job_title || null,
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

  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      return apiRequest('DELETE', `/api/users/${user.id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Uspeh',
        description: 'Korisnik je deaktiviran. Neće moći da se prijavi, ali sva istorija radnji ostaje očuvana.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: error.message || 'Nije moguće deaktivirati korisnika.'
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

    if (formData.password) {
      if (formData.password.length < 4) {
        toast({
          title: 'Greška',
          description: 'Lozinka mora imati najmanje 4 karaktera.',
          variant: 'destructive'
        });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: 'Greška',
          description: 'Lozinke se ne poklapaju.',
          variant: 'destructive'
        });
        return;
      }
    }

    updateUserMutation.mutate(formData);
  };

  const handleDelete = () => {
    deleteUserMutation.mutate();
    setShowDeleteDialog(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Izmeni korisnika</DialogTitle>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              data-testid="button-delete-user"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Obriši
            </Button>
          </div>
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
              <Label htmlFor="edit-user-role">Sistemska uloga *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                required
              >
                <SelectTrigger
                  id="edit-user-role"
                  data-testid="select-edit-user-role"
                  className="min-h-11"
                >
                  <SelectValue placeholder="Izaberi ulogu..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recepcioner">Prijavljivanje reklamacija</SelectItem>
                  <SelectItem value="operater">Operater</SelectItem>
                  <SelectItem value="radnik">Otklanjanje reklamacija</SelectItem>
                  <SelectItem value="sef">Šef</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="serviser">Treća lica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-job-title">Zanimanje / Pozicija</Label>
              <Input
                id="edit-user-job-title"
                placeholder="Npr: Recepcioner, Kuvar, Tehničar..."
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                data-testid="input-edit-user-job-title"
                className="min-h-11"
              />
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
              <div className="relative">
                <Input
                  id="edit-user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  data-testid="input-edit-user-password"
                  placeholder="Ostavi prazno ako ne menjas"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {formData.password && (
              <div className="space-y-2">
                <Label htmlFor="edit-user-confirm-password">Potvrdi novu lozinku</Label>
                <div className="relative">
                  <Input
                    id="edit-user-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    data-testid="input-edit-user-confirm-password"
                    placeholder="Ponovi novu lozinku"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deaktivacija korisnika</AlertDialogTitle>
            <AlertDialogDescription>
              Da li ste sigurni da želite da deaktivirate korisnika <strong>{user?.full_name}</strong>?
              <br /><br />
              Korisnik će biti označen kao neaktivan i neće moći da se prijavi u sistem.
              Sva istorija njegovih radnji (prijave reklamacija, odrađeni zadaci) će ostati sačuvana u evidenciji.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-user"
            >
              Deaktiviraj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
