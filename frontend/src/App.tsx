import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CategoriaPage } from './pages/CategoriaPage';
import { ProdutoPage } from './pages/ProdutoPage';
import { LancamentosPage } from './pages/LancamentosPage';
import { PadroesPage } from './pages/PadroesPage';
import { ProtectedRoute } from './components/ProtectedRoute';

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
          path="/categorias/:categoria"
          element={
            <ProtectedRoute>
              <CategoriaPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/produtos/:produtoId"
          element={
            <ProtectedRoute>
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
            <ProtectedRoute>
              <PadroesPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
