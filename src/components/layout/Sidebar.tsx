import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Home, MessageSquare, Edit3, Gamepad2, User, ShieldAlert, ChevronLeft, ChevronRight, Utensils, CalendarDays, ShoppingBag } from 'lucide-react';


import { useAuthStore } from '../../store/authStore';
import logoImage from '../../assets/670483720_1443067160639588_6486915911126418629_n.png';
import './Sidebar.css';

interface NavItem {
  path: string;
  label: string;
  icon: any;
  end?: boolean;
  adminOnly?: boolean;
}

interface NavGroup {
  category: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    category: 'MAIN',
    items: [
      { path: '/', label: '홈', icon: Home, end: true },
      { path: '/board', label: '게시판', icon: MessageSquare },
      { path: '/write', label: '글쓰기', icon: Edit3 },
    ]
  },
  {
    category: '학급 정보',
    items: [
      { path: '/meals', label: '급식 정보', icon: Utensils },
      { path: '/timetable', label: '학급 시간표', icon: CalendarDays },
    ]
  },
  {
    category: '활동',
    items: [
      { path: '/games', label: '미니게임', icon: Gamepad2 },
      { path: '/shop', label: '포인트 상점', icon: ShoppingBag },
    ]
  },
  {
    category: '설정',
    items: [
      { path: '/mypage', label: '마이페이지', icon: User },
      { path: '/admin', label: '관리자', icon: ShieldAlert, adminOnly: true },
    ]
  }
];


const ADMIN_EMAILS = ['admin_test_123@school.com', 'boyeon5600@gmail.com'];


export default function Sidebar({ mobileMenuOpen, closeMobileMenu }: { mobileMenuOpen?: boolean, closeMobileMenu?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <Link to="/" className={`sidebar-logo ${collapsed ? 'collapsed' : ''}`} onClick={closeMobileMenu}>
        <div className="logo-icon">
          <img 
            src={logoImage} 
            alt="logo" 
            style={{ 
              width: collapsed ? 42 : 180, 
              height: collapsed ? 42 : 50, 
              objectFit: collapsed ? 'cover' : 'contain', 
              objectPosition: 'left',
              transition: 'all 0.3s'
            }} 
          />
        </div>
      </Link>

      <nav className="sidebar-nav">
        {navGroups.map((group, idx) => {
          // 학생이 아닌 경우 '학급 정보' 카테고리 제외
          if (group.category === '학급 정보' && !user?.isStudent) return null;

          const visibleItems = group.items.filter(item => {
            if (item.adminOnly) {
              return user?.role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email));
            }
            return true;
          });

          if (visibleItems.length === 0) return null;

          // 카테고리명 세련되게 변경
          const categoryLabel = group.category === '학급 정보' ? '스쿨 라이프' : group.category;

          return (
            <div key={idx} className="nav-group">
              {!collapsed && <div className="nav-group-title">{categoryLabel}</div>}
              {collapsed && idx > 0 && <div className="nav-group-divider" />}
              {visibleItems.map(item => (
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
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="collapse-btn-v3" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "펼치기" : "접기"}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
