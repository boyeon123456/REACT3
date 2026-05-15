import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import AdminRoute from './components/AdminRoute';
import AppLayout from './components/layout/AppLayout';
import PrivateRoute from './components/PrivateRoute';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';

const Admin = lazy(() => import('./pages/Admin'));
const Board = lazy(() => import('./pages/Board'));
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const MealPage = lazy(() => import('./pages/MealPage'));
const MiniGame = lazy(() => import('./pages/MiniGame'));
const MyPage = lazy(() => import('./pages/MyPage'));
const MyPageActivity = lazy(() => import('./pages/MyPageActivity'));
const MyPageInventory = lazy(() => import('./pages/MyPageInventory'));
const MyPageSaved = lazy(() => import('./pages/MyPageSaved'));
const MyProfileEdit = lazy(() => import('./pages/MyProfileEdit'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const Settings = lazy(() => import('./pages/Settings'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const Shop = lazy(() => import('./pages/Shop'));
const TimetablePage = lazy(() => import('./pages/TimetablePage'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const WritePost = lazy(() => import('./pages/WritePost'));

function AppLoading() {
  return (
    <div className="app-loading-screen">
      <div className="app-loading-spinner" />
      <p>Loading...</p>
    </div>
  );
}

function App() {
  const { loading, user } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);
  const accent = useThemeStore((state) => state.accent);
  const density = useThemeStore((state) => state.density);
  const reducedMotion = useThemeStore((state) => state.reducedMotion);
  const applyAppearance = useThemeStore((state) => state.applyAppearance);

  useEffect(() => {
    if (user?.settings?.appearance) {
      applyAppearance(user.settings.appearance);
    }
  }, [applyAppearance, user?.settings?.appearance]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-accent', accent);
    root.setAttribute('data-density', density);
    root.setAttribute('data-reduced-motion', String(reducedMotion));
  }, [accent, density, reducedMotion, theme]);

  if (loading) {
    return <AppLoading />;
  }

  return (
    <Router>
      <Suspense fallback={<AppLoading />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="board" element={<Board />} />
            <Route path="post/:id" element={<PostDetail />} />
            <Route path="write" element={<WritePost />} />
            <Route path="edit/:id" element={<WritePost />} />
            <Route path="games" element={<MiniGame />} />
            <Route path="meals" element={<MealPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="shop" element={<Shop />} />
            <Route path="mypage" element={<MyPage />} />
            <Route path="mypage/activity" element={<MyPageActivity />} />
            <Route path="mypage/saved" element={<MyPageSaved />} />
            <Route path="mypage/inventory" element={<MyPageInventory />} />
            <Route path="mypage/edit-profile" element={<MyProfileEdit />} />
            <Route path="mypage/settings" element={<Navigate to="/mypage/edit-profile" replace />} />
            <Route path="profile/:userId" element={<UserProfile />} />
            <Route path="profile/:userId/activity" element={<UserProfile tab="activity" />} />
            <Route path="settings" element={<Settings />} />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
