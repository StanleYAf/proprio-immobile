import { useMemo, useState }  from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  CalendarIcon, Search, Phone, UserCheck, X,
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

type ClienteMini = { nome: string; telefone: string | null };

type Atendimento = {
  id: string;
  codigo: string | null;
  cliente_id: string | null;
  corretor_email: string | null;
  created_at: string | null;
  etapa: string | null;
  status: string | null;
  finalidade_interesse: string | null;
  tipo_interesse: string[] | null;
  clientes: ClienteMini | null;
};

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'novo', label: 'Novo' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'visita_agendada', label: 'Visita agendada' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'perdido', label: 'Perdido' },
];

const ETAPA_OPTIONS = [
  { value: 'todas', label: 'Todas' },
  { value: 'contato', label: 'Contato' },
  { value: 'qualificacao', label: 'Qualificação' },
  { value: 'visita', label: 'Visita' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'fechamento', label: 'Fechamento' },
];

const FINALIDADE_OPTIONS = [
  { value: 'todas', label: 'Todas' },
  { value: 'Compra', label: 'Compra' },
  { value: 'Aluguel', label: 'Aluguel' },
];

const ETAPA_STYLES: Record<string, string> = {
  contato: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  qualificacao: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  visita: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  negociacao: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  fechamento: 'bg-green-500/20 text-green-300 border-green-500/30',
};

const STATUS_STYLES: Record<string, string> = {
  novo: 'bg-slate-600 text-slate-100',
  em_andamento: 'bg-blue-600 text-white',
  visita_agendada: 'bg-indigo-600 text-white',
  proposta: 'bg-amber-500 text-white',
  fechado: 'bg-green-600 text-white',
  perdido: 'bg-red-600 text-white',
};

const PER_PAGE = 15;

interface Filters {
  busca: string;
  status: string;
  etapa: string;
  finalidade: string;
  corretor: string;
  dataInicio: Date | undefined;
  dataFim: Date | undefined;
}

const EMPTY_FILTERS: Filters = {
  busca: '',
  status: 'todos',
  etapa: 'todas',
  finalidade: 'todas',
  corretor: 'todos',
  dataInicio: undefined,
  dataFim: undefined,
};

export default function ListaAtendimentos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canFilterByCorretor = user?.classificacao === 'master' || user?.isAdmin;

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: atendimentos = [], isLoading } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atendimentos')
        .select('*, clientes(nome, telefone)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Atendimento[];
    },
  });

  const corretorOptions = useMemo(() => {
    const set = new Set<string>();
    atendimentos.forEach((a) => { if (a.corretor_email) set.add(a.corretor_email); });
    return Array.from(set).sort();
  }, [atendimentos]);

  const filtered = useMemo(() => {
    const f = applied;
    return atendimentos.filter((a) => {
      const clienteNome = (a.clientes?.nome ?? '').toLowerCase();
      const clienteTel = (a.clientes?.telefone ?? '').toLowerCase();
      const busca = f.busca.toLowerCase().trim();
      if (busca && !clienteNome.includes(busca) && !clienteTel.includes(busca)) return false;
      if (f.status !== 'todos' && (a.status ?? '') !== f.status) return false;
      if (f.etapa !== 'todas' && (a.etapa ?? '') !== f.etapa) return false;
      if (f.finalidade !== 'todas' && (a.finalidade_interesse ?? '') !== f.finalidade) return false;
      if (canFilterByCorretor && f.corretor !== 'todos' && a.corretor_email !== f.corretor) return false;
      if (f.dataInicio || f.dataFim) {
        const dt = a.created_at ? parseISO(a.created_at) : null;
        if (!dt) return false;
        const start = f.dataInicio ?? new Date(0);
        const end = f.dataFim ?? new Date();
        if (!isWithinInterval(dt, { start, end })) return false;
      }
      return true;
    });
  }, [atendimentos, applied, canFilterByCorretor]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const emAndamento = filtered.filter(
      (a) => (a.status ?? '') !== 'fechado' && (a.status ?? '') !== 'perdido'
    ).length;
    const agora = new Date();
    const fechadosMes = filtered.filter((a) => {
      if ((a.status ?? '') !== 'fechado') return false;
      const dt = a.created_at ? parseISO(a.created_at) : null;
      if (!dt) return false;
      return isWithinInterval(dt, { start: startOfMonth(agora), end: endOfMonth(agora) });
    }).length;
    return { total, emAndamento, fechadosMes };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const apply = () => { setApplied(filters); setPage(1); };
  const clear = () => { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); setPage(1); };

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
  };

  const EtapaBadge = ({ etapa }: { etapa: string | null }) => {
    const key = (etapa ?? 'contato').toLowerCase();
    const cls = ETAPA_STYLES[key] ?? ETAPA_STYLES.contato;
    const label = ETAPA_OPTIONS.find((o) => o.value === key)?.label ?? (etapa || '—');
    return <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', cls)}>{label}</span>;
  };

  const StatusBadge = ({ status }: { status: string | null }) => {
    const key = (status ?? 'novo').toLowerCase();
    const cls = STATUS_STYLES[key] ?? STATUS_STYLES.novo;
    const label = STATUS_OPTIONS.find((o) => o.value === key)?.label ?? (status || '—');
    return <Badge className={cn(cls, 'border-none capitalize')}>{label}</Badge>;
  };

  return (
    <AppLayout title="Atendimentos">
      {/* Top action */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground"
        >
          <Filter className="w-4 h-4" />
          Filtros
          {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <Button onClick={() => navigate('/atendimentos/novo')} className="h-9">
          <Plus className="w-4 h-4 mr-1" /> Novo Atendimento
        </Button>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 1, y: -8 }}
            animate={{ opacity: 1, y: 1 }}
            exit={{ opacity: 1, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-border bg-card p-4 mb-4 space-y-3 shadow-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Busca */}
              <div className="relative">
                <Label className="text-xs">Buscar cliente</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={filters.busca}
                    onChange={(e) => setFilters((p) => ({ ...p, busca: e.target.value }))}
                    placeholder="Nome ou telefone"
                    className="h-10 pl-9"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Etapa */}
              <div>
                <Label className="text-xs">Etapa</Label>
                <Select value={filters.etapa} onValueChange={(v) => setFilters((p) => ({ ...p, etapa: v }))}>
                  <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {ETAPA_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Finalidade */}
              <div>
                <Label className="text-xs">Finalidade de interesse</Label>
                <Select value={filters.finalidade} onValueChange={(v) => setFilters((p) => ({ ...p, finalidade: v }))}>
                  <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {FINALIDADE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data inicial */}
              <div>
                <Label className="text-xs">Data inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full h-10 mt-1 justify-start text-left font-normal', !filters.dataInicio && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dataInicio ? format(filters.dataInicio, 'dd/MM/yyyy') : <span>Selecionar</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1 z-[9999]">
                    <Calendar
                      mode="single"
                      selected={filters.dataInicio}
                      onSelect={(d) => setFilters((p) => ({ ...p, dataInicio: d }))}
                      className={cn('p-3 pointer-events-auto')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Data final */}
              <div>
                <Label className="text-xs">Data final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full h-10 mt-1 justify-start text-left font-normal', !filters.dataFim && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dataFim ? format(filters.dataFim, 'dd/MM/yyyy') : <span>Selecionar</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1 z-[9999]">
                    <Calendar
                      mode="single"
                      selected={filters.dataFim}
                      onSelect={(d) => setFilters((p) => ({ ...p, dataFim: d }))}
                      className={cn('p-3 pointer-events-auto')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Corretor */}
              {canFilterByCorretor && (
                <div className="sm:col-span-2">
                  <Label className="text-xs">Corretor</Label>
                  <Select value={filters.corretor} onValueChange={(v) => setFilters((p) => ({ ...p, corretor: v }))}>
                    <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="todos">Todos</SelectItem>
                      {corretorOptions.map((email) => (
                        <SelectItem key={email} value={email}>{email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={apply} className="flex-1">Aplicar</Button>
              <Button onClick={clear} variant="outline" className="flex-1">Limpar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Total', value: stats.total.toString() },
          { label: 'Em andamento', value: stats.emAndamento.toString() },
          { label: 'Fechados no mês', value: stats.fechadosMes.toString() },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-3 shadow-sm text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{k.label}</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Listagem */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando atendimentos...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum atendimento encontrado.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase">Código</TableHead>
                  <TableHead className="text-[10px] uppercase">Cliente</TableHead>
                  <TableHead className="text-[10px] uppercase">Etapa</TableHead>
                  <TableHead className="text-[10px] uppercase">Status</TableHead>
                  <TableHead className="text-[10px] uppercase">Interesse</TableHead>
                  <TableHead className="text-[10px] uppercase">Corretor</TableHead>
                  <TableHead className="text-[10px] uppercase">Criado em</TableHead>
                  <TableHead className="text-[10px] uppercase w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((a, idx) => (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.04 }}
                    className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="text-xs font-mono text-muted-foreground">{a.codigo ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{a.clientes?.nome ?? '—'}</span>
                        {a.clientes?.telefone && (
                          <span className="text-[11px] text-muted-foreground">{a.clientes.telefone}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><EtapaBadge etapa={a.etapa} /></TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-xs">
                      {a.finalidade_interesse ?? '—'}
                      {a.tipo_interesse && a.tipo_interesse.length > 1 ? ' • Múltiplos' : ` • ${a.tipo_interesse?.[0] ?? '—'}`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{a.corretor_email ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(a.created_at)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/atendimentos/${a.id}`)}>
                        Abrir
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {pageItems.map((a, idx) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 1.5 }}
                className="rounded-2xl border border-border bg-card shadow-sm p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground tracking-wide">{a.codigo ?? '—'}</span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{a.clientes?.nome ?? '—'}</span>
                </div>
                {a.clientes?.telefone && (
                  <a href={`tel:${a.clientes.telefone.replace(/\D/g, '')}`} className="flex items-center gap-2 text-xs text-foreground hover:text-accent">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {a.clientes.telefone}
                  </a>
                )}
                <div className="flex items-center gap-2">
                  <EtapaBadge etapa={a.etapa} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {a.finalidade_interesse ?? '—'} • {a.tipo_interesse?.[1] ?? '—'}
                </p>
                <p className="text-[11px] text-muted-foreground">Corretor: {a.corretor_email ?? '—'}</p>
                <p className="text-[11px] text-muted-foreground">{fmtDate(a.created_at)}</p>
                <Button variant="outline" className="w-full h-9 mt-1" onClick={() => navigate(`/atendimentos/${a.id}`)}>
                  Abrir
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
