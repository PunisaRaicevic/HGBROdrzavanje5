import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Save, X, Repeat } from 'lucide-react';
import { PhotoUpload, PhotoPreview } from './PhotoUpload';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
}

const HOTEL_OPTIONS = [
  "Hotel Slovenska plaža",
  "Hotel Aleksandar",
  "Hotel Mogren",
  "Hotel Palas",
  "Hotel Castellastva",
  "Hotel Palas Lux",
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
  "Vila Cempresa M-blok",
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

const weekDays = [
  { value: 0, label: 'Ned', fullLabel: 'Nedjelja' },
  { value: 1, label: 'Pon', fullLabel: 'Ponedjeljak' },
  { value: 2, label: 'Uto', fullLabel: 'Utorak' },
  { value: 3, label: 'Sri', fullLabel: 'Srijeda' },
  { value: 4, label: 'Čet', fullLabel: 'Četvrtak' },
  { value: 5, label: 'Pet', fullLabel: 'Petak' },
  { value: 6, label: 'Sub', fullLabel: 'Subota' }
];

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
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceCount, setRecurrenceCount] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('days');
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([1]);
  const [selectedMonthDays, setSelectedMonthDays] = useState<number[]>([1]);
  const [selectedYearDates, setSelectedYearDates] = useState<{month: number, day: number}[]>([{month: 1, day: 1}]);
  const [executionHour, setExecutionHour] = useState(9);
  const [executionMinute, setExecutionMinute] = useState(0);

  const { data: allTasksResponse } = useQuery<{ tasks: any[] }>({
    queryKey: ['/api/tasks'],
    enabled: open && !!taskId,
  });

  const task = allTasksResponse?.tasks?.find(t => t.id === taskId);
  const isRecurringTask = task?.is_recurring || task?.parent_task_id;

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

  const parseRecurrencePattern = (pattern: string) => {
    const match = pattern?.match(/^(\d+)_(\w+)$/);
    if (match) {
      return {
        count: parseInt(match[1]),
        unit: match[2] as 'days' | 'weeks' | 'months' | 'years'
      };
    }
    return { count: 1, unit: 'days' as const };
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

      setIsRecurring(task.is_recurring || false);
      if (task.recurrence_pattern) {
        const { count, unit } = parseRecurrencePattern(task.recurrence_pattern);
        setRecurrenceCount(count);
        setRecurrenceUnit(unit);
      }
      if (task.recurrence_week_days && Array.isArray(task.recurrence_week_days)) {
        setSelectedWeekDays(task.recurrence_week_days);
      } else {
        setSelectedWeekDays([1]);
      }
      if (task.recurrence_month_days && Array.isArray(task.recurrence_month_days)) {
        setSelectedMonthDays(task.recurrence_month_days);
      } else {
        setSelectedMonthDays([1]);
      }
      if (task.recurrence_year_dates && Array.isArray(task.recurrence_year_dates)) {
        setSelectedYearDates(task.recurrence_year_dates);
      } else {
        setSelectedYearDates([{month: 1, day: 1}]);
      }
      setExecutionHour(task.execution_hour ?? 9);
      setExecutionMinute(task.execution_minute ?? 0);
    }
  }, [task, open]);

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

  const buildRecurrencePattern = () => {
    return `${recurrenceCount}_${recurrenceUnit}`;
  };

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
    return daysPerMonth[month - 1];
  };

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

    const updateData: any = {
      title: title.trim(),
      description: description.trim(),
      hotel: finalHotel,
      blok: finalBlok,
      soba: soba || null,
      room_number: soba || null,
      priority,
      images: allImages.length > 0 ? allImages : undefined,
    };

    if (isRecurringTask) {
      updateData.is_recurring = isRecurring;
      updateData.recurrence_pattern = isRecurring ? buildRecurrencePattern() : 'once';
      updateData.recurrence_week_days = isRecurring && recurrenceUnit === 'weeks' ? selectedWeekDays : null;
      updateData.recurrence_month_days = isRecurring && recurrenceUnit === 'months' ? selectedMonthDays : null;
      updateData.recurrence_year_dates = isRecurring && recurrenceUnit === 'years' ? selectedYearDates : null;
      updateData.execution_hour = isRecurring ? executionHour : null;
      updateData.execution_minute = isRecurring ? executionMinute : null;
    }

    updateTaskMutation.mutate(updateData);
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
                rows={4}
                data-testid="textarea-edit-description"
              />
            </div>

            {isRecurringTask && (
              <div className="space-y-3 p-3 border rounded-md bg-purple-50 dark:bg-purple-950">
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
                      <RadioGroupItem value="once" id="edit-task-once" data-testid="radio-edit-once" />
                      <Label htmlFor="edit-task-once" className="font-normal cursor-pointer">
                        Jednokratno
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="recurring" id="edit-task-recurring" data-testid="radio-edit-recurring" />
                      <Label htmlFor="edit-task-recurring" className="font-normal cursor-pointer">
                        Ponavljajući zadatak
                      </Label>
                    </div>
                  </RadioGroup>

                  {isRecurring && (
                    <>
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
                                <SelectTrigger className="w-20 border bg-white dark:bg-slate-800" data-testid="select-edit-recurrence-count">
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
                              if (newUnit === 'days') {
                                setRecurrenceCount(1);
                              }
                              if (newUnit === 'weeks' && recurrenceCount > 7) {
                                setRecurrenceCount(7);
                              }
                              if (newUnit === 'months' && recurrenceCount > 30) {
                                setRecurrenceCount(30);
                              }
                            }}
                          >
                            <SelectTrigger className="w-32 border bg-white dark:bg-slate-800" data-testid="select-edit-recurrence-unit">
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
                      </div>

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
                                  data-testid={`edit-weekday-${day.value}`}
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
                                  data-testid={`edit-monthday-${day}`}
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
                                  <SelectTrigger className="w-20 border bg-white dark:bg-slate-800">
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
                                  <SelectTrigger className="w-32 border bg-white dark:bg-slate-800">
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
                                    <X className="w-4 h-4" />
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
                                Dodaj datum
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Vrijeme izvršenja</Label>
                        <div className="flex items-center gap-2">
                          <Select value={executionHour.toString()} onValueChange={(v) => setExecutionHour(parseInt(v))}>
                            <SelectTrigger className="w-20 border bg-white dark:bg-slate-800">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span>:</span>
                          <Select value={executionMinute.toString()} onValueChange={(v) => setExecutionMinute(parseInt(v))}>
                            <SelectTrigger className="w-20 border bg-white dark:bg-slate-800">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 15, 30, 45].map(m => (
                                <SelectItem key={m} value={m.toString()}>{m.toString().padStart(2, '0')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

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
