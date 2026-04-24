import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type NumberFormatType = 'US' | 'EU' | 'COMPACT' | 'SCIENTIFIC';

export interface NumberFormatOption {
  value: NumberFormatType;
  label: string;
  description: string;
  example: string;
}

export const NUMBER_FORMAT_OPTIONS: NumberFormatOption[] = [
  { value: 'US',         label: 'US Format',         description: 'Comma thousand separator, dot decimal',  example: '1,234.56' },
  { value: 'EU',         label: 'European Format',    description: 'Dot thousand separator, comma decimal',  example: '1.234,56' },
  { value: 'COMPACT',    label: 'Compact Format',     description: 'Short notation with K, M suffixes',      example: '1.23K'    },
  { value: 'SCIENTIFIC', label: 'Scientific Format',  description: 'Scientific notation for large numbers',  example: '1.23e+3'  },
];

export const useNumberFormatPreference = () => {
  const { user, updateUserMetadata } = useAuth();
  const [numberFormat, setNumberFormatState] = useState<NumberFormatType>('US');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pref = (user?.user_metadata?.preferred_number_format as NumberFormatType | undefined)
      || (localStorage.getItem('preferred_number_format') as NumberFormatType | null)
      || 'US';
    setNumberFormatState(pref);
    setLoading(false);
  }, [user]);

  const updateNumberFormatPreference = (format: NumberFormatType) => {
    setNumberFormatState(format);
    updateUserMetadata('preferred_number_format', format);
  };

  const formatNumber = (value: number, options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }) => {
    const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options ?? {};
    try {
      switch (numberFormat) {
        case 'EU':
          return new Intl.NumberFormat('de-DE', { minimumFractionDigits, maximumFractionDigits }).format(value);
        case 'COMPACT':
          return new Intl.NumberFormat('en-US', { notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
        case 'SCIENTIFIC':
          return Math.abs(value) >= 1000
            ? new Intl.NumberFormat('en-US', { notation: 'scientific', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
            : new Intl.NumberFormat('en-US', { minimumFractionDigits, maximumFractionDigits }).format(value);
        default:
          return new Intl.NumberFormat('en-US', { minimumFractionDigits, maximumFractionDigits }).format(value);
      }
    } catch {
      return value.toFixed(maximumFractionDigits);
    }
  };

  return {
    numberFormat,
    setNumberFormat: updateNumberFormatPreference,
    formatNumber,
    loading,
    formatOptions: NUMBER_FORMAT_OPTIONS,
  };
};
