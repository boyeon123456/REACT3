import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { AdminReportRow } from '../types/admin';

export function useAdminReports() {
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReports(
          snap.docs.map((entry) => ({
            id: entry.id,
            ...(entry.data() as Omit<AdminReportRow, 'id'>),
          }))
        );
        setReportsLoading(false);
        setReportsError(null);
      },
      (err) => {
        console.error('Reports sync error:', err);
        setReportsError('신고 내역을 불러오지 못했습니다. 권한 설정을 확인해 주세요.');
        setReportsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { reports, reportsLoading, reportsError };
}
