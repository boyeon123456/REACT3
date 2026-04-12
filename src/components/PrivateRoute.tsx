import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) return null; // 로딩 중엔 아무것도 렌더링 안 함

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
