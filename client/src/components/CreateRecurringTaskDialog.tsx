import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Camera, X, Send, Calendar, Repeat } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface CreateRecurringTaskDialogProps {
  trigger?: React.ReactNode;
}

type PhotoPreview = {
  id: string;
  dataUrl: string;
};

export default function CreateRecurringTaskDialog({ trigger }: CreateRecurringTaskDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [hotel, setHotel] = useState('');
  const [blok, setBlok] = useState('');
  const [soba, setSoba] = useState('');
  const [priority, setPriority] = useState('normal');
  const [description, setDescription] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<PhotoPreview[]>([]);
  const [recurrencePattern, setRecurrencePattern] = useState<'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('once');
  const [customInterval, setCustomInterval] = useState('1');
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');
  const [endDate, setEndDate] = useState('');
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);

  // Fetch technicians
  const { data: techniciansResponse } = useQuery<{ technicians: any[] }>({
    queryKey: ['/api/technicians'],
    enabled: open,
  });

  const technicians = techniciansResponse?.technicians || [];

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      console.log('[CREATE RECURRING TASK] Sending request with data:', taskData);
      const response = await apiRequest('POST', '/api/tasks', taskData);
      const result = await response.json();
      console.log('[CREATE RECURRING TASK] Success:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error: Error) => {
      console.error('[CREATE RECURRING TASK] Error:', error);
      toast({
        title: 'Greška / Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Neispravna datoteka",
          description: "Molim Vas izaberite sliku (JPG, PNG, itd.)",
          variant: "destructive",
        });
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Datoteka prevelika",
          description: "Slika mora biti manja od 5MB",
          variant: "destructive",
        });
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newPhoto: PhotoPreview = {
          id: `photo-${Date.now()}-${i}`,
          dataUrl,
        };
        setUploadedPhotos(prev => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    }

    event.target.value = '';
  };

  const handleRemovePhoto = (photoId: string) => {
    setUploadedPhotos(uploadedPhotos.filter(p => p.id !== photoId));
  };

  const toggleTechnician = (techId: string) => {
    setSelectedTechnicians(prev => 
      prev.includes(techId) 
        ? prev.filter(id => id !== techId)
        : [...prev, techId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hotel || !blok || !description) {
      toast({
        title: "Greška",
        description: "Popunite Hotel/Zgrada, Blok/Prostorija i opis",
        variant: "destructive",
      });
      return;
    }

    if (selectedTechnicians.length === 0) {
      toast({
        title: "Greška",
        description: "Odaberite najmanje jednog majstora",
        variant: "destructive",
      });
      return;
    }

    if (recurrencePattern !== 'once' && !endDate) {
      toast({
        title: "Greška",
        description: "Odaberite datum kraja za ponavljajuće zadatke",
        variant: "destructive",
      });
      return;
    }

    if (recurrencePattern === 'custom') {
      const interval = parseInt(customInterval, 10);
      if (isNaN(interval) || interval <= 0) {
        toast({
          title: "Greška",
          description: "Interval mora biti pozitivan broj",
          variant: "destructive",
        });
        return;
      }
    }

    if (!user) {
      toast({
        title: "Greška",
        description: "Korisnik nije autentifikovan",
        variant: "destructive",
      });
      return;
    }

    try {
      const title = soba 
        ? `${hotel}, ${blok}, Soba ${soba}`
        : `${hotel}, ${blok}`;

      const photoDataUrls = uploadedPhotos.map(photo => photo.dataUrl);

      // Get selected technician names
      const selectedTechNames = technicians
        .filter(t => selectedTechnicians.includes(t.id))
        .map(t => t.full_name)
        .join(', ');

      // Build recurrence pattern string
      let finalRecurrencePattern: string = recurrencePattern;
      if (recurrencePattern === 'custom') {
        // Format: "3_days", "4_months", etc.
        finalRecurrencePattern = `${customInterval}_${customUnit}`;
      }

      await createTaskMutation.mutateAsync({
        title,
        description,
        hotel,
        blok,
        soba: soba || null,
        priority,
        userId: user.id,
        userName: user.fullName,
        userDepartment: user.department,
        images: photoDataUrls.length > 0 ? photoDataUrls : undefined,
        status: 'assigned_to_radnik',
        assigned_to: selectedTechnicians.join(','),
        assigned_to_name: selectedTechNames,
        is_recurring: recurrencePattern !== 'once',
        recurrence_pattern: finalRecurrencePattern,
        recurrence_end_date: recurrencePattern !== 'once' ? endDate : null,
      });

      toast({
        title: "Zadatak Kreiran",
        description: recurrencePattern === 'once' 
          ? "Zadatak je uspešno dodeljen majstorima."
          : `Ponavljajući zadatak kreiran (${getRecurrenceLabel(recurrencePattern)}).`,
      });

      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating task:', error);
      const errorMessage = error instanceof Error ? error.message : "Greška pri kreiranju zadatka.";
      toast({
        title: "Greška",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setHotel('');
    setBlok('');
    setSoba('');
    setDescription('');
    setPriority('normal');
    setUploadedPhotos([]);
    setRecurrencePattern('once');
    setCustomInterval('1');
    setCustomUnit('days');
    setEndDate('');
    setSelectedTechnicians([]);
  };

  const getUnitLabel = (unit: string, count: number = 1) => {
    const labels: Record<string, [string, string]> = {
      'days': ['dan', 'dana'],
      'weeks': ['nedelju', 'nedelje'],
      'months': ['mesec', 'meseca'],
      'years': ['godinu', 'godine']
    };
    const [singular, plural] = labels[unit] || [unit, unit];
    return count === 1 ? singular : plural;
  };

  const getRecurrenceLabel = (pattern: string) => {
    switch (pattern) {
      case 'once': return 'Jednokratno';
      case 'daily': return 'Dnevno';
      case 'weekly': return 'Nedeljno';
      case 'monthly': return 'Mesečno';
      case 'yearly': return 'Godišnje';
      case 'custom': {
        const interval = parseInt(customInterval, 10);
        return `Svakih ${interval} ${getUnitLabel(customUnit, interval)}`;
      }
      default: {
        // Parse custom pattern from database (e.g., "3_days")
        const parts = pattern.split('_');
        if (parts.length === 2) {
          const interval = parseInt(parts[0], 10);
          const unit = parts[1];
          return `Svakih ${interval} ${getUnitLabel(unit, interval)}`;
        }
        return pattern;
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button data-testid="button-create-recurring-task" variant="default">
            <Repeat className="w-4 h-4 mr-2" />
            Dodeli Zadatak
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Dodeli Zadatak Majstorima
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Task Details */}
            <div className="space-y-4 p-4 border rounded-md">
              <h4 className="font-medium text-sm">Detalji Zadatka</h4>
              
              <div className="space-y-2">
                <Label htmlFor="hotel">Hotel/Zgrada *</Label>
                <Input
                  id="hotel"
                  placeholder="npr. Hotel Grand, Zgrada A..."
                  value={hotel}
                  onChange={(e) => setHotel(e.target.value)}
                  data-testid="input-hotel"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="blok">Blok/Prostorija *</Label>
                  <Input
                    id="blok"
                    placeholder="npr. Recepcija, Restoran..."
                    value={blok}
                    onChange={(e) => setBlok(e.target.value)}
                    data-testid="input-blok"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="soba">Soba (opcionalno)</Label>
                  <Input
                    id="soba"
                    placeholder="npr. 305, 101..."
                    value={soba}
                    onChange={(e) => setSoba(e.target.value)}
                    data-testid="input-soba"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioritet</Label>
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
                  placeholder="Opišite zadatak detaljno..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  data-testid="input-task-description"
                />
              </div>

              <div className="space-y-2">
                <Label>Fotografije (opcionalno)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="border-2 border-dashed rounded-md p-4 text-center">
                  <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload fotografije (max 5MB po slici)
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePhotoUpload}
                    type="button"
                    data-testid="button-upload-photo"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Upload Fotografiju
                  </Button>
                </div>
                
                {uploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {uploadedPhotos.map((photo) => (
                      <div 
                        key={photo.id} 
                        className="relative aspect-square bg-muted rounded-md overflow-hidden"
                      >
                        <img 
                          src={photo.dataUrl} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => handleRemovePhoto(photo.id)}
                          type="button"
                          data-testid={`button-remove-photo-${photo.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Assign Technicians */}
            <div className="space-y-4 p-4 border rounded-md">
              <h4 className="font-medium text-sm">Dodeli Majstorima *</h4>
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {technicians.map((tech) => (
                  <label 
                    key={tech.id}
                    className="flex items-center space-x-2 p-2 border rounded-md hover-elevate cursor-pointer"
                    data-testid={`tech-option-${tech.id}`}
                  >
                    <Checkbox 
                      checked={selectedTechnicians.includes(tech.id)}
                      onCheckedChange={() => toggleTechnician(tech.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{tech.full_name}</p>
                      <p className="text-xs text-muted-foreground">{tech.department}</p>
                    </div>
                    {tech.shift && (
                      <Badge variant="outline" className="text-xs">
                        {tech.shift === 'day' ? '☀️' : '🌙'}
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
              {selectedTechnicians.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Odabrano: {selectedTechnicians.length} majstor(a)
                </p>
              )}
            </div>

            {/* Recurrence Settings */}
            <div className="space-y-4 p-4 border rounded-md">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                Ponavljanje Zadatka
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="recurrence">Tip Zadatka</Label>
                <Select value={recurrencePattern} onValueChange={(value: any) => setRecurrencePattern(value)}>
                  <SelectTrigger data-testid="select-recurrence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Jednokratno</SelectItem>
                    <SelectItem value="daily">Dnevno</SelectItem>
                    <SelectItem value="weekly">Nedeljno</SelectItem>
                    <SelectItem value="monthly">Mesečno</SelectItem>
                    <SelectItem value="yearly">Godišnje</SelectItem>
                    <SelectItem value="custom">Prilagođeno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recurrencePattern === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customInterval">Svaki/h</Label>
                    <Input
                      id="customInterval"
                      type="number"
                      min="1"
                      max="365"
                      value={customInterval}
                      onChange={(e) => setCustomInterval(e.target.value)}
                      placeholder="npr. 3"
                      data-testid="input-custom-interval"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customUnit">Jedinica</Label>
                    <Select value={customUnit} onValueChange={(value: any) => setCustomUnit(value)}>
                      <SelectTrigger data-testid="select-custom-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Dana</SelectItem>
                        <SelectItem value="weeks">Nedelja</SelectItem>
                        <SelectItem value="months">Meseci</SelectItem>
                        <SelectItem value="years">Godina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {recurrencePattern !== 'once' && (
                <div className="space-y-2">
                  <Label htmlFor="endDate">Datum Kraja *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    data-testid="input-end-date"
                  />
                  <p className="text-xs text-muted-foreground">
                    Zadatak će se automatski kreirati {getRecurrenceLabel(recurrencePattern).toLowerCase()} do ovog datuma
                  </p>
                </div>
              )}
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
              {createTaskMutation.isPending ? 'Kreiranje...' : 'Dodeli Zadatak'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
