import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useCurrencyPreference = () => {
  const { user, updateUserMetadata } = useAuth();
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pref = user?.user_metadata?.preferred_currency
      || localStorage.getItem('preferred_currency')
      || 'USD';
    setDisplayCurrency(pref);
    setLoading(false);
  }, [user]);

  const updateCurrencyPreference = (currency: string) => {
    setDisplayCurrency(currency);
    updateUserMetadata('preferred_currency', currency);
  };

  return { displayCurrency, setDisplayCurrency: updateCurrencyPreference, loading };
};
