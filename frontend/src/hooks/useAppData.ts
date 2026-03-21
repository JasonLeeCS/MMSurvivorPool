import { useEffect, useState } from 'react';
import type { AppSnapshot } from '../types/domain';
import { fetchSnapshot } from '../services/api';

export function useAppData() {
  const [data, setData] = useState<AppSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      setLoading(true);
      const snapshot = await fetchSnapshot();
      setData(snapshot);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load pool data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  return { data, loading, error, reload };
}
