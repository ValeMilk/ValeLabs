import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DetalhePage } from './pages/DetalhePage';
import { CategoriaPage } from './pages/CategoriaPage';
import { ProdutoPage } from './pages/ProdutoPage';
import { LancamentosPage } from './pages/LancamentosPage';
import { PadroesPage } from './pages/PadroesPage';
import { MicroorganismoPage } from './pages/MicroorganismoPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { AuditoriaPage } from './pages/AuditoriaPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PERFIL_ADMIN, PERFIS_GESTAO } from './lib/perfis';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/detalhe"
          element={
            <ProtectedRoute>
              <DetalhePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/categorias"
          element={
            <ProtectedRoute perfis={PERFIS_GESTAO}>
              <CategoriaPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/produtos/:produtoId"
          element={
            <ProtectedRoute perfis={PERFIS_GESTAO}>
              <ProdutoPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/lancamentos"
          element={
            <ProtectedRoute>
              <LancamentosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/padroes"
          element={
            <ProtectedRoute perfis={PERFIS_GESTAO}>
              <PadroesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/microrganismos"
          element={
            <ProtectedRoute perfis={PERFIS_GESTAO}>
              <MicroorganismoPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/usuarios"
          element={
            <ProtectedRoute perfis={PERFIL_ADMIN}>
              <UsuariosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/auditoria"
          element={
            <ProtectedRoute perfis={PERFIS_GESTAO}>
              <AuditoriaPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
