import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Home, Beaker, Microscope, Settings, FileText, Package } from 'lucide-react';
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
      <aside className="w-64 bg-white shadow flex flex-col border-r border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">VML</h1>
              <p className="text-xs text-gray-500">Vale Milk Labs</p>
            </div>
          </div>
          <div className="mt-4 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-xs font-medium text-blue-800">Análises Microbiológicas</p>
            <p className="text-xs text-blue-600">Acompanhamento Dinâmico</p>
          </div>
        </div>

        <nav className="p-4 space-y-1 flex-1">
          <NavLink to="/dashboard" icon={<Home size={20} />} label="Dashboard" />
          <NavLink to="/lancamentos" icon={<Beaker size={20} />} label="Lançamentos" />
          <NavLink to="/categorias" icon={<Microscope size={20} />} label="Categorias" />
          <NavLink to="/padroes" icon={<Settings size={20} />} label="Padrões" />
          <NavLink to="/produtos" icon={<FileText size={20} />} label="Produtos" />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-800 truncate">{usuario?.nome}</p>
            <p className="text-xs text-gray-500 truncate">{usuario?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
          >
            <LogOut size={16} />
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
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <Link
      to={to}
      className={
        isActive
          ? 'flex items-center space-x-3 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium transition-colors'
          : 'flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors'
      }
    >
      <span className={isActive ? 'text-blue-600' : 'text-gray-500'}>{icon}</span>
      <span className="text-sm">{label}</span>
    </Link>
  );
}
