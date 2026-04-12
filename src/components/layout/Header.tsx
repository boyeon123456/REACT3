import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, Settings, LogOut, Check, MessageSquare, Heart, Star, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import './Header.css';

const mockNotifications = [
  { id: 1, type: 'comment', text: '익명3님이 회원님의 글에 댓글을 남겼습니다.', time: '3분 전', read: false },
  { id: 2, type: 'like', text: '회원님의 게시글에 15명이 좋아요를 눌렀습니다.', time: '10분 전', read: false },
  { id: 3, type: 'system', text: '[공지] 커뮤니티 이용 규칙이 업데이트 되었습니다.', time: '1시간 전', read: true },
  { id: 4, type: 'comment', text: '익명7님이 회원님의 댓글에 답글을 남겼습니다.', time: '2시간 전', read: true },
  { id: 5, type: 'system', text: '새로운 미니게임이 추가되었습니다! 지금 확인해보세요.', time: '어제', read: true },
];

export default function Header({ toggleMobileMenu }: { toggleMobileMenu?: () => void }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'comment': return <MessageSquare size={16} />;
      case 'like': return <Heart size={16} />;
      default: return <Star size={16} />;
    }
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
                <h4>알림</h4>
                <button className="mark-read-btn"><Check size={14} /> 모두 읽음</button>
              </div>
              <ul className="notif-list">
                {mockNotifications.map(n => (
                  <li key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                    <div className={`notif-icon-wrap ${n.type}`}>
                      {getNotifIcon(n.type)}
                    </div>
                    <div className="notif-content">
                      <p className="notif-text">{n.text}</p>
                      <span className="notif-time">{n.time}</span>
                    </div>
                    {!n.read && <span className="unread-dot"></span>}
                  </li>
                ))}
              </ul>
              <button className="notif-view-all">모든 알림 보기</button>
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
                  {user.role === 'admin' && (
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
