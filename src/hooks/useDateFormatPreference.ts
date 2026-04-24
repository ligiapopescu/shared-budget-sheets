import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useDateFormatPreference = () => {
  const { user, updateUserMetadata } = useAuth();
  const [dateFormat, setDateFormatState] = useState('M/dd/yyyy');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pref = (user?.user_metadata?.preferred_date_format as string | undefined)
      || localStorage.getItem('preferred_date_format')
      || 'M/dd/yyyy';
    setDateFormatState(pref);
    setLoading(false);
  }, [user]);

  const updateDateFormatPreference = (format: string) => {
    setDateFormatState(format);
    updateUserMetadata('preferred_date_format', format);
  };

  return { dateFormat, setDateFormat: updateDateFormatPreference, loading };
};
