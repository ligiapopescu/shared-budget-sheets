import React, { useEffect, useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDateFormatPreference } from '@/hooks/useDateFormatPreference';

interface DatePickerInputProps {
  id?: string;
  value: string; // expects ISO date string: yyyy-MM-dd
  onChange: (value: string) => void;
  onCommit?: () => void; // called after a date is selected
  placeholder?: string;
  required?: boolean;
  className?: string;
}

const parseISODate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const d = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : undefined;
};

const DatePickerInput: React.FC<DatePickerInputProps> = ({
  id,
  value,
  onChange,
  onCommit,
  placeholder = 'Pick a date',
  required,
  className,
}) => {
  const { dateFormat } = useDateFormatPreference();
  const selected = parseISODate(value);
  const [month, setMonth] = useState<Date>(
    selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : new Date()
  );

  useEffect(() => {
    if (selected) {
      setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }, [value]);

  const handleSelect = (date?: Date) => {
    if (!date || !isValid(date)) return;
    const iso = format(date, 'yyyy-MM-dd');
    onChange(iso);
    onCommit?.();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'w-[240px] justify-start text-left font-normal',
            !selected && 'text-muted-foreground',
            className
          )}
          aria-required={required}
        >
          {selected ? (
            <>
              <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
              {format(selected, dateFormat)}
            </>
          ) : (
            <>
              <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
              <span>{placeholder}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
};

export default DatePickerInput;
