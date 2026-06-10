import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  CalendarIcon, Search, Phone, UserCheck, AlertTriangle, Loader2,
  LayoutGrid, List as ListIcon, User as UserIcon, Flame, Thermometer, Snowflake,
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useImoviewAtendimentos, callImoview } from '@/hooks/useImoviewApi';
import { useQueryClient } from '@tanstack/react-query';

type AtendimentoRaw = Record<string, any>;

type Atendimento = {
  codigo: string;
  raw: AtendimentoRaw;
  nomeCliente: string;
  telefoneCliente: string | null;
  emailCliente: string | null;
  status: string | null;
  etapa: string | null;
  corretor: string | null;
  criadoEm: string | null;
  atualizadoEm: string | null;
  finalidade: string | null;
  tipo: string | null;
};

const pick = (obj: any, keys: string[]): any => {
  for (const k of keys) {
    const parts = k.split('.');
    let v: any = obj;
    for (const p of parts) v = v?.[p];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
};

function normalize(a: AtendimentoRaw): Atendimento {
  return {
    codigo: String(pick(a, ['codigo', 'codigoAtendimento', 'id']) ?? '—'),
    raw: a,
    nomeCliente: String(pick(a, ['lead.nome', 'nomeCliente', 'cliente.nome', 'nome', 'pessoa.nome']) ?? '—'),
    telefoneCliente: pick(a, ['lead.telefone1', 'lead.telefone', 'telefoneCliente', 'cliente.telefone', 'telefone', 'pessoa.telefone'])?.toString() ?? null,
    emailCliente: pick(a, ['lead.email', 'emailCliente', 'cliente.email', 'email', 'pessoa.email']) ?? null,
    status: pick(a, ['situacao', 'status', 'nomeStatus', 'nomeSituacao', 'descricaoStatus']),
    etapa: pick(a, ['funil', 'nomeFunil', 'etapa', 'nomeEtapa', 'descricaoEtapa']),
    corretor: pick(a, ['corretor', 'nomeCorretor', 'corretor.nome', 'usuario.nome', 'nomeUsuario']),
    criadoEm: pick(a, ['datahorainclusao', 'datahoracadastro', 'datahoraentradalead', 'dataCadastro', 'dataCriacao', 'created_at']),
    atualizadoEm: pick(a, ['datahoraultimaalteracao', 'datahoraultimainteracao', 'dataAlteracao', 'updated_at']),
    finalidade: pick(a, ['finalidade', 'descricaoFinalidade', 'tipoFinalidade']),
    tipo: pick(a, ['tipo', 'descricaoTipo', 'tipoImovel', 'perfil.tipo']),
  };
}

const STATUS_STYLES: Record<string, string> = {
  novo: 'bg-slate-600 text-slate-100',
  ativo: 'bg-blue-600 text-white',
  'em andamento': 'bg-blue-600 text-white',
  'visita agendada': 'bg-indigo-600 text-white',
  proposta: 'bg-amber-500 text-white',
  fechado: 'bg-green-600 text-white',
  finalizado: 'bg-green-600 text-white',
  descartado: 'bg-red-600 text-white',
  perdido: 'bg-red-600 text-white',
};

const etapaStyleFor = (etapa?: string | null): string => {
  if (!etapa) return 'bg-gray-100 text-gray-600 border-gray-200';
  const s = String(etapa).toLowerCase();
  if (s.includes('inbound')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (s.includes('outbound')) return 'bg-purple-100 text-purple-700 border-purple-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};


const styleFor = (map: Record<string, string>, key?: string | null, fallback = '') => {
  if (!key) return fallback;
  const k = String(key).toLowerCase().trim();
  return map[k] ?? fallback;
};

const isClosedLike = (status?: string | null) => {
  const s = (status ?? '').toLowerCase();
  return s.includes('fechad') || s.includes('finaliz') || s.includes('descart') || s.includes('perdid');
};

const isClosedWon = (status?: string | null) => {
  const s = (status ?? '').toLowerCase();
  return s.includes('fechad') || s.includes('finaliz');
};

const PER_PAGE = 15;

interface Filters {
  busca: string;
  status: string;
  finalidade: string;
  corretor: string;
  dataInicio?: Date;
  dataFim?: Date;
}

const EMPTY_FILTERS: Filters = {
  busca: '', status: 'todos', finalidade: 'todas', corretor: 'todos',
};

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  // Aceita "DD/MM/YYYY HH:mm" do Imoview ou ISO
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  try { return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
};

const parseImoviewDate = (d: string | null): Date | null => {
  if (!d) return null;
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0));
  try { return parseISO(d); } catch { return null; }
};

export default function ListaAtendimentos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const canFilterByCorretor = user?.classificacao === 'master' || user?.isAdmin;

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [novoOpen, setNovoOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useImoviewAtendimentos({});

  const atendimentos: Atendimento[] = useMemo(() => {
    const lista: AtendimentoRaw[] = (data as any)?.lista ?? (Array.isArray(data) ? data : []);
    if (lista[0]) console.log('[Atendimentos] primeiro item bruto:', lista[0]);
    return lista.map(normalize);
  }, [data]);

  const corretorOptions = useMemo(() => {
    const set = new Set<string>();
    atendimentos.forEach((a) => { if (a.corretor) set.add(a.corretor); });
    return Array.from(set).sort();
  }, [atendimentos]);

  const filtered = useMemo(() => {
    const f = applied;
    return atendimentos.filter((a) => {
      const busca = f.busca.toLowerCase().trim();
      if (busca) {
        const hay = `${a.nomeCliente} ${a.telefoneCliente ?? ''} ${a.codigo}`.toLowerCase();
        if (!hay.includes(busca)) return false;
      }
      if (f.status !== 'todos' && !(a.status ?? '').toLowerCase().includes(f.status)) return false;
      if (f.finalidade !== 'todas' && (a.finalidade ?? '') !== f.finalidade) return false;
      if (canFilterByCorretor && f.corretor !== 'todos' && a.corretor !== f.corretor) return false;
      if (f.dataInicio || f.dataFim) {
        const dt = parseImoviewDate(a.criadoEm);
        if (!dt) return false;
        if (!isWithinInterval(dt, { start: f.dataInicio ?? new Date(0), end: f.dataFim ?? new Date() })) return false;
      }
      return true;
    });
  }, [atendimentos, applied, canFilterByCorretor]);

  const stats = useMemo(() => {
    const total = (data as any)?.quantidade ?? atendimentos.length;
    const emAndamento = atendimentos.filter((a) => !isClosedLike(a.status)).length;
    const agora = new Date();
    const fechadosMes = atendimentos.filter((a) => {
      if (!isClosedWon(a.status)) return false;
      const dt = parseImoviewDate(a.atualizadoEm || a.criadoEm);
      if (!dt) return false;
      try { return isWithinInterval(dt, { start: startOfMonth(agora), end: endOfMonth(agora) }); }
      catch { return false; }
    }).length;
    return { total, emAndamento, fechadosMes };
  }, [data, atendimentos]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const apply = () => { setApplied(filters); setPage(1); };
  const clear = () => { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); setPage(1); };

  const StatusBadge = ({ status }: { status: string | null }) => (
    <Badge className={cn('border-none capitalize', styleFor(STATUS_STYLES, status, 'bg-slate-600 text-slate-100'))}>
      {status ?? '—'}
    </Badge>
  );

  const EtapaBadge = ({ etapa }: { etapa: string | null }) => (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap',
      etapaStyleFor(etapa)
    )}>
      {etapa ?? '—'}
    </span>
  );


  return (
    <AppLayout title="Atendimentos">
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
        <Button onClick={() => setNovoOpen(true)} className="h-9">
          <Plus className="w-4 h-4 mr-1" /> Novo Atendimento
        </Button>
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-border bg-card p-4 mb-4 space-y-3 shadow-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Label className="text-xs">Buscar</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={filters.busca}
                    onChange={(e) => setFilters((p) => ({ ...p, busca: e.target.value }))}
                    placeholder="Nome, telefone ou código"
                    className="h-10 pl-9"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="andamento">Em andamento</SelectItem>
                    <SelectItem value="proposta">Proposta</SelectItem>
                    <SelectItem value="fechad">Fechado</SelectItem>
                    <SelectItem value="descart">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Finalidade</Label>
                <Select value={filters.finalidade} onValueChange={(v) => setFilters((p) => ({ ...p, finalidade: v }))}>
                  <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="Compra">Compra</SelectItem>
                    <SelectItem value="Aluguel">Aluguel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {canFilterByCorretor && (
                <div>
                  <Label className="text-xs">Corretor</Label>
                  <Select value={filters.corretor} onValueChange={(v) => setFilters((p) => ({ ...p, corretor: v }))}>
                    <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="todos">Todos</SelectItem>
                      {corretorOptions.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs">Data inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full h-10 mt-1 justify-start font-normal', !filters.dataInicio && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dataInicio ? format(filters.dataInicio, 'dd/MM/yyyy') : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1 z-[9999]">
                    <Calendar mode="single" selected={filters.dataInicio} onSelect={(d) => setFilters((p) => ({ ...p, dataInicio: d }))} className="p-3 pointer-events-auto" initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-xs">Data final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full h-10 mt-1 justify-start font-normal', !filters.dataFim && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dataFim ? format(filters.dataFim, 'dd/MM/yyyy') : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1 z-[9999]">
                    <Calendar mode="single" selected={filters.dataFim} onSelect={(d) => setFilters((p) => ({ ...p, dataFim: d }))} className="p-3 pointer-events-auto" initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={apply} className="flex-1">Aplicar</Button>
              <Button onClick={clear} variant="outline" className="flex-1">Limpar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Total', value: stats.total.toString() },
          { label: 'Em andamento', value: stats.emAndamento.toString() },
          { label: 'Fechados no mês', value: stats.fechadosMes.toString() },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-3 shadow-sm text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{k.label}</p>
            <p className="text-lg font-bold text-foreground mt-0.5">
              {isLoading ? <Skeleton className="h-5 w-10 mx-auto" /> : k.value}
            </p>
          </div>
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 mb-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-100">Não foi possível carregar atendimentos do Imoview</p>
            <p className="text-xs text-yellow-200/70 mt-0.5">{(error as any)?.message ?? 'Erro desconhecido'}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tentar novamente'}
          </Button>
        </div>
      ) : isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum atendimento encontrado.</p>
        </div>
      ) : (
        <>
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
                    key={a.codigo + idx}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                    className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="text-xs font-mono text-muted-foreground">{a.codigo}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{a.nomeCliente}</span>
                        {a.telefoneCliente && <span className="text-[11px] text-muted-foreground">{a.telefoneCliente}</span>}
                      </div>
                    </TableCell>
                    <TableCell><EtapaBadge etapa={a.etapa} /></TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-xs">{a.finalidade ?? '—'}{a.tipo ? ` • ${a.tipo}` : ''}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[160px]">{a.corretor ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(a.criadoEm)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/atendimentos/${a.codigo}`, { state: { atendimento: a.raw } })}>
                        Abrir
                      </Button>
                    </TableCell>

                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="sm:hidden space-y-3">
            {pageItems.map((a, idx) => (
              <motion.div
                key={a.codigo + idx}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.03 }}
                className="rounded-2xl border border-border bg-card shadow-sm p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground tracking-wide">{a.codigo}</span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{a.nomeCliente}</span>
                </div>
                {a.telefoneCliente && (
                  <a href={`tel:${a.telefoneCliente.replace(/\D/g, '')}`} className="flex items-center gap-2 text-xs hover:text-accent">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {a.telefoneCliente}
                  </a>
                )}
                <EtapaBadge etapa={a.etapa} />
                <p className="text-xs text-muted-foreground">{a.finalidade ?? '—'}{a.tipo ? ` • ${a.tipo}` : ''}</p>
                <p className="text-[11px] text-muted-foreground">Corretor: {a.corretor ?? '—'}</p>
                <p className="text-[11px] text-muted-foreground">{fmtDate(a.criadoEm)}</p>
                <Button variant="outline" className="w-full h-9 mt-1" onClick={() => navigate(`/atendimentos/${a.codigo}`, { state: { atendimento: a.raw } })}>
                  Abrir
                </Button>

              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <NovoAtendimentoDialog open={novoOpen} onOpenChange={setNovoOpen} onCreated={() => qc.invalidateQueries({ queryKey: ['imoview', 'atendimentos'] })} />
    </AppLayout>
  );
}

function NovoAtendimentoDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (b: boolean) => void; onCreated: () => void }) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [finalidade, setFinalidade] = useState('Compra');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!nome.trim() || !telefone.trim()) {
      toast.error('Informe pelo menos nome e telefone');
      return;
    }
    setLoading(true);
    try {
      await callImoview('incluir_atendimento', {
        nomeCliente: nome,
        telefoneCliente: telefone,
        emailCliente: email || undefined,
        finalidade,
      });
      toast.success('Atendimento criado no Imoview');
      onCreated();
      onOpenChange(false);
      setNome(''); setTelefone(''); setEmail(''); setFinalidade('Compra');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar atendimento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[9999]">
        <DialogHeader>
          <DialogTitle>Novo Atendimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-10 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Telefone *</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="h-10 mt-1" />
          </div>
          <div>
            <Label className="text-xs">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Finalidade de interesse</Label>
            <Select value={finalidade} onValueChange={setFinalidade}>
              <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value="Compra">Compra</SelectItem>
                <SelectItem value="Aluguel">Aluguel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Criar atendimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
