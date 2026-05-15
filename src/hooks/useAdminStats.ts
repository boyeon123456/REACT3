import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { BOARD_TAG_COLORS } from '../constants/boardUi';
import type { AdminActivityRow } from '../types/admin';

export type AdminStatsState = {
  totalUsers: number;
  todayPosts: number;
  pendingReports: number;
  totalPosts: number;
  bannedUsers: number;
  shopItemCount: number;
  announcementCount: number;
  recentPostsCount: number;
  recentReportsCount: number;
  recentActivityCount: number;
  boardStats: Record<string, number>;
  latestAuditLogs: AdminActivityRow[];
};

const initialStats: AdminStatsState = {
  totalUsers: 0,
  todayPosts: 0,
  pendingReports: 0,
  totalPosts: 0,
  bannedUsers: 0,
  shopItemCount: 0,
  announcementCount: 0,
  recentPostsCount: 0,
  recentReportsCount: 0,
  recentActivityCount: 0,
  boardStats: {},
  latestAuditLogs: [],
};

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStatsState>(initialStats);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        usersSnap,
        postsSnap,
        bannedUsersSnap,
        shopItemsSnap,
        todayPostsSnap,
        recentPostsSnap,
        pendingSnap,
        recentReportsSnap,
        allPostsSnap,
        latestAuditLogsSnap,
        announcementsSnap,
      ] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(collection(db, 'posts')),
        getCountFromServer(query(collection(db, 'users'), where('isBanned', '==', true))),
        getCountFromServer(collection(db, 'shop_items')),
        getCountFromServer(query(collection(db, 'posts'), where('created_at', '>=', todayStart.getTime()))),
        getCountFromServer(query(collection(db, 'posts'), where('created_at', '>=', dayAgo))),
        getCountFromServer(query(collection(db, 'reports'), where('status', '==', 'pending'))),
        getCountFromServer(query(collection(db, 'reports'), where('createdAt', '>=', dayAgo))),
        getDocs(collection(db, 'posts')),
        getDocs(query(collection(db, 'admin_audit_logs'), orderBy('createdAt', 'desc'), limit(6))),
        getDoc(doc(db, 'settings', 'announcements')),
      ]);

      const boardCounts: Record<string, number> = {};
      allPostsSnap.docs.forEach((entry) => {
        const board = (entry.data().board as string | undefined) || '기타';
        boardCounts[board] = (boardCounts[board] || 0) + 1;
      });

      const announcements = announcementsSnap.exists()
        ? ((announcementsSnap.data().list as string[] | undefined) ?? [])
        : [];

      setStats({
        totalUsers: usersSnap.data().count,
        todayPosts: todayPostsSnap.data().count,
        pendingReports: pendingSnap.data().count,
        totalPosts: postsSnap.data().count,
        bannedUsers: bannedUsersSnap.data().count,
        shopItemCount: shopItemsSnap.data().count,
        announcementCount: announcements.length,
        recentPostsCount: recentPostsSnap.data().count,
        recentReportsCount: recentReportsSnap.data().count,
        recentActivityCount: latestAuditLogsSnap.size,
        boardStats: boardCounts,
        latestAuditLogs: latestAuditLogsSnap.docs.map((entry) => ({
          id: entry.id,
          ...(entry.data() as Omit<AdminActivityRow, 'id'>),
        })),
      });
      setStatsError(null);
    } catch (e: unknown) {
      console.error('Stats fetch error:', e);
      setStatsError(e instanceof Error ? e.message : '관리자 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return { stats, statsLoading, statsError, refetchStats: fetchStats, tagColors: BOARD_TAG_COLORS };
}
