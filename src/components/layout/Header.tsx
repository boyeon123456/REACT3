import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, Settings, LogOut, Check, MessageSquare, Heart, Star, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotifications, markAllNotificationsRead, markNotificationRead } from '../../hooks/useNotifications';
import './Header.css';

export default function Header({ toggleMobileMenu }: { toggleMobileMenu?: () => void }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [showNotif, setShowNotif] = useState(false);
  
  const ADMIN_EMAILS = ['admin_test_123@school.com', 'boyeon5600@gmail.com'];
  const isAdmin = user?.role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email));

  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // 실시간 알림 구독
  const notifications = useNotifications(user?.id);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkAllRead = async () => {
    if (user) await markAllNotificationsRead(user.id);
  };

  const handleNotifClick = async (notif: any) => {
    await markNotificationRead(notif.id);
    setShowNotif(false);
    navigate(`/post/${notif.postId}`);
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'comment': return <MessageSquare size={16} />;
      case 'like': return <Heart size={16} />;
      case 'reply': return <MessageSquare size={16} />;
      default: return <Star size={16} />;
    }
  };

  const getNotifText = (notif: any) => {
    switch (notif.type) {
      case 'comment': return `${notif.fromUser}님이 내 글에 댓글을 남겼습니다.`;
      case 'like': return `${notif.fromUser}님이 내 글을 좋아합니다.`;
      case 'reply': return `${notif.fromUser}님이 댓글에 답글을 남겼습니다.`;
      default: return '새로운 알림이 있습니다.';
    }
  };

  const formatTime = (ts: number) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금 전';
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  };

  return (
    <header className="header glass-panel">
      <div className="header-mobile-toggle">
        <button className="icon-button" onClick={toggleMobileMenu}><Menu size={20} /></button>
      </div>

      <div className="header-search">
        <Search size={18} className="search-icon" />
        <input type="text" placeholder="게시글, 댓글, 사용자 검색..." />
        <kbd className="search-shortcut">⌘</kbd>
      </div>

      <div className="header-actions">
        <div className="notification-wrap" ref={notifRef}>
          <button className="icon-button notification-btn" onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}>
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          {showNotif && (
            <div className="dropdown-panel notif-panel animate-fade-in">
              <div className="dropdown-header">
                <h4>알림 {unreadCount > 0 && <span className="notif-unread-count">{unreadCount}</span>}</h4>
                {unreadCount > 0 && (
                  <button className="mark-read-btn" onClick={handleMarkAllRead}><Check size={14} /> 모두 읽음</button>
                )}
              </div>
              <ul className="notif-list">
                {notifications.length === 0 ? (
                  <li style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    알림이 없습니다.
                  </li>
                ) : notifications.map(n => (
                  <li
                    key={n.id}
                    className={`notif-item ${n.read ? '' : 'unread'}`}
                    onClick={() => handleNotifClick(n)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={`notif-icon-wrap ${n.type}`}>
                      {getNotifIcon(n.type)}
                    </div>
                    <div className="notif-content">
                      <p className="notif-text">{getNotifText(n)}</p>
                      <span className="notif-sub">{n.postTitle}</span>
                      <span className="notif-time">{formatTime(n.createdAt)}</span>
                    </div>
                    {!n.read && <span className="unread-dot"></span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {user ? (
          <div className="profile-wrap" ref={profileRef}>
            <div className="profile-btn" onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}>
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="profile-avatar" />
              ) : (
                <div className="profile-avatar initial-avatar">{user.name[0]}</div>
              )}
              <span className="profile-name">{user.name}</span>
            </div>

            {showProfile && (
              <div className="dropdown-panel profile-panel animate-fade-in">
                <div className="profile-panel-header">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.name} className="profile-panel-avatar" />
                  ) : (
                    <div className="profile-panel-avatar initial-avatar-large">{user.name[0]}</div>
                  )}
                  <div className="profile-header-info">
                    <p className="profile-panel-name">{user.name}</p>
                    <p className="profile-panel-email">{user.email}</p>
                  </div>
                </div>

                <div className="profile-panel-stats">
                  <div className="panel-stat">
                    <span className="stat-value">Lv.{user.level}</span>
                    <span className="stat-label">레벨</span>
                  </div>
                  <div className="panel-stat">
                    <span className="stat-value">{user.points?.toLocaleString()}</span>
                    <span className="stat-label">포인트</span>
                  </div>
                </div>

                <div className="profile-panel-menu">
                  <button className="profile-menu-item" onClick={() => navigate('/mypage')}>
                    <Settings size={16} /> 마이페이지
                  </button>
                  {isAdmin && (
                    <button className="profile-menu-item" onClick={() => navigate('/admin')}>
                      <Shield size={16} /> 관리자 패널
                    </button>
                  )}

                  <div className="menu-divider"></div>
                  <button className="profile-menu-item logout" onClick={logout}>
                    <LogOut size={16} /> 로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button className="login-btn" onClick={() => navigate('/login')} style={{
            background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px',
            borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
