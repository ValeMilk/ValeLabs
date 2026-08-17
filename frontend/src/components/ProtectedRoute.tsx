import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isLogado, getUsuario } from '../services/api';
import { Layout } from './Layout';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Se informado, apenas esses perfis acessam a rota; os demais voltam ao dashboard. */
  perfis?: string[];
}

export function ProtectedRoute({ children, perfis }: ProtectedRouteProps) {
  if (!isLogado()) {
    return <Navigate to="/login" replace />;
  }

  if (perfis && !perfis.includes(getUsuario()?.perfil)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}
