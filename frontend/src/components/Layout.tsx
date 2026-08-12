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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 shadow-xl">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">VML</h1>
          <p className="text-sm text-gray-400 mt-1">Vale Milk Labs</p>
          <div className="mt-4 px-3 py-2 bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-400 font-medium">Sistema de Análises</p>
            <p className="text-xs text-gray-500">Microbiológicas</p>
          </div>
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

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 bg-gradient-to-t from-gray-900 to-gray-800">
          <div className="mb-4 bg-gray-700 bg-opacity-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-100 truncate">{usuario?.nome}</p>
            <p className="text-xs text-gray-400 truncate">{usuario?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
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
      className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-all group"
    >
      <span className="text-gray-400 group-hover:text-indigo-400 transition-colors">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
