import { useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  FileText,
  RefreshCw,
  ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAdminStats } from '../../hooks/useAdminStats';
import { useAdminReports } from '../../hooks/useAdminReports';
import { useAdminToast } from '../../hooks/useAdminToast';
import type { AdminDashboardStat } from '../../types/admin';
import ReportsTab from './ReportsTab';
import UsersTab from './UsersTab';
import SystemTab from './SystemTab';
import TimetableTab from './TimetableTab';
import ShopTab from './ShopTab';
import PostsTab from './PostsTab';
import AuditTab from './AuditTab';
import '../Admin.css';

export type AdminTab = 'reports' | 'users' | 'system' | 'timetable' | 'shop' | 'posts' | 'audit';

const VALID_TABS: AdminTab[] = ['reports', 'posts', 'audit', 'system', 'users', 'timetable', 'shop'];

const TAB_CONFIG: { id: AdminTab; label: string; icon: typeof Shield }[] = [
  { id: 'reports', label: '신고 관리', icon: AlertTriangle },
  { id: 'posts', label: '게시글 관리', icon: FileText },
  { id: 'audit', label: '감사 로그', icon: ScrollText },
  { id: 'system', label: '시스템 설정', icon: Settings },
  { id: 'users', label: '유저 관리', icon: Users },
  { id: 'timetable', label: '시간표 관리', icon: CalendarDays },
  { id: 'shop', label: '상점 관리', icon: ShoppingBag },
];

function isAdminTab(value: string | null): value is AdminTab {
  return value !== null && (VALID_TABS as string[]).includes(value);
}

function getToneColor(tone: AdminDashboardStat['tone']) {
  const map: Record<AdminDashboardStat['tone'], { color: string; bg: string }> = {
    primary: { color: '#6c5ce7', bg: 'rgba(108, 92, 231, 0.12)' },
    danger: { color: '#ff5d73', bg: 'rgba(255, 93, 115, 0.12)' },
    info: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    success: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    warning: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)' },
  };
  return map[tone];
}

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTab = searchParams.get('tab');
  const activeTab: AdminTab = isAdminTab(searchTab) ? searchTab : 'reports';

  const { stats, statsError, statsLoading, refetchStats, tagColors } = useAdminStats();
  const { reports, reportsLoading, reportsError } = useAdminReports();
  const { toast, notify } = useAdminToast();

  const setTab = (tab: AdminTab, extra?: Record<string, string>) => {
    setSearchParams(
      () => {
        const next = new URLSearchParams();
        next.set('tab', tab);
        Object.entries(extra ?? {}).forEach(([key, value]) => next.set(key, value));
        return next;
      },
      { replace: true }
    );
  };

  const pendingLive = useMemo(() => reports.filter((entry) => entry.status === 'pending').length, [reports]);
  const boardDistribution = useMemo(
    () =>
      Object.entries(stats.boardStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [stats.boardStats]
  );

  const heroStats: AdminDashboardStat[] = [
    {
      title: '총 유저',
      value: `${stats.totalUsers.toLocaleString()}명`,
      tone: 'primary',
      hint: `차단 ${stats.bannedUsers.toLocaleString()}명 포함`,
    },
    {
      title: '오늘 게시글',
      value: `${stats.todayPosts.toLocaleString()}건`,
      tone: 'info',
      hint: `최근 24시간 ${stats.recentPostsCount.toLocaleString()}건`,
    },
    {
      title: '미처리 신고',
      value: `${pendingLive || stats.pendingReports}건`,
      tone: 'danger',
      hint: `최근 접수 ${stats.recentReportsCount.toLocaleString()}건`,
    },
    {
      title: '총 게시글',
      value: `${stats.totalPosts.toLocaleString()}건`,
      tone: 'success',
      hint: '커뮤니티 누적 게시글',
    },
    {
      title: '상점 상품',
      value: `${stats.shopItemCount.toLocaleString()}개`,
      tone: 'warning',
      hint: `공지 ${stats.announcementCount.toLocaleString()}개 운영 중`,
    },
    {
      title: '최근 관리자 활동',
      value: `${stats.recentActivityCount.toLocaleString()}건`,
      tone: 'primary',
      hint: '최신 감사 로그 기준',
    },
  ];

  const quickActions = [
    { label: '미처리 신고 보기', hint: `${pendingLive}건 확인`, onClick: () => setTab('reports') },
    { label: '최근 게시글 검토', hint: '최신 글 중심 검토', onClick: () => setTab('posts', { scope: 'recent' }) },
    { label: '공지 추가', hint: '홈 티커 바로 수정', onClick: () => setTab('system', { focus: 'announcement-new' }) },
    { label: '시간표 수정', hint: '학년/반 시간표 편집', onClick: () => setTab('timetable') },
    { label: '상점 상품 등록', hint: '새 아이템 출시', onClick: () => setTab('shop', { focus: 'shop-new' }) },
  ];

  return (
    <div className="admin-page animate-fade-in">
      <section className="admin-hero">
        <div className="admin-hero-copy">
          <div className="admin-kicker">
            <Shield size={16} />
            운영 콘솔
          </div>
          <h1 className="page-title">관리자 대시보드</h1>
          <p className="admin-hero-description">
            커뮤니티 상태를 빠르게 파악하고, 중요한 이슈를 즉시 처리할 수 있는 브랜드형 운영 화면입니다.
          </p>
          <div className="admin-header-actions">
            <button type="button" className="admin-refresh-stats-btn" disabled={statsLoading} onClick={() => void refetchStats()}>
              <RefreshCw size={18} className={statsLoading ? 'spin' : ''} />
              데이터 새로고침
            </button>
          </div>
        </div>
        <div className="admin-hero-side">
          <div className="admin-hero-card">
            <div className="admin-hero-card-label">
              <Sparkles size={16} />
              오늘의 운영 포인트
            </div>
            <strong>{pendingLive > 0 ? `미처리 신고 ${pendingLive}건` : '긴급 신고 없음'}</strong>
            <p>최근 24시간 게시글 {stats.recentPostsCount}건, 공지 {stats.announcementCount}개가 운영 중입니다.</p>
          </div>
        </div>
      </section>

      {statsError && <div className="admin-banner error">{statsError}</div>}

      <section className="admin-stats">
        {heroStats.map((stat) => {
          const tone = getToneColor(stat.tone);
          return (
            <div key={stat.title} className="admin-stat-card">
              <div className="stat-icon-wrap" style={{ backgroundColor: tone.bg, color: tone.color }}>
                <TrendingUp size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-title">{stat.title}</span>
                <span className="stat-value" style={{ color: tone.color }}>
                  {statsLoading ? <span className="admin-stat-value-skeleton" /> : stat.value}
                </span>
                <span className="admin-stat-hint">{stat.hint}</span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="admin-dashboard-grid">
        <div className="admin-content">
          <div className="admin-section-head">
            <div>
              <h3 className="section-title">빠른 액션</h3>
              <p className="admin-section-description">반복적으로 자주 쓰는 관리자 동선을 바로 실행할 수 있습니다.</p>
            </div>
          </div>
          <div className="admin-action-grid">
            {quickActions.map((action) => (
              <button key={action.label} type="button" className="admin-action-card" onClick={action.onClick}>
                <span>{action.label}</span>
                <small>{action.hint}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="admin-content">
          <div className="admin-section-head">
            <div>
              <h3 className="section-title">최근 이상 징후</h3>
              <p className="admin-section-description">주의가 필요한 항목을 대시보드에서 바로 확인합니다.</p>
            </div>
          </div>
          <div className="admin-alert-stack">
            <div className="admin-alert-card">
              <AlertTriangle size={18} />
              <div>
                <strong>미처리 신고</strong>
                <p>{pendingLive > 0 ? `${pendingLive}건이 대기 중입니다.` : '현재 대기 중인 신고가 없습니다.'}</p>
              </div>
            </div>
            <div className="admin-alert-card">
              <AlertCircle size={18} />
              <div>
                <strong>차단 사용자</strong>
                <p>차단 상태 유저는 총 {stats.bannedUsers}명입니다.</p>
              </div>
            </div>
            <div className="admin-alert-card">
              <Users size={18} />
              <div>
                <strong>최근 활동량</strong>
                <p>최근 24시간 게시글 {stats.recentPostsCount}건, 신고 {stats.recentReportsCount}건이 접수됐습니다.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-content">
          <div className="admin-section-head">
            <div>
              <h3 className="section-title">보드 분포</h3>
              <p className="admin-section-description">게시판별 글 비중을 상위 5개 기준으로 표시합니다.</p>
            </div>
          </div>
          <div className="admin-board-stats">
            {boardDistribution.length === 0 ? (
              <div className="admin-empty">집계된 게시글 분포가 없습니다.</div>
            ) : (
              boardDistribution.map(([board, count]) => (
                <div key={board} className="admin-board-row">
                  <div className="admin-board-row-head">
                    <span>{board}</span>
                    <span>{count}건</span>
                  </div>
                  <div className="admin-board-progress">
                    <div
                      className="admin-board-progress-bar"
                      style={{
                        width: `${(count / Math.max(stats.totalPosts, 1)) * 100}%`,
                        background: tagColors[board] || 'var(--primary)',
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="admin-content">
          <div className="admin-section-head">
            <div>
              <h3 className="section-title">최근 관리자 활동</h3>
              <p className="admin-section-description">최근 감사 로그를 요약해 보여 줍니다.</p>
            </div>
            <button type="button" className="admin-btn" onClick={() => setTab('audit')}>
              전체 보기
            </button>
          </div>
          <div className="admin-activity-list">
            {stats.latestAuditLogs.length === 0 ? (
              <div className="admin-empty">최근 관리자 활동이 없습니다.</div>
            ) : (
              stats.latestAuditLogs.map((entry) => (
                <div key={entry.id} className="admin-activity-card">
                  <div>
                    <strong>{entry.action || 'unknown action'}</strong>
                    <p>{entry.actorEmail || '관리자 정보 없음'}</p>
                  </div>
                  <span>{entry.createdAt ? new Date(entry.createdAt).toLocaleString('ko-KR') : '-'}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="admin-tab-strip" role="tablist" aria-label="관리 메뉴">
        {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={`admin-tab-btn ${activeTab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={18} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'reports' && (
        <ReportsTab reports={reports} loading={reportsLoading} syncError={reportsError} onNotify={notify} />
      )}
      {activeTab === 'posts' && <PostsTab onNotify={notify} />}
      {activeTab === 'audit' && <AuditTab />}
      {activeTab === 'system' && <SystemTab onNotify={notify} />}
      {activeTab === 'users' && <UsersTab onNotify={notify} />}
      {activeTab === 'timetable' && <TimetableTab onNotify={notify} />}
      {activeTab === 'shop' && <ShopTab onNotify={notify} />}

      {toast && <div className={`admin-toast ${toast.type}`}>{toast.message}</div>}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
