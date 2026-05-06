import { useState, useEffect, useCallback } from 'react';

export type AdminNotify = (message: string, type?: 'success' | 'error') => void;

export function useAdminToast(duration = 3200) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const notify = useCallback<AdminNotify>((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(t);
  }, [toast, duration]);

  return { toast, notify };
}
