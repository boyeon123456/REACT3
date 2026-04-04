import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import RightPanel from './RightPanel';
import './AppLayout.css';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <Header />
        <div className="content-area">
          <main className="main-content">
            <Outlet />
          </main>
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
