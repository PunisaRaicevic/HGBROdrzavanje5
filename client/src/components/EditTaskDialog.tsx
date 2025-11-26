import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Save, X } from 'lucide-react';
import { PhotoUpload, PhotoPreview } from './PhotoUpload';
import { useTranslation } from 'react-i18next';

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
}

const HOTEL_OPTIONS = [
  "Hotel Slovenska plaža",
  "Hotel Aleksandar",
  "Hotel Mogren",
];

const BLOK_OPTIONS = [
  "Vila Mirta A-blok",
  "Vila Magnolija B-blok",
  "Vila Palmi C-blok",
  "Vila Kana D-blok",
  "Vila Kamelija E-blok",
  "Vila Oleandra F-blok",
  "Vila Limuna G-blok",
  "Vila Maslina H-blok",
  "Vila Ruzmarin I-blok",
  "Vila Lavanda L-blok",
  "Vila Tilija N-blok",
  "Vila Pinea O-blok",
  "Recepcija",
  "Kuhinja",
  "Restoran",
  "Praonica",
  "Tehnicka soba",
  "Bazen",
  "Parking",
  "Dvoriste",
];

export default function EditTaskDialog({ open, onOpenChange, taskId }: EditTaskDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [hotel, setHotel] = useState('');
  const [customHotel, setCustomHotel] = useState('');
  const [blok, setBlok] = useState('');
  const [customBlok, setCustomBlok] = useState('');
  const [soba, setSoba] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'normal' | 'low'>('normal');
  const [description, setDescription] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<PhotoPreview[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  const { data: allTasksResponse } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks'],
    enabled: open && !!taskId,
  });

  const task = allTasksResponse?.tasks?.find(t => t.id === taskId);

  const parseLocationFromTitle = (title: string) => {
    const parts = title.split(',').map(p => p.trim());
    let parsedHotel = '';
    let parsedBlok = '';
    let parsedSoba = '';

    if (parts.length >= 1) {
      const hotelPart = parts[0];
      if (HOTEL_OPTIONS.includes(hotelPart)) {
        parsedHotel = hotelPart;
      } else {
        parsedHotel = 'Ostalo';
      }
    }

    if (parts.length >= 2) {
      const blokPart = parts[1];
      if (blokPart.toLowerCase().startsWith('soba ')) {
        parsedSoba = blokPart.replace(/^soba\s*/i, '');
      } else if (BLOK_OPTIONS.includes(blokPart)) {
        parsedBlok = blokPart;
      } else {
        parsedBlok = 'Ostalo';
      }
    }

    if (parts.length >= 3) {
      const sobaPart = parts[2];
      if (sobaPart.toLowerCase().startsWith('soba ')) {
        parsedSoba = sobaPart.replace(/^soba\s*/i, '');
      }
    }

    return { parsedHotel, parsedBlok, parsedSoba };
  };

  useEffect(() => {
    if (task && open) {
      if (task.hotel) {
        if (HOTEL_OPTIONS.includes(task.hotel)) {
          setHotel(task.hotel);
          setCustomHotel('');
        } else {
          setHotel('Ostalo');
          setCustomHotel(task.hotel);
        }
      } else {
        const { parsedHotel } = parseLocationFromTitle(task.title || '');
        if (parsedHotel === 'Ostalo') {
          setHotel('Ostalo');
          const parts = (task.title || '').split(',').map((p: string) => p.trim());
          setCustomHotel(parts[0] || '');
        } else if (parsedHotel) {
          setHotel(parsedHotel);
          setCustomHotel('');
        }
      }

      if (task.blok) {
        if (BLOK_OPTIONS.includes(task.blok)) {
          setBlok(task.blok);
          setCustomBlok('');
        } else {
          setBlok('Ostalo');
          setCustomBlok(task.blok);
        }
      } else {
        const { parsedBlok } = parseLocationFromTitle(task.title || '');
        if (parsedBlok === 'Ostalo') {
          setBlok('Ostalo');
          const parts = (task.title || '').split(',').map((p: string) => p.trim());
          if (parts.length >= 2 && !parts[1].toLowerCase().startsWith('soba ')) {
            setCustomBlok(parts[1] || '');
          }
        } else if (parsedBlok) {
          setBlok(parsedBlok);
          setCustomBlok('');
        }
      }

      if (task.soba) {
        setSoba(task.soba);
      } else if (task.room_number) {
        setSoba(task.room_number);
      } else {
        const { parsedSoba } = parseLocationFromTitle(task.title || '');
        setSoba(parsedSoba);
      }

      setPriority(task.priority || 'normal');
      setDescription(task.description || '');
      setExistingImages(task.images || []);
      setUploadedPhotos([]);
    }
  }, [task, open]);

  const updateTaskMutation = useMutation({
    mutationFn: async (data: any) => {
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

    const finalHotel = hotel === 'Ostalo' ? customHotel : hotel;
    const finalBlok = blok === 'Ostalo' ? customBlok : blok;

    if (!hotel || !blok) {
      toast({
        title: "Greška",
        description: "Molimo izaberite Hotel/Zgradu i Blok/Prostoriju.",
        variant: "destructive",
      });
      return;
    }

    if (hotel === 'Ostalo' && !customHotel.trim()) {
      toast({
        title: "Greška",
        description: "Molimo unesite naziv hotela/zgrade.",
        variant: "destructive",
      });
      return;
    }

    if (blok === 'Ostalo' && !customBlok.trim()) {
      toast({
        title: "Greška",
        description: "Molimo unesite blok/prostoriju.",
        variant: "destructive",
      });
      return;
    }

    const title = soba 
      ? `${finalHotel}, ${finalBlok}, Soba ${soba}`
      : `${finalHotel}, ${finalBlok}`;

    const newPhotoDataUrls = uploadedPhotos.map(photo => photo.dataUrl);
    const allImages = [...existingImages, ...newPhotoDataUrls];

    updateTaskMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      hotel: finalHotel,
      blok: finalBlok,
      soba: soba || null,
      room_number: soba || null,
      priority,
      images: allImages.length > 0 ? allImages : undefined,
    });
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-sky-100 dark:bg-sky-950" data-testid="dialog-edit-task">
        <DialogHeader>
          <DialogTitle data-testid="text-edit-task-title">Uredi zadatak</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hotel">{t('hotelBuildingRequired')}</Label>
              <Select value={hotel} onValueChange={(value) => {
                setHotel(value);
                if (value !== 'Ostalo') setCustomHotel('');
              }}>
                <SelectTrigger data-testid="select-edit-hotel">
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
                  data-testid="input-edit-custom-hotel"
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
                <SelectTrigger data-testid="select-edit-blok">
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
                  <SelectItem value="Recepcija">Recepcija</SelectItem>
                  <SelectItem value="Kuhinja">Kuhinja</SelectItem>
                  <SelectItem value="Restoran">Restoran</SelectItem>
                  <SelectItem value="Praonica">Praonica</SelectItem>
                  <SelectItem value="Tehnicka soba">Tehnicka soba</SelectItem>
                  <SelectItem value="Bazen">Bazen</SelectItem>
                  <SelectItem value="Parking">Parking</SelectItem>
                  <SelectItem value="Dvoriste">Dvoriste</SelectItem>
                  <SelectItem value="Ostalo">Ostalo</SelectItem>
                </SelectContent>
              </Select>
              {blok === 'Ostalo' && (
                <Input
                  id="custom-blok"
                  placeholder="Unesite blok/prostoriju / Enter block/room"
                  value={customBlok}
                  onChange={(e) => setCustomBlok(e.target.value)}
                  data-testid="input-edit-custom-blok"
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
                data-testid="input-edit-soba"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">{t('priority')}</Label>
              <Select value={priority} onValueChange={(value: 'urgent' | 'normal' | 'low') => setPriority(value)}>
                <SelectTrigger data-testid="select-edit-priority">
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
              <Label htmlFor="description">Opis problema</Label>
              <Textarea
                id="description"
                placeholder="Opišite problem detaljno..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                data-testid="textarea-edit-description"
              />
            </div>

            {existingImages.length > 0 && (
              <div className="space-y-2">
                <Label>Postojeće fotografije</Label>
                <div className="grid grid-cols-3 gap-2">
                  {existingImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={img} 
                        alt={`Slika ${index + 1}`} 
                        className="w-full h-24 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-remove-image-${index}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Dodaj nove fotografije (opcionalno)</Label>
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
              onClick={() => onOpenChange(false)} 
              data-testid="button-cancel-edit"
              className="flex-1"
            >
              Otkaži
            </Button>
            <Button 
              type="submit" 
              data-testid="button-save-edit"
              disabled={updateTaskMutation.isPending}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateTaskMutation.isPending ? 'Čuvanje...' : 'Sačuvaj izmjene'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
