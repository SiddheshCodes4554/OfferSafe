import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export default function ProtectedRoute({ children, allowedRoles, redirectTo }: Props) {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-text-muted text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const fallback = redirectTo ?? (location.pathname.startsWith('/portal') ? '/portal/login' : '/login');
    return <Navigate to={fallback} state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    const fallback = userRole === 'student' ? '/dashboard' : userRole === 'org_admin' || userRole === 'org_member' ? '/portal' : '/';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
