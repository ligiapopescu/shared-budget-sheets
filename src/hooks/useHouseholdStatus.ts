import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useHouseholdStatus = () => {
  const { user, sheetsService } = useAuth();
  const [isInHousehold, setIsInHousehold] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHouseholdStatus = useCallback(async () => {
    if (!user || !sheetsService) { setLoading(false); return; }
    try {
      setLoading(true);
      const rows = await sheetsService.getWhereMultiple(
        'household_persons',
        r => r[1] === user.id || r[5] === user.id, // user_id col=1, connected_user_id col=5
        r => r,
      );
      if (rows.length > 0) {
        setIsInHousehold(true);
        setHouseholdId(rows[0][2]); // household_id col=2
      } else {
        setIsInHousehold(false);
        setHouseholdId(null);
      }
    } catch (e) {
      console.error('Error checking household status:', e);
      setIsInHousehold(false);
      setHouseholdId(null);
    } finally {
      setLoading(false);
    }
  }, [user, sheetsService]);

  useEffect(() => { checkHouseholdStatus(); }, [checkHouseholdStatus]);

  return { isInHousehold, householdId, loading, refreshStatus: checkHouseholdStatus };
};
