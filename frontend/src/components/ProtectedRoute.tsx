import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isLogado } from '../services/api';
import { Layout } from './Layout';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isLogado()) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}
