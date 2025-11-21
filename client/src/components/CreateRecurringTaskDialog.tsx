import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Send, Calendar, Repeat, Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PhotoUpload, PhotoPreview } from './PhotoUpload';
import { cn } from '@/lib/utils';

interface CreateRecurringTaskDialogProps {
  trigger?: React.ReactNode;
}

export default function CreateRecurringTaskDialog({ trigger }: CreateRecurringTaskDialogProps) {
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
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('1_days');
  const [startDate, setStartDate] = useState('');
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


  const toggleTechnician = (techId: string) => {
    setSelectedTechnicians(prev => 
      prev.includes(techId) 
        ? prev.filter(id => id !== techId)
        : [...prev, techId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get final values (use custom input if "Ostalo" is selected)
    const finalHotel = hotel === 'Ostalo' ? customHotel : hotel;
    const finalBlok = blok === 'Ostalo' ? customBlok : blok;

    if (!finalHotel || !finalBlok || !description) {
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

    if (isRecurring && !startDate) {
      toast({
        title: "Greška",
        description: "Odaberite datum početka za ponavljajuće zadatke",
        variant: "destructive",
      });
      return;
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
        ? `${finalHotel}, ${finalBlok}, Soba ${soba}`
        : `${finalHotel}, ${finalBlok}`;

      const photoDataUrls = uploadedPhotos.map(photo => photo.dataUrl);

      // Get selected technician names
      const selectedTechNames = technicians
        .filter(t => selectedTechnicians.includes(t.id))
        .map(t => t.full_name)
        .join(', ');

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
        status: 'assigned_to_radnik',
        assigned_to: selectedTechnicians.join(','),
        assigned_to_name: selectedTechNames,
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrenceType : 'once',
        recurrence_start_date: isRecurring ? startDate : null,
      });

      toast({
        title: "Zadatak Kreiran",
        description: isRecurring
          ? `Ponavljajući zadatak kreiran (${getRecurrenceLabel(recurrenceType)}).`
          : "Zadatak je uspešno dodeljen majstorima.",
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
    setCustomHotel('');
    setBlok('');
    setCustomBlok('');
    setSoba('');
    setDescription('');
    setPriority('normal');
    setUploadedPhotos([]);
    setIsRecurring(false);
    setRecurrenceType('1_days');
    setStartDate('');
    setSelectedTechnicians([]);
  };

  const getRecurrenceLabel = (pattern: string) => {
    const labels: Record<string, string> = {
      '1_days': 'Dnevno',
      '3_days': 'Svaka 3 dana',
      '7_days': 'Nedeljno',
      '14_days': 'Dvonedeljno',
      '1_months': 'Mesečno',
      '3_months': 'Tromesečno',
      '6_months': 'Polugodišnje',
      '12_months': 'Godišnje'
    };
    return labels[pattern] || pattern;
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
          <div className="space-y-3 py-3">
            {/* Task Details */}
            <div className="space-y-3 p-3 border rounded-md">
              <h4 className="font-medium text-sm">Detalji Zadatka</h4>
              
              <div className="space-y-2">
                <Label htmlFor="hotel">Hotel/Zgrada *</Label>
                <Select value={hotel} onValueChange={(value) => {
                  setHotel(value);
                  if (value !== 'Ostalo') setCustomHotel('');
                }}>
                  <SelectTrigger data-testid="select-hotel" className="border bg-muted">
                    <SelectValue placeholder="Izaberi hotel/zgradu..." />
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
                    placeholder="Unesite naziv hotela"
                    value={customHotel}
                    onChange={(e) => setCustomHotel(e.target.value)}
                    data-testid="input-custom-hotel"
                    className="mt-2 bg-muted"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="blok">Blok/Prostorija *</Label>
                  <Select value={blok} onValueChange={(value) => {
                    setBlok(value);
                    if (value !== 'Ostalo') setCustomBlok('');
                  }}>
                    <SelectTrigger data-testid="select-blok" className="border bg-muted">
                      <SelectValue placeholder="Izaberi blok..." />
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
                      placeholder="Unesite blok/prostoriju"
                      value={customBlok}
                      onChange={(e) => setCustomBlok(e.target.value)}
                      data-testid="input-custom-blok"
                      className="mt-2 bg-muted"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="soba">Soba (opcionalno)</Label>
                  <Input
                    id="soba"
                    placeholder="npr. 305, 101..."
                    value={soba}
                    onChange={(e) => setSoba(e.target.value)}
                    data-testid="input-soba"
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioritet</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-task-priority" className="border bg-muted">
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
                  className="bg-muted"
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

            {/* Assign Technicians */}
            <div className="space-y-2">
              <Label>Dodeli Majstorima *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between bg-muted"
                    data-testid="button-select-technicians"
                  >
                    {selectedTechnicians.length === 0
                      ? "Izaberi majstore..."
                      : `${selectedTechnicians.length} majstor${selectedTechnicians.length === 1 ? '' : 'a'} odabrano`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pretraži majstore..." />
                    <CommandEmpty>Nema rezultata</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {technicians.map((tech) => (
                          <CommandItem
                            key={tech.id}
                            onSelect={() => toggleTechnician(tech.id)}
                            className="cursor-pointer"
                            data-testid={`tech-option-${tech.id}`}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <Checkbox
                                checked={selectedTechnicians.includes(tech.id)}
                                className="pointer-events-none"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{tech.full_name}</p>
                                <p className="text-xs text-muted-foreground">{tech.department}</p>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedTechnicians.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Odabrano: {technicians.filter(t => selectedTechnicians.includes(t.id)).map(t => t.full_name).join(', ')}
                </p>
              )}
            </div>

            {/* Recurrence Settings */}
            <div className="space-y-3 p-3 border rounded-md">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                Ponavljanje Zadatka
              </h4>
              
              <div className="space-y-3">
                <RadioGroup 
                  value={isRecurring ? "recurring" : "once"} 
                  onValueChange={(value) => setIsRecurring(value === "recurring")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="once" id="task-once" data-testid="radio-once" />
                    <Label htmlFor="task-once" className="font-normal cursor-pointer">
                      Jednokratno
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recurring" id="task-recurring" data-testid="radio-recurring" />
                    <Label htmlFor="task-recurring" className="font-normal cursor-pointer">
                      Ponavljajući zadatak
                    </Label>
                  </div>
                </RadioGroup>

                {isRecurring && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="recurrence-type">Frekvencija Ponavljanja</Label>
                      <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                        <SelectTrigger data-testid="select-recurrence-type" className="border bg-muted">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1_days">Dnevno</SelectItem>
                          <SelectItem value="3_days">Svaka 3 dana</SelectItem>
                          <SelectItem value="7_days">Nedeljno</SelectItem>
                          <SelectItem value="14_days">Dvonedeljno</SelectItem>
                          <SelectItem value="1_months">Mesečno</SelectItem>
                          <SelectItem value="3_months">Tromesečno</SelectItem>
                          <SelectItem value="6_months">Polugodišnje</SelectItem>
                          <SelectItem value="12_months">Godišnje</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startDate">Datum Početka *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        data-testid="input-start-date"
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Zadatak će početi {getRecurrenceLabel(recurrenceType).toLowerCase()} od ovog datuma. Za prekid zadatka koristite dugme Obriši u meniju šefa.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-3">
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
