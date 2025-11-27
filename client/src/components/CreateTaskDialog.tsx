import { useState, useEffect } from 'react';
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

interface CreateTaskDialogProps {
  trigger?: React.ReactNode;
}

export default function CreateTaskDialog({ trigger }: CreateTaskDialogProps) {
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
  const [recurrenceCount, setRecurrenceCount] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([1]); // 0=Sun, 1=Mon, etc.
  const [selectedMonthDays, setSelectedMonthDays] = useState<number[]>([1]); // Days of month for monthly recurrence
  const [selectedYearDates, setSelectedYearDates] = useState<{month: number, day: number}[]>([{month: 1, day: 1}]); // Dates for yearly recurrence
  const [executionHour, setExecutionHour] = useState(9); // Default 9:00
  const [executionMinute, setExecutionMinute] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);

  // Fetch technicians
  const { data: techniciansResponse } = useQuery<{ technicians: any[] }>({
    queryKey: ['/api/technicians'],
    enabled: open,
  });

  const technicians = techniciansResponse?.technicians || [];

  // Automatically trim selections when recurrenceCount decreases
  useEffect(() => {
    if (recurrenceUnit === 'weeks' && selectedWeekDays.length > recurrenceCount) {
      setSelectedWeekDays(prev => prev.slice(0, recurrenceCount));
    }
    if (recurrenceUnit === 'months' && selectedMonthDays.length > recurrenceCount) {
      setSelectedMonthDays(prev => prev.slice(0, recurrenceCount));
    }
    if (recurrenceUnit === 'years' && selectedYearDates.length > recurrenceCount) {
      setSelectedYearDates(prev => prev.slice(0, recurrenceCount));
    }
  }, [recurrenceCount, recurrenceUnit]);

  // Create task mutation
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
        title: 'Greska / Error',
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
        title: "Greska",
        description: "Popunite Hotel/Zgrada, Blok/Prostorija i opis",
        variant: "destructive",
      });
      return;
    }

    if (selectedTechnicians.length === 0) {
      toast({
        title: "Greska",
        description: "Odaberite najmanje jednog majstora",
        variant: "destructive",
      });
      return;
    }

    if (isRecurring && !startDate) {
      toast({
        title: "Greska",
        description: "Odaberite datum pocetka za ponavljajuce zadatke",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Greska",
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

      const recurrencePattern = buildRecurrencePattern();
      
      // Build start date with time
      let fullStartDate = startDate;
      if (isRecurring && startDate) {
        // Add time component to start date
        const hour = executionHour.toString().padStart(2, '0');
        const minute = executionMinute.toString().padStart(2, '0');
        fullStartDate = `${startDate}T${hour}:${minute}:00`;
      }

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
        recurrence_pattern: isRecurring ? recurrencePattern : 'once',
        recurrence_start_date: isRecurring ? fullStartDate : null,
        recurrence_week_days: isRecurring && recurrenceUnit === 'weeks' ? selectedWeekDays : null,
        recurrence_month_days: isRecurring && recurrenceUnit === 'months' ? selectedMonthDays : null,
        recurrence_year_dates: isRecurring && recurrenceUnit === 'years' ? selectedYearDates : null,
        execution_hour: isRecurring ? executionHour : null,
        execution_minute: isRecurring ? executionMinute : null,
      });

      toast({
        title: "Zadatak Kreiran",
        description: isRecurring
          ? `Ponavljajuci zadatak kreiran (${getRecurrenceLabel(recurrencePattern)}).`
          : "Zadatak je uspesno dodeljen majstorima.",
      });

      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating task:', error);
      const errorMessage = error instanceof Error ? error.message : "Greska pri kreiranju zadatka.";
      toast({
        title: "Greska",
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
    setRecurrenceCount(1);
    setRecurrenceUnit('days');
    setSelectedWeekDays([1]);
    setSelectedMonthDays([1]);
    setSelectedYearDates([{month: 1, day: 1}]);
    setExecutionHour(9);
    setExecutionMinute(0);
    setStartDate('');
    setSelectedTechnicians([]);
  };

  // Build recurrence pattern from selections
  const buildRecurrencePattern = () => {
    return `${recurrenceCount}_${recurrenceUnit}`;
  };

  // Get human-readable label for recurrence
  const getRecurrenceLabel = (pattern: string) => {
    const unitLabels: Record<string, string> = {
      'days': 'dnevno',
      'weeks': 'nedjeljno',
      'months': 'mjesecno',
      'years': 'godisnje'
    };
    
    // Parse custom pattern like "3_weeks"
    const match = pattern.match(/^(\d+)_(\w+)$/);
    if (match) {
      const count = parseInt(match[1]);
      const unit = match[2] as keyof typeof unitLabels;
      if (unitLabels[unit]) {
        if (count === 1 && unit === 'days') {
          return 'Svakog dana';
        }
        if (count === 1) {
          return `1 put ${unitLabels[unit]}`;
        }
        return `${count} puta ${unitLabels[unit]}`;
      }
    }
    
    // Legacy patterns
    const legacyLabels: Record<string, string> = {
      '1_days': 'Svakog dana',
      '1_weeks': '1 put nedjeljno',
      '1_months': '1 put mjesecno',
      '1_years': '1 put godisnje'
    };
    return legacyLabels[pattern] || pattern;
  };

  // Week day names
  const weekDays = [
    { value: 0, label: 'Ned', fullLabel: 'Nedjelja' },
    { value: 1, label: 'Pon', fullLabel: 'Ponedjeljak' },
    { value: 2, label: 'Uto', fullLabel: 'Utorak' },
    { value: 3, label: 'Sri', fullLabel: 'Srijeda' },
    { value: 4, label: 'Cet', fullLabel: 'Cetvrtak' },
    { value: 5, label: 'Pet', fullLabel: 'Petak' },
    { value: 6, label: 'Sub', fullLabel: 'Subota' }
  ];

  const toggleWeekDay = (day: number) => {
    setSelectedWeekDays(prev => {
      if (prev.includes(day)) {
        // Don't allow removing all days
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== day);
      }
      // Limit selection to recurrenceCount days
      if (prev.length >= recurrenceCount) {
        // Replace oldest selection with new one
        return [...prev.slice(1), day].sort();
      }
      return [...prev, day].sort();
    });
  };

  // Check if a day can be selected (for visual feedback)
  const canSelectWeekDay = (day: number) => {
    if (selectedWeekDays.includes(day)) return true;
    return selectedWeekDays.length < recurrenceCount;
  };

  // Toggle month day selection
  const toggleMonthDay = (day: number) => {
    setSelectedMonthDays(prev => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== day).sort((a, b) => a - b);
      }
      if (prev.length >= recurrenceCount) {
        return [...prev.slice(1), day].sort((a, b) => a - b);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const canSelectMonthDay = (day: number) => {
    if (selectedMonthDays.includes(day)) return true;
    return selectedMonthDays.length < recurrenceCount;
  };

  // Month names
  const months = [
    { value: 1, label: 'Jan', fullLabel: 'Januar' },
    { value: 2, label: 'Feb', fullLabel: 'Februar' },
    { value: 3, label: 'Mar', fullLabel: 'Mart' },
    { value: 4, label: 'Apr', fullLabel: 'April' },
    { value: 5, label: 'Maj', fullLabel: 'Maj' },
    { value: 6, label: 'Jun', fullLabel: 'Jun' },
    { value: 7, label: 'Jul', fullLabel: 'Jul' },
    { value: 8, label: 'Avg', fullLabel: 'Avgust' },
    { value: 9, label: 'Sep', fullLabel: 'Septembar' },
    { value: 10, label: 'Okt', fullLabel: 'Oktobar' },
    { value: 11, label: 'Nov', fullLabel: 'Novembar' },
    { value: 12, label: 'Dec', fullLabel: 'Decembar' }
  ];

  // Add year date
  const addYearDate = () => {
    if (selectedYearDates.length < recurrenceCount) {
      setSelectedYearDates(prev => [...prev, { month: 1, day: 1 }]);
    }
  };

  // Remove year date
  const removeYearDate = (index: number) => {
    if (selectedYearDates.length > 1) {
      setSelectedYearDates(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Update year date
  const updateYearDate = (index: number, field: 'month' | 'day', value: number) => {
    setSelectedYearDates(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Get days in month
  const getDaysInMonth = (month: number) => {
    const daysPerMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysPerMonth[month - 1];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button data-testid="button-create-task" variant="default">
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
                    <SelectItem value="Hotel Slovenska plaza">Hotel Slovenska plaza</SelectItem>
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
                    <SelectItem value="low">Moze Sacekati</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Opis problema *</Label>
                <Textarea
                  id="description"
                  placeholder="Opisite zadatak detaljno..."
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
                    <CommandInput placeholder="Pretrazi majstore..." />
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
                      Ponavljajuci zadatak
                    </Label>
                  </div>
                </RadioGroup>

                {isRecurring && (
                  <>
                    {/* Frequency selection - two fields */}
                    <div className="space-y-2">
                      <Label>Frekvencija Ponavljanja</Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {recurrenceUnit === 'days' ? (
                          <span className="text-sm font-medium">Svakog dana</span>
                        ) : (
                          <>
                            <Select 
                              value={recurrenceCount.toString()} 
                              onValueChange={(v) => setRecurrenceCount(parseInt(v))}
                            >
                              <SelectTrigger className="w-20 border bg-muted" data-testid="select-recurrence-count">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {recurrenceUnit === 'weeks' 
                                  ? [1, 2, 3, 4, 5, 6, 7].map(n => (
                                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                    ))
                                  : recurrenceUnit === 'months'
                                    ? [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30].map(n => (
                                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                      ))
                                    : [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 36, 48, 52].map(n => (
                                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                      ))
                                }
                              </SelectContent>
                            </Select>
                            <span className="text-sm text-muted-foreground">puta</span>
                          </>
                        )}
                        <Select 
                          value={recurrenceUnit} 
                          onValueChange={(v) => {
                            const newUnit = v as 'days' | 'weeks' | 'months' | 'years';
                            setRecurrenceUnit(newUnit);
                            // Reset count to 1 when switching to days
                            if (newUnit === 'days') {
                              setRecurrenceCount(1);
                            }
                            // Cap weeks at 7
                            if (newUnit === 'weeks' && recurrenceCount > 7) {
                              setRecurrenceCount(7);
                            }
                            // Cap months at 30
                            if (newUnit === 'months' && recurrenceCount > 30) {
                              setRecurrenceCount(30);
                            }
                          }}
                        >
                          <SelectTrigger className="w-32 border bg-muted" data-testid="select-recurrence-unit">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">dnevno</SelectItem>
                            <SelectItem value="weeks">nedjeljno</SelectItem>
                            <SelectItem value="months">mjesecno</SelectItem>
                            <SelectItem value="years">godisnje</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Week day selection - only for weekly recurrence */}
                    {recurrenceUnit === 'weeks' && (
                      <div className="space-y-2">
                        <Label>Dani u nedjelji ({selectedWeekDays.length}/{recurrenceCount})</Label>
                        <div className="flex flex-wrap gap-1">
                          {weekDays.map(day => {
                            const isSelected = selectedWeekDays.includes(day.value);
                            const canSelect = canSelectWeekDay(day.value);
                            return (
                              <Button
                                key={day.value}
                                type="button"
                                size="sm"
                                variant={isSelected ? 'default' : 'outline'}
                                onClick={() => toggleWeekDay(day.value)}
                                className={cn("w-10", !canSelect && !isSelected && "opacity-40")}
                                disabled={!canSelect && !isSelected}
                                data-testid={`weekday-${day.value}`}
                              >
                                {day.label}
                              </Button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedWeekDays.length < recurrenceCount 
                            ? `Odaberite jos ${recurrenceCount - selectedWeekDays.length} ${recurrenceCount - selectedWeekDays.length === 1 ? 'dan' : 'dana'}`
                            : `Odabrano: ${selectedWeekDays.map(d => weekDays.find(wd => wd.value === d)?.fullLabel).join(', ')}`
                          }
                        </p>
                      </div>
                    )}

                    {/* Month day selection - only for monthly recurrence */}
                    {recurrenceUnit === 'months' && (
                      <div className="space-y-2">
                        <Label>Dani u mjesecu ({selectedMonthDays.length}/{recurrenceCount})</Label>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                            const isSelected = selectedMonthDays.includes(day);
                            const canSelect = canSelectMonthDay(day);
                            return (
                              <Button
                                key={day}
                                type="button"
                                size="sm"
                                variant={isSelected ? 'default' : 'outline'}
                                onClick={() => toggleMonthDay(day)}
                                className={cn("w-9 h-9 p-0", !canSelect && !isSelected && "opacity-40")}
                                disabled={!canSelect && !isSelected}
                                data-testid={`monthday-${day}`}
                              >
                                {day}
                              </Button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedMonthDays.length < recurrenceCount 
                            ? `Odaberite jos ${recurrenceCount - selectedMonthDays.length} ${recurrenceCount - selectedMonthDays.length === 1 ? 'dan' : 'dana'}`
                            : `Odabrano: ${selectedMonthDays.join('., ')}. dan u mjesecu`
                          }
                        </p>
                      </div>
                    )}

                    {/* Year date selection - only for yearly recurrence */}
                    {recurrenceUnit === 'years' && (
                      <div className="space-y-2">
                        <Label>Datumi u godini ({selectedYearDates.length}/{recurrenceCount})</Label>
                        <div className="space-y-2">
                          {selectedYearDates.map((yearDate, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                              <Select 
                                value={yearDate.day.toString()} 
                                onValueChange={(v) => updateYearDate(index, 'day', parseInt(v))}
                              >
                                <SelectTrigger className="w-20 border bg-muted">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: getDaysInMonth(yearDate.month) }, (_, i) => i + 1).map(d => (
                                    <SelectItem key={d} value={d.toString()}>{d}.</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select 
                                value={yearDate.month.toString()} 
                                onValueChange={(v) => updateYearDate(index, 'month', parseInt(v))}
                              >
                                <SelectTrigger className="w-32 border bg-muted">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {months.map(m => (
                                    <SelectItem key={m.value} value={m.value.toString()}>{m.fullLabel}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selectedYearDates.length > 1 && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeYearDate(index)}
                                  className="text-destructive"
                                >
                                  <Plus className="w-4 h-4 rotate-45" />
                                </Button>
                              )}
                            </div>
                          ))}
                          {selectedYearDates.length < recurrenceCount && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={addYearDate}
                              className="w-full"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Dodaj datum ({selectedYearDates.length}/{recurrenceCount})
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedYearDates.length < recurrenceCount 
                            ? `Dodajte jos ${recurrenceCount - selectedYearDates.length} ${recurrenceCount - selectedYearDates.length === 1 ? 'datum' : 'datuma'}`
                            : `Odabrano: ${selectedYearDates.map(d => `${d.day}. ${months.find(m => m.value === d.month)?.label}`).join(', ')}`
                          }
                        </p>
                      </div>
                    )}

                    {/* Execution time */}
                    <div className="space-y-2">
                      <Label>Vrijeme izvrsavanja</Label>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={executionHour.toString()} 
                          onValueChange={(v) => setExecutionHour(parseInt(v))}
                        >
                          <SelectTrigger className="w-20 border bg-muted" data-testid="select-execution-hour">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => i).map(h => (
                              <SelectItem key={h} value={h.toString()}>
                                {h.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-lg font-medium">:</span>
                        <Select 
                          value={executionMinute.toString()} 
                          onValueChange={(v) => setExecutionMinute(parseInt(v))}
                        >
                          <SelectTrigger className="w-20 border bg-muted" data-testid="select-execution-minute">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 15, 30, 45].map(m => (
                              <SelectItem key={m} value={m.toString()}>
                                {m.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground ml-2">sati</span>
                      </div>
                    </div>

                    {/* Start date */}
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Datum Pocetka *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        data-testid="input-start-date"
                        className="bg-muted"
                      />
                    </div>

                    {/* Summary */}
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">
                        <span className="font-medium">Sazetak: </span>
                        Zadatak se izvrsava {getRecurrenceLabel(buildRecurrencePattern()).toLowerCase()}
                        {recurrenceUnit === 'weeks' && selectedWeekDays.length > 0 && (
                          <> ({selectedWeekDays.map(d => weekDays.find(wd => wd.value === d)?.label).join(', ')})</>
                        )}
                        {recurrenceUnit === 'months' && selectedMonthDays.length > 0 && (
                          <> ({selectedMonthDays.join('., ')}. dan)</>
                        )}
                        {recurrenceUnit === 'years' && selectedYearDates.length > 0 && (
                          <> ({selectedYearDates.map(d => `${d.day}. ${months.find(m => m.value === d.month)?.label}`).join(', ')})</>
                        )}
                        {' '}u {executionHour.toString().padStart(2, '0')}:{executionMinute.toString().padStart(2, '0')} sati
                        {startDate && <>, pocevsi od {new Date(startDate).toLocaleDateString('sr-RS')}</>}
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
