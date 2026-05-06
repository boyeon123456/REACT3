import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { isAdminUser } from '../lib/isAdmin';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading } = useAuthStore();

  // 아직 로딩 중이면 아무것도 표시하지 않거나 로딩 인디케이터 표시
  if (loading) return null;

  const isAdmin = isAdminUser(user);

  // 로그인이 안 되어 있거나 admin 권한이 없으면 홈으로 리다이렉트
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }


  return <>{children}</>;
};

export default AdminRoute;
