import { useState, useMemo, useEffect } from 'react';
import {
  AlertCircle,
  Users,
  FileText,
  TrendingUp,
  Sparkles,
  Shield,
  RefreshCw,
  AlertTriangle,
  ScrollText,
  Settings,
  CalendarDays,
  ShoppingBag,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAdminStats } from '../../hooks/useAdminStats';
import { useAdminReports } from '../../hooks/useAdminReports';
import { useAdminToast } from '../../hooks/useAdminToast';
import ReportsTab, { type ReportRow } from './ReportsTab';
import UsersTab from './UsersTab';
import SystemTab from './SystemTab';
import TimetableTab from './TimetableTab';
import ShopTab from './ShopTab';
import PostsTab from './PostsTab';
import AuditTab from './AuditTab';
import '../Admin.css';

export type AdminTab =
  | 'reports'
  | 'users'
  | 'system'
  | 'timetable'
  | 'shop'
  | 'posts'
  | 'audit';

const VALID_TABS: AdminTab[] = [
  'reports',
  'posts',
  'audit',
  'system',
  'users',
  'timetable',
  'shop',
];

function isAdminTab(v: string | null): v is AdminTab {
  return v !== null && (VALID_TABS as string[]).includes(v);
}

const TAB_CONFIG: { id: AdminTab; label: string; icon: typeof Shield }[] = [
  { id: 'reports', label: '신고 관리', icon: AlertTriangle },
  { id: 'posts', label: '게시글 관리', icon: FileText },
  { id: 'audit', label: '감사 로그', icon: ScrollText },
  { id: 'system', label: '시스템 설정', icon: Settings },
  { id: 'users', label: '유저 관리', icon: Users },
  { id: 'timetable', label: '시간표 관리', icon: CalendarDays },
  { id: 'shop', label: '상점 관리', icon: ShoppingBag },
];

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState<AdminTab>(() => {
    const t = searchParams.get('tab');
    return isAdminTab(t) ? t : 'reports';
  });

  const { stats, statsError, statsLoading, refetchStats, tagColors } = useAdminStats();
  const { reports, reportsLoading, reportsError } = useAdminReports();
  const { toast, notify } = useAdminToast();

  useEffect(() => {
    const t = searchParams.get('tab');
    if (isAdminTab(t)) {
      setActiveTabState((prev) => (prev !== t ? t : prev));
    }
  }, [searchParams]);

  const setTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set('tab', tab);
        return n;
      },
      { replace: true }
    );
  };

  const pendingLive = useMemo(
    () => reports.filter((r: { status?: string }) => r.status === 'pending').length,
    [reports]
  );

  const statCards = [
    {
      title: '총 가입자',
      value: `${stats.totalUsers.toLocaleString()}명`,
      icon: Users,
      color: '#6C5CE7',
      bg: 'rgba(108,92,231,0.1)',
    },
    {
      title: '오늘 게시글',
      value: `${stats.todayPosts}개`,
      icon: FileText,
      color: '#4DA3FF',
      bg: 'rgba(77,163,255,0.1)',
    },
    {
      title: '미처리 신고',
      value: `${pendingLive || stats.pendingReports}건`,
      icon: AlertCircle,
      color: '#FF4757',
      bg: 'rgba(255,71,87,0.1)',
    },
    {
      title: '총 게시글',
      value: `${stats.totalPosts.toLocaleString()}개`,
      icon: TrendingUp,
      color: '#00B894',
      bg: 'rgba(0,184,148,0.1)',
    },
  ];

  return (
    <div className="admin-page animate-fade-in">
      <div className="admin-header">
        <div className="admin-header-row">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            <Shield size={32} strokeWidth={2.2} aria-hidden />
            관리자 대시보드
          </h1>
          <div className="admin-header-actions">
            <button
              type="button"
              className="admin-refresh-stats-btn"
              disabled={statsLoading}
              onClick={() => refetchStats()}
            >
              <RefreshCw size={18} className={statsLoading ? 'spin' : ''} />
              통계 새로고침
            </button>
          </div>
        </div>
      </div>

      {statsError && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '20px',
            borderRadius: '12px',
            background: 'rgba(255,71,87,0.12)',
            color: '#FF4757',
            fontWeight: 600,
          }}
        >
          통계를 불러오지 못했습니다: {statsError}
        </div>
      )}

      <div className="admin-stats">
        {statCards.map((s, i) => (
          <div key={i} className="admin-stat-card">
            <div className="stat-icon-wrap" style={{ backgroundColor: s.bg, color: s.color }}>
              <s.icon size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-title">{s.title}</span>
              <span className="stat-value" style={{ color: s.color }}>
                {statsLoading ? <span className="admin-stat-value-skeleton" /> : s.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        className="admin-stats-secondary"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div className="admin-content" style={{ padding: '24px' }}>
          <h4
            style={{
              fontSize: '15px',
              fontWeight: 800,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <TrendingUp size={18} /> 게시판별 게시글 분포
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {statsLoading ? (
              <div className="admin-stat-value-skeleton" style={{ width: '100%', height: '120px' }} />
            ) : stats.boardStats && Object.entries(stats.boardStats).length > 0 ? (
              Object.entries(stats.boardStats)
                .sort((a, b) => b[1] - a[1])
                .map(([board, count]) => (
                  <div key={board}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        marginBottom: '4px',
                        fontWeight: 700,
                      }}
                    >
                      <span>{board}</span>
                      <span>{count}개</span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        background: 'var(--bg-main)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(count / (stats.totalPosts || 1)) * 100}%`,
                          background: tagColors[board] || 'var(--primary)',
                          transition: 'width 1s ease-out',
                        }}
                      />
                    </div>
                  </div>
                ))
            ) : (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
              >
                통계 데이터가 없거나 불러오는 중입니다.
              </div>
            )}
          </div>
        </div>

        <div
          className="admin-content"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div style={{ color: 'var(--primary)', marginBottom: '12px' }}>
            <Sparkles size={32} />
          </div>
          <h4 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '4px' }}>
            커뮤니티 활성도
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            오늘 하루도 고생 많으셨습니다!
            <br />
            학생들이 남긴 소중한 의견들을 관리해보세요.
          </p>
        </div>
      </div>

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
        <ReportsTab
          reports={reports as ReportRow[]}
          loading={reportsLoading}
          syncError={reportsError}
          onNotify={notify}
        />
      )}
      {activeTab === 'posts' && <PostsTab onNotify={notify} />}
      {activeTab === 'audit' && <AuditTab />}
      {activeTab === 'system' && <SystemTab />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'timetable' && <TimetableTab />}
      {activeTab === 'shop' && <ShopTab />}

      {toast && (
        <div className={`admin-toast ${toast.type}`} role="status">
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
