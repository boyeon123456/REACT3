import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Home, MessageSquare, Edit3, Gamepad2, User, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './Sidebar.css';

const navItems = [
  { path: '/', label: '홈', icon: Home, end: true },
  { path: '/board', label: '게시판', icon: MessageSquare },
  { path: '/write', label: '글쓰기', icon: Edit3 },
  { path: '/games', label: '미니게임', icon: Gamepad2 },
  { path: '/mypage', label: '마이페이지', icon: User },
  { path: '/admin', label: '관리자', icon: ShieldAlert },
];

export default function Sidebar({ mobileMenuOpen, closeMobileMenu }: { mobileMenuOpen?: boolean, closeMobileMenu?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <Link to="/" className="sidebar-logo" onClick={closeMobileMenu}>
        <div className="logo-icon">
          <img src="src\assets\670483720_1443067160639588_6486915911126418629_n.png" alt="logo" width={180} height={50} ></img>
        </div>
      </Link>

      <nav className="sidebar-nav">
        {navItems
          .filter(item => item.path !== '/admin' || user?.role === 'admin')
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={closeMobileMenu}
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
        <button className="collapse-btn-v3" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "펼치기" : "접기"}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
