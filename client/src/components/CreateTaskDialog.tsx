import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { PhotoUpload, PhotoPreview } from './PhotoUpload';

interface CreateTaskDialogProps {
  trigger?: React.ReactNode;
  onSubmit?: (task: any) => void;
}

export default function CreateTaskDialog({ trigger, onSubmit }: CreateTaskDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [hotel, setHotel] = useState('');
  const [customHotel, setCustomHotel] = useState('');
  const [blok, setBlok] = useState('');
  const [customBlok, setCustomBlok] = useState('');
  const [soba, setSoba] = useState('');
  const [priority, setPriority] = useState('normal');
  const [description, setDescription] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<PhotoPreview[]>([]);

  // Create task mutation using centralized apiRequest
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      console.log('[CREATE TASK] Sending request with data:', taskData);
      const response = await apiRequest('POST', '/api/tasks', taskData);
      const result = await response.json();
      console.log('[CREATE TASK] Success:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: Error) => {
      console.error('[CREATE TASK] Error:', error);
      toast({
        title: t('error') || 'Greška',
        description: error.message,
        variant: 'destructive',
      });
    },
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use custom values if "Ostalo" is selected
    const finalHotel = hotel === 'Ostalo' ? customHotel : hotel;
    const finalBlok = blok === 'Ostalo' ? customBlok : blok;

    if (!hotel || !blok || !description) {
      toast({
        title: "Error",
        description: "Please fill in Hotel/Zgrada, Blok/Prostorija, and description",
        variant: "destructive",
      });
      return;
    }

    // Validate custom inputs if "Ostalo" is selected
    if (hotel === 'Ostalo' && !customHotel.trim()) {
      toast({
        title: "Error",
        description: "Please specify the hotel/building name",
        variant: "destructive",
      });
      return;
    }

    if (blok === 'Ostalo' && !customBlok.trim()) {
      toast({
        title: "Error",
        description: "Please specify the block/room",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      const title = soba 
        ? `${finalHotel}, ${finalBlok}, Soba ${soba}`
        : `${finalHotel}, ${finalBlok}`;

      const photoDataUrls = uploadedPhotos.map(photo => photo.dataUrl);

      await createTaskMutation.mutateAsync({
        title,
        description,
        hotel: finalHotel,
        blok: finalBlok,
        soba: soba || null,
        priority,
        userId: user.id,
        userName: user.fullName,
        userDepartment: user.department,
        images: photoDataUrls.length > 0 ? photoDataUrls : undefined,
      });

      toast({
        title: "Task Created",
        description: "Task has been created successfully.",
      });

      setOpen(false);
      setHotel('');
      setCustomHotel('');
      setBlok('');
      setCustomBlok('');
      setSoba('');
      setDescription('');
      setPriority('normal');
      setUploadedPhotos([]);
      
      onSubmit?.({
        title,
        description,
        hotel: finalHotel,
        blok: finalBlok,
        soba,
        priority,
      });
    } catch (error) {
      console.error('Error creating task:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create task. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button data-testid="button-create-task">
            <Plus className="w-4 h-4 mr-2" />
            Kreiraj Zadatak
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-sky-100 dark:bg-sky-950">
        <DialogHeader>
          <DialogTitle>{t('createNewTask')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hotel">{t('hotelBuildingRequired')}</Label>
              <Select value={hotel} onValueChange={(value) => {
                setHotel(value);
                if (value !== 'Ostalo') setCustomHotel('');
              }}>
                <SelectTrigger data-testid="select-hotel">
                  <SelectValue placeholder={t('hotelPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hotel Slovenska plaža">Hotel Slovenska plaža</SelectItem>
                  <SelectItem value="Hotel Aleksandar">Hotel Aleksandar</SelectItem>
                  <SelectItem value="Hotel Mogren">Hotel Mogren</SelectItem>
                  <SelectItem value="Ostalo">Ostalo</SelectItem>
                </SelectContent>
              </Select>
              {hotel === 'Ostalo' && (
                <Input
                  id="custom-hotel"
                  placeholder="Unesite naziv hotela / Enter hotel name"
                  value={customHotel}
                  onChange={(e) => setCustomHotel(e.target.value)}
                  data-testid="input-custom-hotel"
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="blok">{t('blockRoomRequired')}</Label>
              <Select value={blok} onValueChange={(value) => {
                setBlok(value);
                if (value !== 'Ostalo') setCustomBlok('');
              }}>
                <SelectTrigger data-testid="select-blok">
                  <SelectValue placeholder={t('blockPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vila Mirta A-blok">Vila Mirta A-blok</SelectItem>
                  <SelectItem value="Vila Magnolija B-blok">Vila Magnolija B-blok</SelectItem>
                  <SelectItem value="Vila Palmi C-blok">Vila Palmi C-blok</SelectItem>
                  <SelectItem value="Vila Kana D-blok">Vila Kana D-blok</SelectItem>
                  <SelectItem value="Vila Kamelija E-blok">Vila Kamelija E-blok</SelectItem>
                  <SelectItem value="Vila Oleandra F-blok">Vila Oleandra F-blok</SelectItem>
                  <SelectItem value="Vila Limuna G-blok">Vila Limuna G-blok</SelectItem>
                  <SelectItem value="Vila Maslina H-blok">Vila Maslina H-blok</SelectItem>
                  <SelectItem value="Vila Ruzmarin I-blok">Vila Ruzmarin I-blok</SelectItem>
                  <SelectItem value="Vila Lavanda L-blok">Vila Lavanda L-blok</SelectItem>
                  <SelectItem value="Vila Tilija N-blok">Vila Tilija N-blok</SelectItem>
                  <SelectItem value="Vila Pinea O-blok">Vila Pinea O-blok</SelectItem>
                  <SelectItem value="Ostalo">Ostalo</SelectItem>
                </SelectContent>
              </Select>
              {blok === 'Ostalo' && (
                <Input
                  id="custom-blok"
                  placeholder="Unesite blok/prostoriju / Enter block/room"
                  value={customBlok}
                  onChange={(e) => setCustomBlok(e.target.value)}
                  data-testid="input-custom-blok"
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="soba">{t('roomOptional')}</Label>
              <Input
                id="soba"
                placeholder={t('roomPlaceholder')}
                value={soba}
                onChange={(e) => setSoba(e.target.value)}
                data-testid="input-soba"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">{t('priority')}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Hitno</SelectItem>
                  <SelectItem value="normal">Normalno</SelectItem>
                  <SelectItem value="low">Može Sačekati</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis problema *</Label>
              <Textarea
                id="description"
                placeholder="Opišite problem detaljno..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                data-testid="input-task-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Fotografije (opcionalno)</Label>
              <PhotoUpload 
                photos={uploadedPhotos}
                onPhotosChange={setUploadedPhotos}
                label="Upload fotografije problema (max 5MB po slici)"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)} 
              data-testid="button-cancel-task"
              className="flex-1"
            >
              Odustani
            </Button>
            <Button 
              type="submit" 
              data-testid="button-submit-task"
              disabled={createTaskMutation.isPending}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              {createTaskMutation.isPending ? 'Kreiranje...' : 'Kreiraj Zadatak'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
