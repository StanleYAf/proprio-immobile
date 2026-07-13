import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import AppLayout from '@/components/AppLayout';
import {
  Building2, ShieldCheck, ClipboardList, UserPlus, PlusCircle,
  Calendar as CalendarIcon, FileText, ArrowRight, Trophy,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { useImoviewAtendimentos, useImoviewImoveis } from '@/hooks/useImoviewApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const FUNNEL_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ef4444', '#14b8a6', '#6366f1'];
const PIE_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ef4444', '#94a3b8'];

const brl = (v: any) => {
  const n = Number(v);
  if (!n || isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
};

const fmtDate = (v: any) => {
  if (!v) return '—';
  try { return format(new Date(v), 'dd/MM/yy', { locale: ptBR }); } catch { return '—'; }
};

const getHour = () => new Date().getHours();
const greeting = () => {
  const h = getHour();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isMasterOrAdmin = user?.classificacao === 'master' || user?.isAdmin;
  const canRegisterUsers = isMasterOrAdmin || user?.classificacao === 'stand1';

  const { data: imoveisData } = useImoviewImoveis({ numeroPagina: 1, numeroRegistros: 20 });
  const { data: atendimentosData } = useImoviewAtendimentos({});

  const imoveis: any[] = (imoveisData as any)?.lista ?? [];
  const atendimentos: any[] = (atendimentosData as any)?.lista ?? [];

  // ── Métricas ───────────────────────────────
  const imoveisAtivos = useMemo(() => imoveis.filter((i) => {
    const s = String(i?.situacao ?? '').toLowerCase();
    return s.includes('vago') || s.includes('dispon');
  }).length, [imoveis]);

  const atendimentosAbertos = useMemo(() => atendimentos.filter((a) => {
    const s = String(a?.situacao ?? '').toLowerCase();
    return !(s.includes('descart') || s.includes('fechad') || s.includes('perdid') || s.includes('finaliz'));
  }).length, [atendimentos]);

  const visitasAgendadas = useMemo(() => atendimentos.filter((a) => {
    const s = String(a?.situacao ?? '').toLowerCase();
    return s.includes('visita');
  }).length, [atendimentos]);

  const propostas = useMemo(() => atendimentos.filter((a) => {
    const s = String(a?.situacao ?? '').toLowerCase();
    return s.includes('proposta') || s.includes('negocia');
  }).length, [atendimentos]);

  // ── Gráfico funil ──────────────────────────
  const funilData = useMemo(() => {
    const map = new Map<string, number>();
    atendimentos.forEach((a) => {
      const k = String(a?.situacao ?? '—').trim() || '—';
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map, ([situacao, qtd]) => ({ situacao, qtd })).sort((a, b) => b.qtd - a.qtd);
  }, [atendimentos]);

  // ── Gráfico origem ─────────────────────────
  const origemData = useMemo(() => {
    const map = new Map<string, number>();
    atendimentos.forEach((a) => {
      const k = String(a?.midia ?? a?.nomeMidia ?? '—').trim() || '—';
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    const sorted = Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 6);
    const outros = sorted.slice(6).reduce((s, x) => s + x.value, 0);
    if (outros > 0) top.push({ name: 'Outros', value: outros });
    return top;
  }, [atendimentos]);

  // ── Tabelas ────────────────────────────────
  const ultimosAtendimentos = useMemo(() => {
    return [...atendimentos]
      .sort((a, b) => {
        const da = new Date(a?.datahorainclusao ?? a?.datahoraentradalead ?? 0).getTime();
        const db = new Date(b?.datahorainclusao ?? b?.datahoraentradalead ?? 0).getTime();
        return db - da;
      })
      .slice(0, 10);
  }, [atendimentos]);

  const ultimosImoveis = useMemo(() => {
    return [...imoveis]
      .sort((a, b) => {
        const da = new Date(a?.datahoracadastro ?? a?.dataCadastro ?? 0).getTime();
        const db = new Date(b?.datahoracadastro ?? b?.dataCadastro ?? 0).getTime();
        return db - da;
      })
      .slice(0, 10);
  }, [imoveis]);

  // ── Ranking corretores ─────────────────────
  const ranking = useMemo(() => {
    const map = new Map<string, number>();
    atendimentos.forEach((a) => {
      const nome = String(a?.corretor ?? a?.nomeCorretor ?? '—').trim() || '—';
      if (nome === '—') return;
      map.set(nome, (map.get(nome) ?? 0) + 1);
    });
    const total = Array.from(map.values()).reduce((s, n) => s + n, 0) || 1;
    return Array.from(map, ([nome, qtd]) => ({ nome, qtd, pct: Math.round((qtd / total) * 100) }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);
  }, [atendimentos]);

  const cards = [
    { label: 'Imóveis ativos', value: imoveisAtivos, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', onClick: () => navigate('/imoveis') },
    { label: 'Atendimentos abertos', value: atendimentosAbertos, icon: ClipboardList, color: 'text-green-600', bg: 'bg-green-50', onClick: () => navigate('/atendimentos') },
    { label: 'Visitas agendadas', value: visitasAgendadas, icon: CalendarIcon, color: 'text-yellow-600', bg: 'bg-yellow-50', onClick: () => navigate('/atendimentos?situacao=visita') },
    { label: 'Propostas em andamento', value: propostas, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', onClick: () => navigate('/atendimentos?situacao=proposta') },
  ];

  const actions = [
    { label: 'Cadastrar Imóvel', icon: PlusCircle, path: '/imovel/cadastrar', show: true },
    { label: 'Cadastrar Usuário', icon: UserPlus, path: '/usuarios/cadastrar', show: canRegisterUsers },
    { label: 'Logs de Auditoria', icon: ClipboardList, path: '/logs', show: isMasterOrAdmin },
    { label: 'Gerenciar Acessos', icon: ShieldCheck, path: '/admin', show: isMasterOrAdmin },
  ].filter((a) => a.show);

  const panelTitle = user?.isAdmin
    ? 'Painel do Admin'
    : user?.classificacao === 'master'
    ? 'Painel Administrativo'
    : 'Painel do Corretor';

  const hoje = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <AppLayout title={panelTitle}>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6"
      >
        <h2 className="text-xl md:text-2xl font-semibold text-foreground">
          {greeting()}, <span className="text-primary">{user?.name}</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{hoje}</p>
      </motion.div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map((c, i) => (
          <motion.button
            key={c.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
            onClick={c.onClick}
            className="bg-card border border-border/50 rounded-2xl p-4 text-left hover:border-primary/40 hover:shadow-md transition-all"
          >
            <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className="text-3xl font-bold text-foreground leading-none">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-2">{c.label}</p>
          </motion.button>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Funil de Vendas</h3>
          {funilData.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funilData}>
                <XAxis dataKey="situacao" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="qtd" radius={[6, 6, 0, 0]}>
                  {funilData.map((_, i) => <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Origem dos Leads</h3>
          {origemData.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Sem dados</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={origemData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 10 }}>
                  {origemData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Últimos atendimentos */}
        <div className="bg-card border border-border/50 rounded-2xl p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Últimos atendimentos</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/atendimentos')} className="h-7 text-xs">
              Ver todos <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Corretor</TableHead>
                  <TableHead className="text-xs">Situação</TableHead>
                  <TableHead className="text-xs">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultimosAtendimentos.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">Nenhum atendimento</TableCell></TableRow>
                ) : ultimosAtendimentos.map((a) => (
                  <TableRow
                    key={a.codigo}
                    className="cursor-pointer"
                    onClick={() => navigate(`/atendimentos/${a.codigo}`, { state: { atendimento: a } })}
                  >
                    <TableCell className="text-xs font-medium truncate max-w-[140px]">{a?.lead?.nome ?? '—'}</TableCell>
                    <TableCell className="text-xs truncate max-w-[120px]">{a?.corretor ?? '—'}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{a?.situacao ?? '—'}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(a?.datahorainclusao ?? a?.datahoraentradalead)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Imóveis recentes */}
        <div className="bg-card border border-border/50 rounded-2xl p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Imóveis recentes</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/imoveis')} className="h-7 text-xs">
              Ver todos <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Código</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Bairro</TableHead>
                  <TableHead className="text-xs">Valor</TableHead>
                  <TableHead className="text-xs">Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultimosImoveis.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">Nenhum imóvel</TableCell></TableRow>
                ) : ultimosImoveis.map((i) => (
                  <TableRow
                    key={i.codigo}
                    className="cursor-pointer"
                    onClick={() => navigate(`/imoveis/${i.codigo}`, { state: { imovel: i } })}
                  >
                    <TableCell className="text-xs font-medium">{i?.codigo ?? '—'}</TableCell>
                    <TableCell className="text-xs truncate max-w-[100px]">{i?.tipo ?? '—'}</TableCell>
                    <TableCell className="text-xs truncate max-w-[100px]">{i?.bairro ?? '—'}</TableCell>
                    <TableCell className="text-xs">{brl(i?.valor)}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{i?.situacao ?? '—'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Ranking corretores */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Ranking de Corretores</h3>
        </div>
        {ranking.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Sem dados de corretores</p>
        ) : (
          <div className="space-y-3">
            {ranking.map((r, i) => (
              <div key={r.nome} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground truncate">
                    <span className="text-muted-foreground mr-2">#{i + 1}</span>{r.nome}
                  </span>
                  <span className="text-muted-foreground">{r.qtd} ({r.pct}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Atalhos secundários */}
      {actions.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Atalhos</h3>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {actions.map((a) => (
              <button
                key={a.path}
                onClick={() => navigate(a.path)}
                className="bg-card border border-border/50 hover:border-primary/40 rounded-xl p-3 flex items-center gap-2 transition-all text-left"
              >
                <a.icon className="w-4 h-4 text-accent shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
