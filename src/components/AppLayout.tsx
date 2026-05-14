import { useAuth } from '@/lib/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md"
      >
        <div className="flex items-center gap-3">
          {!isHome && (
            <motion.button
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              onClick={() => navigate('/')}
              className="p-1 rounded-md hover:bg-accent/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
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
        className="flex-1 p-4 max-w-lg mx-auto w-full"
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
        className="text-center py-5 px-4"
      >
        <div className="inline-block border border-border/30 rounded-xl px-5 py-3 bg-muted/30">
          <p className="text-[10px] font-semibold text-muted-foreground/50 tracking-wider uppercase">
            Desenvolvido por
          </p>
          <p className="text-xs font-bold text-muted-foreground/70 mt-0.5 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Stanley Tiago
          </p>
          <div className="w-8 h-px bg-muted-foreground/15 mx-auto my-1.5" />
          <p className="text-[9px] text-muted-foreground/40 font-medium">
            Software Solutions · Poços de Caldas — MG
          </p>
          <p className="text-[8px] text-muted-foreground/25 mt-0.5">
            Todos os direitos reservados
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
