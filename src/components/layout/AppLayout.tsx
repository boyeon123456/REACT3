import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import RightPanel from './RightPanel';
import './AppLayout.css';

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar mobileMenuOpen={mobileMenuOpen} closeMobileMenu={() => setMobileMenuOpen(false)} />
      <div className="main-wrapper">
        <Header toggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <div className="content-area">
          <main className="main-content">
            <Outlet />
          </main>
          <RightPanel />
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
