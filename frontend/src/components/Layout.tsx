import { ReactNode, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, FileText, Package, CheckCircle, Eye, Microscope, Users } from 'lucide-react';
import { logout, getUsuario } from '../services/api';
import { ExpandableTabs } from './ui/expandable-tabs';

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

  // Definir todas as abas disponíveis com seus ícones
  const allTabs = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { title: 'Lançamentos', icon: FileText, path: '/lancamentos' },
    { title: 'Produtos', icon: Package, path: '/categorias' },
    { title: 'Padrões', icon: CheckCircle, path: '/padroes' },
    ...(usuario?.perfil === 'Admin' || usuario?.perfil === 'Diretora' || usuario?.perfil === 'Supervisora Qualidade'
      ? [{ title: 'Auditoria', icon: Eye, path: '/auditoria' }]
      : []),
    ...(usuario?.perfil === 'Admin'
      ? [
          { title: 'Microrganismos', icon: Microscope, path: '/microrganismos' },
          { title: 'Usuários', icon: Users, path: '/usuarios' },
        ]
      : []),
  ];

  // Encontrar o índice da aba ativa
  const selectedIndex = useMemo(() => {
    return allTabs.findIndex((tab) => location.pathname === tab.path || location.pathname.startsWith(tab.path + '/'));
  }, [location.pathname, allTabs]);

  // Converter para formato do ExpandableTabs
  const tabs = allTabs.map((tab) => ({
    title: tab.title,
    icon: tab.icon,
  }));

  const handleTabChange = (index: number | null) => {
    if (index !== null && index < allTabs.length) {
      navigate(allTabs[index].path);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow border-b border-gray-200">
        <div className="max-w-full mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center flex-shrink-0">
            <img src="/logo.png" alt="Vale Labs" className="h-12 w-auto" />
          </Link>

          {/* Center Navigation - ExpandableTabs */}
          <div className="flex-1 flex items-center justify-center mx-6">
            <ExpandableTabs
              tabs={tabs}
              selected={selectedIndex >= 0 ? selectedIndex : null}
              onChange={handleTabChange}
              className="border-gray-200"
              activeColor="text-blue-600"
            />
          </div>

          {/* Right: User Info & Logout */}
          <div className="flex items-center space-x-4 flex-shrink-0">
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
