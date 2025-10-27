import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { ReactElement } from 'react';

export default function ProtectedRoute({ children }: { children: ReactElement }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
