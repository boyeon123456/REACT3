import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import RightPanel from './RightPanel';
import './AppLayout.css';

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isGameRoute = location.pathname === '/games';

  return (
    <div className={`app-layout ${isGameRoute ? 'game-focus-layout' : ''}`}>
      <Sidebar mobileMenuOpen={mobileMenuOpen} closeMobileMenu={() => setMobileMenuOpen(false)} />
      <div className={`main-wrapper ${isGameRoute ? 'game-focus-wrapper' : ''}`}>
        <Header toggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <div className={`content-area ${isGameRoute ? 'game-focus-content' : ''}`}>
          <main className={`main-content ${isGameRoute ? 'game-focus-main' : ''}`}>
            <Outlet />
          </main>
          {!isGameRoute && <RightPanel />}
        </div>
      </div>
      
      {/* 모바일에서 메뉴가 열렸을 때 클릭하면 닫히는 오버레이 */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 99
          }}
        ></div>
      )}
    </div>
  );
}
