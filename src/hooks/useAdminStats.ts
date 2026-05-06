import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getCountFromServer,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { BOARD_TAG_COLORS } from '../constants/boardUi';

export type AdminStatsState = {
  totalUsers: number;
  todayPosts: number;
  pendingReports: number;
  totalPosts: number;
  boardStats: Record<string, number>;
};

const initialStats: AdminStatsState = {
  totalUsers: 0,
  todayPosts: 0,
  pendingReports: 0,
  totalPosts: 0,
  boardStats: {},
};

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStatsState>(initialStats);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const usersSnap = await getCountFromServer(collection(db, 'users'));
      const postsSnap = await getCountFromServer(collection(db, 'posts'));
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayPostsSnap = await getCountFromServer(
        query(collection(db, 'posts'), where('created_at', '>=', todayStart.getTime()))
      );
      const pendingSnap = await getCountFromServer(
        query(collection(db, 'reports'), where('status', '==', 'pending'))
      );

      const boardCounts: Record<string, number> = {};
      const allPostsSnap = await getDocs(collection(db, 'posts'));
      allPostsSnap.docs.forEach((d) => {
        const board = d.data().board || '기타';
        boardCounts[board] = (boardCounts[board] || 0) + 1;
      });

      setStats({
        totalUsers: usersSnap.data().count,
        todayPosts: todayPostsSnap.data().count,
        pendingReports: pendingSnap.data().count,
        totalPosts: postsSnap.data().count,
        boardStats: boardCounts,
      });
      setStatsError(null);
    } catch (e: unknown) {
      console.error('Stats fetch error:', e);
      const msg = e instanceof Error ? e.message : '데이터를 불러오는 중 오류가 발생했습니다.';
      setStatsError(msg);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, statsLoading, statsError, refetchStats: fetchStats, tagColors: BOARD_TAG_COLORS };
}
