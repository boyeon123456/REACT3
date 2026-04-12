import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Home';
import Board from './pages/Board';
import PostDetail from './pages/PostDetail';
import WritePost from './pages/WritePost';
import MiniGame from './pages/MiniGame';
import MyPage from './pages/MyPage';
import Admin from './pages/Admin';
import AdminRoute from './components/AdminRoute';
import MealPage from './pages/MealPage';
import Login from './pages/Login';
import { useAuthStore } from './store/authStore';
import './App.css';

function App() {
  const { loading } = useAuthStore();

  // Firebase 인증 상태 확인 중 — 깜빡임 방지
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-primary, #0f1117)',
        flexDirection: 'column', gap: '16px'
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '3px solid #6c63ff', borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: '#888', fontSize: '14px' }}>로딩 중...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* 로그인 페이지 — 이미 로그인된 경우 홈으로 */}
        <Route path="/login" element={<Login />} />

        {/* 보호된 페이지들 — 로그인 필요 */}
        <Route path="/" element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }>
          <Route index element={<Home />} />
          <Route path="board" element={<Board />} />
          <Route path="post/:id" element={<PostDetail />} />
          <Route path="write" element={<WritePost />} />
          <Route path="games" element={<MiniGame />} />
          <Route path="meals" element={<MealPage />} />
          <Route path="mypage" element={<MyPage />} />
          <Route path="admin" element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
