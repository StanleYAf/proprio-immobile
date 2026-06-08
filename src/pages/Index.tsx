import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/AppLayout';
import { Building2, ShieldCheck, ClipboardList, UserPlus, Users, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { callImoview, useImoviewAtendimentos } from '@/hooks/useImoviewApi';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isMasterOrAdmin = user?.classificacao === 'master' || user?.isAdmin;
  const canRegisterUsers = isMasterOrAdmin || user?.classificacao === 'stand1';

  // Imóveis ativos (Imoview) — só precisamos da quantidade total
  const { data: imoveisData } = useQuery({
    queryKey: ['imoview', 'imoveis', 'count'],
    queryFn: () => callImoview<any>('listar_imoveis', { numeroPagina: 1, numeroRegistros: 1 }),
    retry: false,
  });
  const imoveisAtivos = Number(imoveisData?.quantidade ?? imoveisData?.lista?.length ?? 0);

  // Atendimentos (usa o cache compartilhado com a página /atendimentos)
  const { data: atendimentosData } = useImoviewAtendimentos({});
  const atendimentosLista: any[] = (atendimentosData as any)?.lista ?? [];
  const atendimentosAbertos = atendimentosLista.filter((a) => {
    const s = String(a?.situacao ?? a?.status ?? '').toLowerCase();
    return !(s.includes('fechad') || s.includes('finaliz') || s.includes('descart') || s.includes('perdid'));
  }).length;

  // Clientes únicos derivados dos atendimentos
  const clientesCount = new Set(
    atendimentosLista
      .map((a) => a?.lead?.codigo ?? a?.lead?.telefone1 ?? a?.lead?.nome)
      .filter(Boolean)
      .map(String)
  ).size;

  const metrics = [
    { label: 'Imóveis ativos', value: imoveisAtivos, icon: Building2, onClick: () => navigate('/imoveis') },
    { label: 'Atendimentos abertos', value: atendimentosAbertos, icon: ClipboardList, onClick: () => navigate('/atendimentos') },
    { label: 'Clientes', value: clientesCount, icon: Users, onClick: () => { toast('Módulo de clientes em breve'); navigate('/atendimentos'); } },
  ];


  const actions = [
    {
      label: 'Ver Imóveis',
      description: 'Lista completa de imóveis',
      icon: Building2,
      path: '/imoveis',
      color: 'bg-primary',
      iconColor: 'text-primary-foreground',
      textColor: 'text-primary-foreground',
      descColor: 'text-primary-foreground/60',
      show: true,
    },
    {
      label: 'Atendimentos',
      description: 'Gerencie seus atendimentos',
      icon: ClipboardList,
      path: '/atendimentos',
      color: 'bg-card border border-border/50',
      iconColor: 'text-accent',
      textColor: 'text-card-foreground',
      descColor: 'text-muted-foreground',
      show: true,
    },
    {
      label: 'Cadastrar Imóvel',
      description: 'Registre um novo imóvel no sistema',
      icon: PlusCircle,
      path: '/imovel/cadastrar',
      color: 'bg-card border border-border/50',
      iconColor: 'text-accent',
      textColor: 'text-card-foreground',
      descColor: 'text-muted-foreground',
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

      {/* Métricas */}
      <div className="mb-6 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-3 min-w-max md:min-w-0 md:grid md:grid-cols-3">
          {metrics.map((m, i) => (
            <motion.button
              key={m.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
              onClick={m.onClick}
              className="bg-card border border-border/50 rounded-2xl p-4 min-w-[150px] text-left hover:border-primary/40 transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <m.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold text-primary leading-none">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-2">{m.label}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="grid gap-3 md:grid-cols-2">
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
