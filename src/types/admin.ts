export type AdminActivityRow = {
  id: string;
  action?: string;
  actorEmail?: string;
  actorUid?: string;
  targetCollection?: string | null;
  targetId?: string | null;
  detail?: Record<string, unknown>;
  createdAt?: number;
};

export type AdminDashboardStat = {
  title: string;
  value: string;
  tone: 'primary' | 'danger' | 'info' | 'success' | 'warning';
  hint: string;
};

export type AdminUserRow = {
  id: string;
  name?: string;
  email?: string;
  photoURL?: string;
  role?: string;
  level?: number;
  points?: number;
  isBanned?: boolean;
  isStudent?: boolean;
  schoolName?: string;
  grade?: string;
  class?: string;
};

export type AdminShopItem = {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  type?: 'badge' | 'nameColor' | 'profileBg' | 'avatarFrame';
  style?: string;
  createdAt?: number;
};

export type AdminReportRow = {
  id: string;
  contentId?: string;
  status?: 'pending' | 'resolved' | 'dismissed';
  type?: string;
  content?: string;
  reason?: string;
  reporter?: string;
  reporter_id?: string;
  author_id?: string;
  date?: string;
  isPinned?: boolean;
  createdAt?: number;
  handledAt?: number;
};
