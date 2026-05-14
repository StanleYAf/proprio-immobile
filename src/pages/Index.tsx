import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import AppLayout from '@/components/AppLayout';
import { Building2, ShieldCheck, ClipboardList, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isMasterOrAdmin = user?.classificacao === 'master' || user?.isAdmin;
  const canRegisterUsers = isMasterOrAdmin || user?.classificacao === 'stand1';

  const actions = [
    {
      label: 'Cadastrar Imóvel',
      description: 'Registre um novo imóvel no sistema',
      icon: Building2,
      path: '/imovel/cadastrar',
      color: 'bg-primary',
      iconColor: 'text-primary-foreground',
      textColor: 'text-primary-foreground',
      descColor: 'text-primary-foreground/60',
      show: true,
    },
    {
      label: 'Cadastrar Usuário',
      description: 'Adicione novos corretores ao sistema',
      icon: UserPlus,
      path: '/usuarios/cadastrar',
      color: 'bg-card border border-border/50',
      iconColor: 'text-accent',
      textColor: 'text-card-foreground',
      descColor: 'text-muted-foreground',
      show: canRegisterUsers,
    },
    {
      label: 'Logs de Auditoria',
      description: 'Monitore todas as ações realizadas',
      icon: ClipboardList,
      path: '/logs',
      color: 'bg-card border border-border/50',
      iconColor: 'text-secondary-foreground',
      textColor: 'text-card-foreground',
      descColor: 'text-muted-foreground',
      show: isMasterOrAdmin,
    },
    {
      label: 'Gerenciar Acessos',
      description: 'Controle os usuários do sistema',
      icon: ShieldCheck,
      path: '/admin',
      color: 'bg-card border border-accent/30',
      iconColor: 'text-accent',
      textColor: 'text-card-foreground',
      descColor: 'text-muted-foreground',
      show: isMasterOrAdmin,
    },
  ];

  const visibleActions = actions.filter(a => a.show);

  const panelTitle = user?.isAdmin
    ? 'Painel do Admin'
    : user?.classificacao === 'master'
    ? 'Painel Administrativo'
    : 'Painel do Corretor';

  return (
    <AppLayout title={panelTitle}>
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-5"
      >
        <p className="text-sm text-muted-foreground">
          Olá, <span className="font-semibold text-foreground">{user?.name}</span>
        </p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">O que deseja fazer hoje?</p>
      </motion.div>

      <div className="grid gap-3">
        {visibleActions.map((a, i) => (
          <motion.button
            key={a.path}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 + i * 0.07, ease: 'easeOut' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(a.path)}
            className={`${a.color} w-full flex items-center gap-4 p-4 rounded-2xl text-left shadow-sm transition-all active:shadow-none`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${i === 0 ? 'bg-primary-foreground/15' : 'bg-muted'}`}>
              <a.icon className={`w-5 h-5 ${a.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className={`font-semibold text-[15px] ${a.textColor} truncate`}>{a.label}</p>
              <p className={`text-xs ${a.descColor} mt-0.5 truncate`}>{a.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </AppLayout>
  );
}
