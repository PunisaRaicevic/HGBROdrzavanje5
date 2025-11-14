import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addMonths, startOfDay } from "date-fns";
import { sr } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PeriodGranularity = 'day' | 'week' | 'month';

interface PeriodRange {
  start: Date;
  end: Date;
}

interface PeriodPickerProps {
  value?: PeriodRange;
  onChange: (range: PeriodRange) => void;
  granularity?: PeriodGranularity;
  onGranularityChange?: (granularity: PeriodGranularity) => void;
  className?: string;
  "data-testid"?: string;
}

export function PeriodPicker({
  value,
  onChange,
  granularity = 'day',
  onGranularityChange,
  className,
  "data-testid": testId
}: PeriodPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value ? value.start : new Date()
  );

  // Sync selectedDate with controlled value
  useEffect(() => {
    if (value) {
      setSelectedDate(value.start);
    }
  }, [value]);

  const calculateRange = (date: Date, gran: PeriodGranularity): PeriodRange => {
    switch (gran) {
      case 'day':
        const dayStart = startOfDay(date);
        return {
          start: dayStart,
          end: startOfDay(addDays(dayStart, 1))
        };
      case 'week':
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        return { 
          start: weekStart, 
          end: startOfDay(addDays(weekStart, 7))
        };
      case 'month':
        const monthStart = startOfMonth(date);
        return {
          start: monthStart,
          end: startOfMonth(addMonths(monthStart, 1))
        };
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      const range = calculateRange(date, granularity);
      onChange(range);
      setIsOpen(false);
    }
  };

  const formatLabel = () => {
    if (!selectedDate) return "Izaberi period";
    
    const locale = sr;
    
    switch (granularity) {
      case 'day':
        return format(selectedDate, "d. MMM yyyy", { locale });
      case 'week': {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(weekStart, "d. MMM", { locale })} - ${format(weekEnd, "d. MMM yyyy", { locale })}`;
      }
      case 'month':
        return format(selectedDate, "MMMM yyyy", { locale });
    }
  };

  const handleGranularityChange = (newGran: PeriodGranularity) => {
    onGranularityChange?.(newGran);
    if (selectedDate) {
      const range = calculateRange(selectedDate, newGran);
      onChange(range);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Mode Toggle Buttons */}
      <div className="flex items-center border rounded-md w-fit">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2.5 rounded-none border-r text-xs",
            granularity === 'day' && "bg-muted"
          )}
          onClick={() => handleGranularityChange('day')}
          data-testid={`${testId}-mode-day`}
        >
          Dan
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2.5 rounded-none border-r text-xs",
            granularity === 'week' && "bg-muted"
          )}
          onClick={() => handleGranularityChange('week')}
          data-testid={`${testId}-mode-week`}
        >
          Nedjelja
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2.5 rounded-none text-xs",
            granularity === 'month' && "bg-muted"
          )}
          onClick={() => handleGranularityChange('month')}
          data-testid={`${testId}-mode-month`}
        >
          Mjesec
        </Button>
      </div>

      {/* Calendar Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 justify-start text-left font-normal text-xs w-fit min-w-[180px]",
              !selectedDate && "text-muted-foreground"
            )}
            data-testid={testId}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {formatLabel()}
            <ChevronDown className="ml-auto h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            locale={sr}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
