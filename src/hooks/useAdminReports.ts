import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useAdminReports() {
  const [reports, setReports] = useState<Record<string, unknown>[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setReportsLoading(false);
        setReportsError(null);
      },
      (err) => {
        console.error('Reports sync error:', err);
        setReportsError('신고 내역을 불러오지 못했습니다. 권한을 확인하세요.');
        setReportsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { reports, reportsLoading, reportsError };
}
