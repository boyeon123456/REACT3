import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Home, MessageSquare, Edit3, Gamepad2, User, ShieldAlert, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { path: '/', label: '홈', icon: Home, end: true },
  { path: '/board', label: '게시판', icon: MessageSquare },
  { path: '/write', label: '글쓰기', icon: Edit3 },
  { path: '/games', label: '미니게임', icon: Gamepad2 },
  { path: '/mypage', label: '마이페이지', icon: User },
  { path: '/admin', label: '관리자', icon: ShieldAlert },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <Link to="/" className="sidebar-logo">
        <div className="logo-icon">
          <Star size={18} />
        </div>
        {!collapsed && <span className="logo-text">SchoolCom</span>}
      </Link>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <div className="nav-icon-wrap">
              <item.icon className="nav-icon" size={20} />
            </div>
            {!collapsed && <span className="nav-label">{item.label}</span>}
            {!collapsed && item.path === '/games' && (
              <span className="nav-badge">NEW</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-user-card">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" className="sidebar-avatar" />
            <div className="sidebar-user-info">
              <span className="sidebar-username">학생1</span>
              <span className="sidebar-level">Lv.4 열정학생</span>
            </div>
          </div>
        )}
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
