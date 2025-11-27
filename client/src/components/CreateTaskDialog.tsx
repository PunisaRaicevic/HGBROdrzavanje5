import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  
  // Recurring task options (only for admin)
  const [taskType, setTaskType] = useState<'simple' | 'recurring'>('simple');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceCount, setRecurrenceCount] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([1]);
  const [selectedMonthDays, setSelectedMonthDays] = useState<number[]>([1]);
  const [selectedYearDates, setSelectedYearDates] = useState<{month: number, day: number}[]>([{month: 1, day: 1}]);
  const [executionHour, setExecutionHour] = useState(9);
  const [executionMinute, setExecutionMinute] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [technicianPopoverOpen, setTechnicianPopoverOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Fetch technicians (only for admin when creating recurring tasks)
  const { data: techniciansResponse } = useQuery<{ technicians: any[] }>({
    queryKey: ['/api/technicians'],
    enabled: open && isAdmin && taskType === 'recurring',
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

  const toggleTechnician = (techId: string) => {
    setSelectedTechnicians(prev => 
      prev.includes(techId) 
        ? prev.filter(id => id !== techId)
        : [...prev, techId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use custom values if "Ostalo" is selected
    const finalHotel = hotel === 'Ostalo' ? customHotel : hotel;
    const finalBlok = blok === 'Ostalo' ? customBlok : blok;

    if (!hotel || !blok || !description) {
      toast({
        title: "Greška",
        description: "Popunite Hotel/Zgrada, Blok/Prostorija i opis",
        variant: "destructive",
      });
      return;
    }

    // Validate custom inputs if "Ostalo" is selected
    if (hotel === 'Ostalo' && !customHotel.trim()) {
      toast({
        title: "Greška",
        description: "Unesite naziv hotela/zgrade",
        variant: "destructive",
      });
      return;
    }

    if (blok === 'Ostalo' && !customBlok.trim()) {
      toast({
        title: "Greška",
        description: "Unesite blok/prostoriju",
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

    // Recurring task validation (admin only)
    if (isAdmin && taskType === 'recurring') {
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
    }

    try {
      const title = soba 
        ? `${finalHotel}, ${finalBlok}, Soba ${soba}`
        : `${finalHotel}, ${finalBlok}`;

      const photoDataUrls = uploadedPhotos.map(photo => photo.dataUrl);

      let taskData: any = {
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
      };

      // Add recurring task data for admin
      if (isAdmin && taskType === 'recurring') {
        const selectedTechNames = technicians
          .filter(t => selectedTechnicians.includes(t.id))
          .map(t => t.full_name)
          .join(', ');

        const recurrencePattern = buildRecurrencePattern();
        
        let fullStartDate = startDate;
        if (isRecurring && startDate) {
          const hour = executionHour.toString().padStart(2, '0');
          const minute = executionMinute.toString().padStart(2, '0');
          fullStartDate = `${startDate}T${hour}:${minute}:00`;
        }

        taskData = {
          ...taskData,
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
        };
      }

      await createTaskMutation.mutateAsync(taskData);

      let successMessage = "Zadatak je uspješno kreiran.";
      if (isAdmin && taskType === 'recurring') {
        if (isRecurring) {
          successMessage = `Ponavljajući zadatak kreiran (${getRecurrenceLabel(buildRecurrencePattern())}).`;
        } else {
          successMessage = "Zadatak je uspješno dodijeljen majstorima.";
        }
      }

      toast({
        title: "Zadatak Kreiran",
        description: successMessage,
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
    setTaskType('simple');
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
      'months': 'mjesečno',
      'years': 'godišnje'
    };
    
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
    return pattern;
  };

  // Week day names
  const weekDays = [
    { value: 0, label: 'Ned', fullLabel: 'Nedjelja' },
    { value: 1, label: 'Pon', fullLabel: 'Ponedjeljak' },
    { value: 2, label: 'Uto', fullLabel: 'Utorak' },
    { value: 3, label: 'Sri', fullLabel: 'Srijeda' },
    { value: 4, label: 'Čet', fullLabel: 'Četvrtak' },
    { value: 5, label: 'Pet', fullLabel: 'Petak' },
    { value: 6, label: 'Sub', fullLabel: 'Subota' }
  ];

  const toggleWeekDay = (day: number) => {
    setSelectedWeekDays(prev => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== day);
      }
      if (prev.length >= recurrenceCount) {
        return [...prev.slice(1), day].sort();
      }
      return [...prev, day].sort();
    });
  };

  const canSelectWeekDay = (day: number) => {
    if (selectedWeekDays.includes(day)) return true;
    return selectedWeekDays.length < recurrenceCount;
  };

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

  const addYearDate = () => {
    if (selectedYearDates.length < recurrenceCount) {
      setSelectedYearDates(prev => [...prev, { month: 1, day: 1 }]);
    }
  };

  const removeYearDate = (index: number) => {
    if (selectedYearDates.length > 1) {
      setSelectedYearDates(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateYearDate = (index: number, field: 'month' | 'day', value: number) => {
    setSelectedYearDates(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const getDaysInMonth = (month: number) => {
    const daysPerMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return daysPerMonth[month - 1] || 31;
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
            {/* Admin: Task type selection */}
            {isAdmin && (
              <div className="space-y-2">
                <Label>Tip zadatka</Label>
                <RadioGroup 
                  value={taskType} 
                  onValueChange={(value) => {
                    setTaskType(value as 'simple' | 'recurring');
                    if (value === 'simple') {
                      setIsRecurring(false);
                      setSelectedTechnicians([]);
                    }
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="simple" id="task-type-simple" />
                    <Label htmlFor="task-type-simple" className="cursor-pointer">Jednostavan (šalje se šefu)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recurring" id="task-type-recurring" />
                    <Label htmlFor="task-type-recurring" className="cursor-pointer">Sa dodjelom majstoru</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

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

            {/* Admin recurring task options */}
            {isAdmin && taskType === 'recurring' && (
              <>
                {/* Technician Selection */}
                <div className="space-y-2">
                  <Label>Odaberi majstore *</Label>
                  <Popover open={technicianPopoverOpen} onOpenChange={setTechnicianPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={technicianPopoverOpen}
                        className="w-full justify-between"
                        data-testid="button-select-technicians"
                      >
                        {selectedTechnicians.length > 0
                          ? `${selectedTechnicians.length} majstor(a) odabrano`
                          : "Odaberi majstore..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Pretraži majstore..." />
                        <CommandList>
                          <CommandEmpty>Nema pronađenih majstora.</CommandEmpty>
                          <CommandGroup>
                            {technicians.map((tech) => (
                              <CommandItem
                                key={tech.id}
                                value={tech.full_name}
                                onSelect={() => toggleTechnician(tech.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedTechnicians.includes(tech.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {tech.full_name}
                                {tech.job_title && <span className="ml-2 text-muted-foreground text-xs">({tech.job_title})</span>}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedTechnicians.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {technicians
                        .filter(t => selectedTechnicians.includes(t.id))
                        .map(tech => (
                          <span 
                            key={tech.id} 
                            className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                          >
                            {tech.full_name}
                          </span>
                        ))
                      }
                    </div>
                  )}
                </div>

                {/* Recurring Toggle */}
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="is-recurring"
                    checked={isRecurring}
                    onCheckedChange={(checked) => setIsRecurring(checked === true)}
                    data-testid="checkbox-recurring"
                  />
                  <Label htmlFor="is-recurring" className="cursor-pointer flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    Ponavljajući zadatak
                  </Label>
                </div>

                {isRecurring && (
                  <div className="space-y-4 pt-2 border-t">
                    {/* Recurrence frequency */}
                    <div className="space-y-2">
                      <Label>Učestalost ponavljanja</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={recurrenceCount}
                          onChange={(e) => setRecurrenceCount(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                          className="w-20"
                          data-testid="input-recurrence-count"
                        />
                        <span className="text-sm">puta</span>
                        <Select value={recurrenceUnit} onValueChange={(val) => setRecurrenceUnit(val as any)}>
                          <SelectTrigger className="w-32" data-testid="select-recurrence-unit">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">dnevno</SelectItem>
                            <SelectItem value="weeks">nedjeljno</SelectItem>
                            <SelectItem value="months">mjesečno</SelectItem>
                            <SelectItem value="years">godišnje</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Primjer: "{recurrenceCount} puta {recurrenceUnit === 'days' ? 'dnevno' : recurrenceUnit === 'weeks' ? 'nedjeljno' : recurrenceUnit === 'months' ? 'mjesečno' : 'godišnje'}"
                      </p>
                    </div>

                    {/* Week days selection */}
                    {recurrenceUnit === 'weeks' && (
                      <div className="space-y-2">
                        <Label>Odaberi {recurrenceCount} dan(a) u nedjelji</Label>
                        <div className="flex flex-wrap gap-2">
                          {weekDays.map((day) => (
                            <Button
                              key={day.value}
                              type="button"
                              variant={selectedWeekDays.includes(day.value) ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleWeekDay(day.value)}
                              disabled={!canSelectWeekDay(day.value)}
                              className={cn(
                                "min-w-[50px]",
                                !canSelectWeekDay(day.value) && "opacity-50"
                              )}
                            >
                              {day.label}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Odabrano: {selectedWeekDays.map(d => weekDays.find(w => w.value === d)?.fullLabel).join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Month days selection */}
                    {recurrenceUnit === 'months' && (
                      <div className="space-y-2">
                        <Label>Odaberi {recurrenceCount} dan(a) u mjesecu</Label>
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <Button
                              key={day}
                              type="button"
                              variant={selectedMonthDays.includes(day) ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleMonthDay(day)}
                              disabled={!canSelectMonthDay(day)}
                              className={cn(
                                "h-8 w-8 p-0",
                                !canSelectMonthDay(day) && "opacity-50"
                              )}
                            >
                              {day}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Odabrano: {selectedMonthDays.join('. ')}. dan u mjesecu
                        </p>
                      </div>
                    )}

                    {/* Year dates selection */}
                    {recurrenceUnit === 'years' && (
                      <div className="space-y-2">
                        <Label>Odaberi {recurrenceCount} datum(a) u godini</Label>
                        <div className="space-y-2">
                          {selectedYearDates.map((dateObj, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Select
                                value={dateObj.month.toString()}
                                onValueChange={(val) => updateYearDate(index, 'month', parseInt(val))}
                              >
                                <SelectTrigger className="w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {months.map((m) => (
                                    <SelectItem key={m.value} value={m.value.toString()}>
                                      {m.fullLabel}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={dateObj.day.toString()}
                                onValueChange={(val) => updateYearDate(index, 'day', parseInt(val))}
                              >
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: getDaysInMonth(dateObj.month) }, (_, i) => i + 1).map((d) => (
                                    <SelectItem key={d} value={d.toString()}>
                                      {d}.
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selectedYearDates.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeYearDate(index)}
                                >
                                  Ukloni
                                </Button>
                              )}
                            </div>
                          ))}
                          {selectedYearDates.length < recurrenceCount && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addYearDate}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Dodaj datum
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Execution time */}
                    <div className="space-y-2">
                      <Label>Vrijeme izvršenja</Label>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={executionHour.toString()} 
                          onValueChange={(val) => setExecutionHour(parseInt(val))}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {i.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span>:</span>
                        <Select 
                          value={executionMinute.toString()} 
                          onValueChange={(val) => setExecutionMinute(parseInt(val))}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 15, 30, 45].map((m) => (
                              <SelectItem key={m} value={m.toString()}>
                                {m.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Start date */}
                    <div className="space-y-2">
                      <Label>Datum početka *</Label>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-auto"
                          data-testid="input-start-date"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
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
