import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Home, Beaker, Microscope, Settings, FileText } from 'lucide-react';
import { logout, getUsuario } from '../services/api';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const usuario = getUsuario();

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-indigo-600">VML</h1>
          <p className="text-sm text-gray-600">Vale Milk Labs</p>
        </div>

        <nav className="p-4 space-y-2">
          <NavLink to="/dashboard" icon={<Home size={20} />} label="Dashboard" />
          <NavLink
            to="/lancamentos"
            icon={<Beaker size={20} />}
            label="Lançamentos"
          />
          <NavLink
            to="/categorias"
            icon={<Microscope size={20} />}
            label="Categorias"
          />
          <NavLink
            to="/padroes"
            icon={<Settings size={20} />}
            label="Padrões"
          />
          <NavLink
            to="/produtos"
            icon={<FileText size={20} />}
            label="Produtos"
          />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-900">{usuario?.nome}</p>
            <p className="text-xs text-gray-500">{usuario?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

interface NavLinkProps {
  to: string;
  icon: ReactNode;
  label: string;
}

function NavLink({ to, icon, label }: NavLinkProps) {
  return (
    <Link
      to={to}
      className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
