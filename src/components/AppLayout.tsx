import { useAuth } from '@/lib/auth';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, ArrowLeft, Building2, ClipboardList, PlusCircle, UserPlus, BarChart3, Settings } from 'lucide-react';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type NavItem = { label: string; path: string; icon: any; show: boolean; mobile?: boolean };

export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  const isMasterOrAdmin = user?.classificacao === 'master' || user?.isAdmin;
  const isMaster = user?.classificacao === 'master' || user?.isAdmin;
  const canRegisterUsers = isMasterOrAdmin || user?.classificacao === 'stand1';

  const items: NavItem[] = [
    { label: 'Dashboard', path: '/', icon: Home, show: true, mobile: true },
    { label: 'Imóveis', path: '/imoveis', icon: Building2, show: true, mobile: true },
    { label: 'Atendimentos', path: '/atendimentos', icon: ClipboardList, show: true, mobile: true },
    { label: 'Cadastrar', path: '/imovel/cadastrar', icon: PlusCircle, show: true, mobile: true },
    { label: 'Usuários', path: '/usuarios/cadastrar', icon: UserPlus, show: canRegisterUsers },
    { label: 'Logs', path: '/logs', icon: BarChart3, show: isMaster },
    { label: 'Admin', path: '/admin', icon: Settings, show: isMasterOrAdmin },
  ];
  const desktopItems = items.filter(i => i.show);
  const mobileItems = items.filter(i => i.show && i.mobile);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border/40 bg-card sticky top-0 h-screen">
        <div className="px-5 py-4 border-b border-border/40">
          <p className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Montreal</p>
          {user && <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.name}</p>}
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {desktopItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="m-3 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header (mobile-style, kept on all sizes) */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md md:hidden"
        >
          <div className="flex items-center gap-3">
            {!isHome && (
              <button onClick={() => navigate('/')} className="p-1 rounded-md hover:bg-accent/20 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Montreal</span>
            {user && <span className="text-sm font-medium text-primary-foreground/70 ml-1">· {user.name}</span>}
          </div>
          <div className="flex items-center gap-1">
            {!isHome && (
              <button onClick={() => navigate('/')} className="p-2 rounded-md hover:bg-accent/20 transition-colors">
                <Home className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => { logout(); navigate('/login'); }} className="p-2 rounded-md hover:bg-accent/20 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </motion.header>

        {/* Content */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
          className="flex-1 p-4 max-w-lg md:max-w-5xl mx-auto w-full pb-24 md:pb-8"
        >
          {title && (
            <motion.h2
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="text-xl font-bold text-foreground mb-4"
            >
              {title}
            </motion.h2>
          )}
          {children}
        </motion.main>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-center py-5 px-4 hidden md:block"
        >
          <p className="text-[10px] text-muted-foreground/50 tracking-wider uppercase">Desenvolvido por Stanley Tiago · Poços de Caldas — MG</p>
        </motion.footer>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border/40 grid grid-cols-4">
        {mobileItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => cn(
              'flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
