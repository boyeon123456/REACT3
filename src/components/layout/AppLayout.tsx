import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './AppLayout.css';

const RightPanel = lazy(() => import('./RightPanel'));

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const updateMatches = () => setMatches(media.matches);

    updateMatches();
    media.addEventListener('change', updateMatches);
    return () => media.removeEventListener('change', updateMatches);
  }, [query]);

  return matches;
}

export default function AppLayout() {
  const location = useLocation();
  const [layoutState, setLayoutState] = useState({
    mobileMenuOpen: false,
    pathname: location.pathname,
  });
  const shouldRenderRightPanel = useMediaQuery('(min-width: 1180px)');
  const shouldRenderMobileHeader = useMediaQuery('(max-width: 768px)');
  const isGameRoute = location.pathname === '/games';
  const showRightPanel = !isGameRoute && shouldRenderRightPanel;
  const showHeader = !isGameRoute || shouldRenderMobileHeader;
  const mobileMenuOpen = layoutState.pathname === location.pathname ? layoutState.mobileMenuOpen : false;

  const setMobileMenuOpen = (nextOpen: boolean) => {
    setLayoutState({ mobileMenuOpen: nextOpen, pathname: location.pathname });
  };

  useEffect(() => {
    document.body.classList.toggle('mobile-menu-open', mobileMenuOpen);
    return () => document.body.classList.remove('mobile-menu-open');
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.body.classList.toggle('game-focus-page', isGameRoute);
    return () => document.body.classList.remove('game-focus-page');
  }, [isGameRoute]);

  return (
    <div className={`app-layout ${isGameRoute ? 'game-focus-layout' : ''} ${isGameRoute && showHeader ? 'game-mobile-nav-layout' : ''}`}>
      <Sidebar mobileMenuOpen={mobileMenuOpen} closeMobileMenu={() => setMobileMenuOpen(false)} />
      <div className={`main-wrapper ${isGameRoute ? 'game-focus-wrapper' : ''}`}>
        {showHeader && <Header toggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />}
        <div className={`content-area ${isGameRoute ? 'game-focus-content' : ''} ${showRightPanel ? '' : 'no-right-panel'}`}>
          <main className={`main-content ${isGameRoute ? 'game-focus-main' : ''}`}>
            <Outlet />
          </main>
          {showRightPanel && (
            <Suspense fallback={null}>
              <RightPanel />
            </Suspense>
          )}
        </div>
      </div>

      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)}></div>}
    </div>
  );
}
