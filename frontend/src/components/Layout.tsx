import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { logout, getUsuario } from '../services/api';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const usuario = getUsuario();
  const location = useLocation();

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow border-b border-gray-200">
        <div className="max-w-full mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center">
            <img src="/logo.png" alt="Vale Labs" className="h-12 w-auto" />
          </Link>

          {/* Center Navigation */}
          <div className="flex items-center space-x-1">
            <NavLink to="/dashboard" label="Dashboard" isActive={isActive('/dashboard')} />
            <NavLink to="/lancamentos" label="Lançamentos" isActive={isActive('/lancamentos')} />
            <NavLink to="/categorias" label="Categorias" isActive={isActive('/categorias')} />
            <NavLink to="/padroes" label="Padrões" isActive={isActive('/padroes')} />
            <NavLink to="/produtos" label="Produtos" isActive={isActive('/produtos')} />
            {usuario?.perfil === 'Admin' && (
              <>
                <NavLink to="/microrganismos" label="Microrganismos" isActive={isActive('/microrganismos')} />
                <NavLink to="/usuarios" label="Usuários" isActive={isActive('/usuarios')} />
              </>
            )}
          </div>

          {/* Right: User Info & Logout */}
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">{usuario?.nome}</p>
              <p className="text-xs text-gray-500">{usuario?.perfil}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-full mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}

interface NavLinkProps {
  to: string;
  label: string;
  isActive: boolean;
}

function NavLink({ to, label, isActive }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={`
        px-4 py-2 text-sm font-medium rounded-lg transition-colors
        ${
          isActive
            ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
            : 'text-gray-700 hover:bg-gray-50'
        }
      `}
    >
      {label}
    </Link>
  );
}
