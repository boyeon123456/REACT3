import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  BadgeCheck,
  Bell,
  Check,
  Heart,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  PenLine,
  Settings,
  Shield,
  Sparkles,
  Star,
} from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { markAllNotificationsRead, markNotificationRead, useNotifications } from '../../hooks/useNotifications';
import { useInventory } from '../../hooks/useInventory';
import { isAdminUser } from '../../lib/isAdmin';
import { useAuthStore } from '../../store/authStore';
import './Header.css';

export default function Header({ toggleMobileMenu }: { toggleMobileMenu?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuthStore();
  const { equippedItemsByType } = useInventory();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const isAdmin = isAdminUser(user);
  const showComposeButton = location.pathname !== '/write' && !location.pathname.startsWith('/edit/');
  const notifications = useNotifications(user?.id);
  const unreadCount = notifications.filter((item) => !item.read).length;
  const schoolSummary =
    user?.isStudent && user.schoolName
      ? `${user.schoolName}${user.grade && user.class ? ` ${user.grade}학년 ${user.class}반` : ''}`
      : null;

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setShowProfile(false);
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSearchQuery(location.pathname === '/search' ? searchParams.get('q') || '' : '');
  }, [location.pathname, searchParams]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const keyword = searchQuery.trim();
    if (!keyword) return;
    setShowNotif(false);
    setShowProfile(false);
    navigate(`/search?q=${encodeURIComponent(keyword)}`);
  };

  const handleMarkAllRead = async () => {
    if (user) await markAllNotificationsRead(user.id);
  };

  const handleNotifClick = async (notif: { id: string; postId: string }) => {
    await markNotificationRead(notif.id);
    setShowNotif(false);
    navigate(`/post/${notif.postId}`);
  };

  const openAndCloseMenus = (target: string) => {
    setShowProfile(false);
    setShowNotif(false);
    navigate(target);
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare size={16} />;
      case 'like':
        return <Heart size={16} />;
      case 'reply':
        return <MessageSquare size={16} />;
      default:
        return <Star size={16} />;
    }
  };

  const getNotifText = (notif: { type: string; fromUser: string }) => {
    switch (notif.type) {
      case 'comment':
        return `${notif.fromUser}님이 내 글에 댓글을 남겼어요.`;
      case 'like':
        return `${notif.fromUser}님이 내 글을 좋아해요.`;
      case 'reply':
        return `${notif.fromUser}님이 내 댓글에 답글을 남겼어요.`;
      default:
        return '새로운 알림이 도착했어요.';
    }
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    const diff = currentTime - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  };

  return (
    <header className="header glass-panel">
      <div className="header-mobile-toggle">
        <button className="icon-button" onClick={toggleMobileMenu}>
          <Menu size={20} />
        </button>
      </div>

      <form className="header-search" onSubmit={handleSearchSubmit}>
        <button type="submit" className="search-submit" aria-label="검색">
          <Search size={18} />
        </button>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="게시글, 계정, 사용자 검색"
        />
        <kbd className="search-shortcut">/</kbd>
      </form>

      <div className="header-actions">
        {showComposeButton && (
          <button className="icon-button header-compose-button" onClick={() => openAndCloseMenus('/write')} aria-label="글쓰기">
            <PenLine size={19} />
          </button>
        )}

        <div className="notification-wrap" ref={notifRef}>
          <button
            className="icon-button notification-btn"
            onClick={() => {
              setShowNotif(!showNotif);
              setShowProfile(false);
            }}
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          {showNotif && (
            <div className="dropdown-panel notif-panel animate-fade-in">
              <div className="dropdown-header">
                <h4>
                  알림
                  {unreadCount > 0 && <span className="notif-unread-count">{unreadCount}</span>}
                </h4>
                {unreadCount > 0 && (
                  <button className="mark-read-btn" onClick={handleMarkAllRead}>
                    <Check size={14} />
                    모두 읽음
                  </button>
                )}
              </div>
              <ul className="notif-list">
                {notifications.length === 0 ? (
                  <li className="notif-empty">새 알림이 없어요.</li>
                ) : (
                  notifications.map((notif) => (
                    <li
                      key={notif.id}
                      className={`notif-item ${notif.read ? '' : 'unread'}`}
                      onClick={() => handleNotifClick(notif)}
                    >
                      <div className={`notif-icon-wrap ${notif.type}`}>{getNotifIcon(notif.type)}</div>
                      <div className="notif-content">
                        <p className="notif-text">{getNotifText(notif)}</p>
                        <span className="notif-sub">{notif.postTitle}</span>
                        <span className="notif-time">{formatTime(notif.createdAt)}</span>
                      </div>
                      {!notif.read && <span className="unread-dot"></span>}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {user ? (
          <div className="profile-wrap" ref={profileRef}>
            <button
              className="profile-btn"
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotif(false);
              }}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="profile-avatar" />
              ) : (
                <div className="profile-avatar initial-avatar">{user.name[0]}</div>
              )}
              <div className="profile-trigger-copy">
                <span className="profile-name">{user.name}</span>
                <small>{user.statusMessage || '프로필 한 줄 소개를 채워보세요.'}</small>
              </div>
            </button>

            {showProfile && (
              <div className="dropdown-panel profile-panel animate-fade-in">
                <div
                  className="profile-panel-hero"
                  style={{
                    background: equippedItemsByType.profileBg?.style || 'linear-gradient(135deg, #00aeff, #38c7ff)',
                  }}
                >
                  <div className="profile-panel-overlay" />
                  <div
                    className="profile-panel-avatar-shell"
                    style={{
                      borderColor: equippedItemsByType.avatarFrame?.style || 'rgba(255,255,255,0.75)',
                      boxShadow: equippedItemsByType.avatarFrame?.style
                        ? `0 0 0 6px ${equippedItemsByType.avatarFrame.style}1a`
                        : undefined,
                    }}
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.name} className="profile-panel-avatar" />
                    ) : (
                      <div className="profile-panel-avatar initial-avatar-large">{user.name[0]}</div>
                    )}
                  </div>
                  <div className="profile-panel-copy">
                    <div className="profile-panel-name-row">
                      <p className="profile-panel-name" style={{ color: equippedItemsByType.nameColor?.style || undefined }}>
                        {user.name}
                      </p>
                      <span className="profile-panel-level">Lv.{user.level}</span>
                    </div>
                    <p className="profile-panel-status">{user.statusMessage || '상태메시지를 추가해 프로필 분위기를 완성해보세요.'}</p>
                    <div className="profile-panel-meta">
                      {schoolSummary && <span className="profile-panel-meta-chip">{schoolSummary}</span>}
                      {user.featuredBadgeId && (
                        <span className="profile-panel-badge">
                          <BadgeCheck size={14} />
                          대표 배지 설정됨
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="profile-panel-body">
                  <p className="profile-panel-bio">
                    {user.bio || '자기소개가 아직 비어 있어요. 마이페이지에서 프로필을 조금만 더 채워보세요.'}
                  </p>

                  <div className="profile-panel-stats">
                    <div className="panel-stat">
                      <span className="stat-value">{user.points?.toLocaleString() || 0}P</span>
                      <span className="stat-label">포인트</span>
                    </div>
                    <div className="panel-stat">
                      <span className="stat-value">{Object.keys(user.equipped_items || {}).length}</span>
                      <span className="stat-label">장착 중</span>
                    </div>
                  </div>

                  <div className="profile-panel-actions">
                    <button className="profile-primary-action" onClick={() => openAndCloseMenus('/mypage')}>
                      <Sparkles size={16} />
                      마이페이지 열기
                    </button>
                    <button className="profile-secondary-action" onClick={() => openAndCloseMenus('/mypage/edit-profile')}>
                      <Settings size={16} />
                      {'\uD504\uB85C\uD544 \uC218\uC815'}
                    </button>
                  </div>

                  <div className="profile-panel-menu">
                    <button className="profile-menu-item" onClick={() => openAndCloseMenus('/settings')}>
                      <Settings size={16} />
                      {'\uC124\uC815'}
                    </button>
                    {isAdmin && (
                      <button className="profile-menu-item" onClick={() => openAndCloseMenus('/admin')}>
                        <Shield size={16} />
                        관리자 대시보드
                      </button>
                    )}
                    <button className="profile-menu-item logout" onClick={logout}>
                      <LogOut size={16} />
                      로그아웃
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            className="login-btn"
            onClick={() => navigate('/login')}
            style={{
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
