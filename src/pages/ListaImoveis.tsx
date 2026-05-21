import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Plus, Filter, ImageOff, BedDouble,
  Car, Ruler, User as UserIcon, Phone, X, ChevronDown, ChevronUp,
  ExternalLink, AlertTriangle, Download, MessageCircle, Building2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useImoviewImoveis } from '@/hooks/useImoviewApi';

type Origem = 'local' | 'imoview';

type Imovel = {
  id: string;
  codigo: string | null;
  tipo: string | null;
  finalidade: string | null;
  status: string | null;
  valor: number | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  area_interna: number | null;
  quartos: number | null;
  vagas: number | null;
  nome_proprietario: string | null;
  telefone_proprietario: string | null;
  corretor_email: string | null;
  fotos: string[] | null;
  origem: Origem;
  _raw?: any;
};

const TIPO_OPTIONS = [
  'Apartamento', 'Casa', 'Sala Comercial', 'Terreno',
  'Galpão', 'Loja', 'Flat', 'Cobertura',
];

const STATUS_STYLES: Record<string, string> = {
  ativo: 'bg-success text-success-foreground',
  inativo: 'bg-muted text-muted-foreground',
  vendido: 'bg-blue-600 text-white',
  alugado: 'bg-purple-600 text-white',
};

const PIE_COLORS = [
  'hsl(var(--accent))', 'hsl(var(--primary))', '#6366f1',
  '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
];

function parseValor(valor: any): number | null {
  if (valor == null || valor === '' || valor === 0 || valor === '0') return null;
  if (typeof valor === 'number') return isNaN(valor) ? null : valor;
  if (typeof valor === 'string') {
    const limpo = valor.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').trim();
    const n = parseFloat(limpo);
    return isNaN(n) || n === 0 ? null : n;
  }
  return null;
}

const fmtBRL = (v: any): string => {
  const n = parseValor(v);
  if (n == null) return 'Consulte-nos';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const maskCurrency = (v: string) => {
  const digits = v.replace(/\D/g, '');
  if (!digits) return '';
  return (parseInt(digits, 10) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
};
const parseBRL = (v: string) => {
  if (!v) return null;
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
};

const PER_PAGE = 12;

interface Filters {
  tipos: string[];
  finalidade: string;
  status: string;
  bairro: string;
  cidade: string;
  precoMin: string;
  precoMax: string;
  quartosMin: string;
  vagasMin: string;
  corretor: string;
  origem: 'todos' | Origem;
}

const EMPTY_FILTERS: Filters = {
  tipos: [], finalidade: 'todos', status: 'todos', bairro: '', cidade: '',
  precoMin: '', precoMax: '', quartosMin: '0', vagasMin: '0', corretor: 'todos',
  origem: 'todos',
};

function extractFotos(raw: any): string[] {
  const fotos = raw?.fotos;
  if (Array.isArray(fotos)) {
    const arr = fotos.map((f: any) => (typeof f === 'string' ? f : f?.url || f?.URL || f?.Url)).filter(Boolean);
    if (arr.length) return arr;
  }
  if (raw?.urlfotoprincipal) return [raw.urlfotoprincipal];
  return [];
}

function mapImoviewToImovel(raw: any): Imovel {
  return {
    id: `imv-${raw.codigo ?? Math.random().toString(36).slice(2)}`,
    codigo: raw.codigo != null ? String(raw.codigo) : null,
    tipo: raw.tipo ?? null,
    finalidade: raw.finalidade ?? null,
    status: (raw.situacao ?? 'ativo').toString().toLowerCase(),
    valor: parseValor(raw.valor),
    bairro: raw.bairro ?? null,
    cidade: raw.cidade ?? null,
    estado: raw.estado ?? null,
    area_interna: raw.areainterna ?? raw.areaprincipal ?? null,
    quartos: raw.numeroquartos ?? null,
    vagas: raw.numerovagas ?? null,
    nome_proprietario: raw.proprietarios?.[0]?.nome ?? null,
    telefone_proprietario: raw.proprietarios?.[0]?.telefone ?? null,
    corretor_email: null,
    fotos: extractFotos(raw),
    origem: 'imoview',
    _raw: raw,
  };
}

function PhotoCarousel({ fotos }: { fotos: string[] }) {
  const [idx, setIdx] = useState(0);
  if (!fotos || fotos.length === 0) {
    return (
      <div className="w-full aspect-[16/10] bg-muted flex items-center justify-center rounded-t-2xl">
        <ImageOff className="w-10 h-10 text-muted-foreground/50" />
      </div>
    );
  }
  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setIdx((i) => (i - 1 + fotos.length) % fotos.length); };
  const next = (e: React.MouseEvent) => { e.stopPropagation(); setIdx((i) => (i + 1) % fotos.length); };
  return (
    <div className="relative w-full aspect-[16/10] bg-muted rounded-t-2xl overflow-hidden group">
      <img src={fotos[idx]} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
      {fotos.length > 1 && (
        <>
          <button type="button" onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-1.5 shadow opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Foto anterior"><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-1.5 shadow opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Próxima foto"><ChevronRight className="w-4 h-4" /></button>
          <div className="absolute bottom-2 right-2 bg-background/80 rounded-full px-2 py-0.5 text-[10px] font-medium">
            {idx + 1}/{fotos.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function ListaImoveis() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canFilterByCorretor = user?.classificacao === 'master' || user?.isAdmin;

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedImoview, setSelectedImoview] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedKeys, setImportedKeys] = useState<Set<string>>(new Set());

  const { data: locais = [], isLoading: loadingLocal, refetch: refetchLocal } = useQuery({
    queryKey: ['imoveis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('imoveis')
        .select('id, codigo, tipo, finalidade, status, valor, bairro, cidade, estado, area_interna, quartos, vagas, nome_proprietario, telefone_proprietario, corretor_email, fotos')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, origem: 'local' as Origem })) as Imovel[];
    },
  });

  const finalidadeImoview = applied.finalidade === 'Aluguel' ? 1 : 2;
  const { data: imoviewData, isError: imoviewError, isLoading: loadingImoview } = useImoviewImoveis({
    numeroPagina: 1,
    numeroRegistros: 20,
    finalidade: String(finalidadeImoview),
  });

  const imoveisImoview: Imovel[] = useMemo(() => {
    const lista: any[] = (imoviewData as any)?.lista || [];
    return lista.map(mapImoviewToImovel);
  }, [imoviewData]);

  const isLoading = loadingLocal || loadingImoview;

  const imoveis: Imovel[] = useMemo(() => {
    // Filter out imoview items already imported in this session
    const filteredImoview = imoveisImoview.filter((i) => !importedKeys.has(i.codigo ?? ''));
    return [...locais, ...filteredImoview];
  }, [locais, imoveisImoview, importedKeys]);

  const corretorOptions = useMemo(() => {
    const set = new Set<string>();
    imoveis.forEach((i) => { if (i.corretor_email) set.add(i.corretor_email); });
    return Array.from(set).sort();
  }, [imoveis]);

  const filtered = useMemo(() => {
    const f = applied;
    const min = parseBRL(f.precoMin);
    const max = parseBRL(f.precoMax);
    const qMin = parseInt(f.quartosMin, 10) || 0;
    const vMin = parseInt(f.vagasMin, 10) || 0;
    return imoveis.filter((i) => {
      if (f.origem !== 'todos' && i.origem !== f.origem) return false;
      if (f.tipos.length && !f.tipos.includes(i.tipo ?? '')) return false;
      if (f.finalidade !== 'todos' && i.finalidade !== f.finalidade) return false;
      if (f.status !== 'todos' && i.status !== f.status) return false;
      if (f.bairro && !(i.bairro ?? '').toLowerCase().includes(f.bairro.toLowerCase())) return false;
      if (f.cidade && !(i.cidade ?? '').toLowerCase().includes(f.cidade.toLowerCase())) return false;
      if (min != null && (i.valor ?? 0) < min) return false;
      if (max != null && (i.valor ?? 0) > max) return false;
      if (qMin && (i.quartos ?? 0) < qMin) return false;
      if (vMin && (i.vagas ?? 0) < vMin) return false;
      if (canFilterByCorretor && f.corretor !== 'todos' && i.corretor_email !== f.corretor) return false;
      return true;
    });
  }, [imoveis, applied, canFilterByCorretor]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const precos = filtered.map((i) => parseValor(i.valor)).filter((v): v is number => v != null && v > 0);
    const areas = filtered.map((i) => i.area_interna).filter((v): v is number => typeof v === 'number');
    const precoMedio = precos.length ? precos.reduce((a, b) => a + b, 0) / precos.length : 0;
    const areaMedia = areas.length ? areas.reduce((a, b) => a + b, 0) / areas.length : 0;
    const ativos = filtered.filter((i) => i.status === 'ativo').length;
    return { total, precoMedio, areaMedia, ativos };
  }, [filtered]);

  const tiposChart = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((i) => {
      const k = i.tipo || 'Outros';
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [filtered]);

  const bairrosChart = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((i) => {
      const k = i.bairro || '—';
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map, ([bairro, qtd]) => ({ bairro, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const apply = () => { setApplied(filters); setPage(1); };
  const clear = () => { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); setPage(1); };

  const toggleTipo = (t: string) => {
    setFilters((p) => ({
      ...p,
      tipos: p.tipos.includes(t) ? p.tipos.filter((x) => x !== t) : [...p.tipos, t],
    }));
  };

  async function importarImoview(raw: any) {
    try {
      setImporting(true);
      const fotos = extractFotos(raw);
      const codigo = `IMV-${raw.codigo || Date.now()}`;
      const payload: any = {
        codigo,
        tipo: raw.tipo || null,
        finalidade: raw.finalidade || null,
        status: (raw.situacao || 'ativo').toString().toLowerCase(),
        valor: raw.valor || null,
        condominio: raw.valorcondominio || null,
        iptu: raw.valoriptu || null,
        endereco: raw.endereco || null,
        numero: raw.numero || null,
        complemento: raw.complemento || null,
        bairro: raw.bairro || null,
        cidade: raw.cidade || null,
        estado: raw.estado || null,
        area_interna: raw.areainterna || raw.areaprincipal || null,
        area_lote: raw.arealote || null,
        quartos: raw.numeroquartos || null,
        suites: raw.numerosuites || null,
        banheiros: raw.numerobanhos || null,
        vagas: raw.numerovagas || null,
        descricao: raw.descricao || null,
        nome_proprietario: raw.proprietarios?.[0]?.nome || null,
        telefone_proprietario: raw.proprietarios?.[0]?.telefone || null,
        fotos,
        corretor_email: user?.email || null,
      };
      const { error: insErr } = await supabase.from('imoveis').insert(payload);
      if (insErr) throw insErr;
      setImportedKeys((s) => new Set(s).add(String(raw.codigo ?? '')));
      toast.success(`Imóvel importado! Código: ${codigo}`);
      setSelectedImoview(null);
      refetchLocal();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao importar imóvel');
    } finally {
      setImporting(false);
    }
  }

  return (
    <AppLayout title="Imóveis">
      {/* Imoview error banner */}
      {imoviewError && !loadingImoview && (
        <div className="mb-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 text-yellow-900 dark:text-yellow-200 px-3 py-2 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Não foi possível carregar imóveis do Imoview. Exibindo apenas imóveis locais.</span>
        </div>
      )}

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
        <Button onClick={() => navigate('/imovel/cadastrar')} className="h-9">
          <Plus className="w-4 h-4 mr-1" /> Cadastrar Imóvel
        </Button>
      </div>

      {/* Filters */}
      {filtersOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4 mb-4 space-y-3 shadow-sm"
        >
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide">Tipo</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {TIPO_OPTIONS.map((t) => {
                const active = filters.tipos.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTipo(t)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border hover:border-accent'
                    }`}
                  >
                    {t}
                    {active && <X className="w-3 h-3 inline ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Origem</Label>
              <Select value={filters.origem} onValueChange={(v) => setFilters((p) => ({ ...p, origem: v as Filters['origem'] }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="local">Apenas locais</SelectItem>
                  <SelectItem value="imoview">Apenas Imoview</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Finalidade</Label>
              <Select value={filters.finalidade} onValueChange={(v) => setFilters((p) => ({ ...p, finalidade: v }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Venda">Venda</SelectItem>
                  <SelectItem value="Aluguel">Aluguel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
                  <SelectItem value="alugado">Alugado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Bairro</Label>
              <Input value={filters.bairro} onChange={(e) => setFilters((p) => ({ ...p, bairro: e.target.value }))} placeholder="Bairro" className="h-10" />
            </div>
            <div>
              <Label className="text-xs">Cidade</Label>
              <Input value={filters.cidade} onChange={(e) => setFilters((p) => ({ ...p, cidade: e.target.value }))} placeholder="Cidade" className="h-10" />
            </div>
            <div>
              <Label className="text-xs">Preço mín (R$)</Label>
              <Input
                value={filters.precoMin}
                onChange={(e) => setFilters((p) => ({ ...p, precoMin: maskCurrency(e.target.value) }))}
                placeholder="0,00" className="h-10"
              />
            </div>
            <div>
              <Label className="text-xs">Preço máx (R$)</Label>
              <Input
                value={filters.precoMax}
                onChange={(e) => setFilters((p) => ({ ...p, precoMax: maskCurrency(e.target.value) }))}
                placeholder="0,00" className="h-10"
              />
            </div>
            <div>
              <Label className="text-xs">Quartos mínimo</Label>
              <Select value={filters.quartosMin} onValueChange={(v) => setFilters((p) => ({ ...p, quartosMin: v }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="0">Qualquer</SelectItem>
                  <SelectItem value="1">1+</SelectItem>
                  <SelectItem value="2">2+</SelectItem>
                  <SelectItem value="3">3+</SelectItem>
                  <SelectItem value="4">4+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Vagas mínimo</Label>
              <Select value={filters.vagasMin} onValueChange={(v) => setFilters((p) => ({ ...p, vagasMin: v }))}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="0">Qualquer</SelectItem>
                  <SelectItem value="1">1+</SelectItem>
                  <SelectItem value="2">2+</SelectItem>
                  <SelectItem value="3">3+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canFilterByCorretor && (
              <div className="sm:col-span-2">
                <Label className="text-xs">Corretor</Label>
                <Select value={filters.corretor} onValueChange={(v) => setFilters((p) => ({ ...p, corretor: v }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
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

      {/* Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Total', value: stats.total.toString() },
          { label: 'Preço médio', value: fmtBRL(stats.precoMedio) },
          { label: 'Área média', value: `${Math.round(stats.areaMedia)} m²` },
          { label: 'Ativos', value: stats.ativos.toString() },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{k.label}</p>
            <p className="text-lg font-bold text-foreground mt-0.5 truncate">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <p className="text-xs font-semibold text-foreground mb-2">Por tipo</p>
          <div className="h-40">
            {tiposChart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tiposChart} dataKey="value" nameKey="name" outerRadius={55} innerRadius={28}>
                    {tiposChart.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip contentStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground">Sem dados</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <p className="text-xs font-semibold text-foreground mb-2">Top 5 bairros</p>
          <div className="h-40">
            {bairrosChart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bairrosChart}>
                  <XAxis dataKey="bairro" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={20} />
                  <RTooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="qtd" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground">Sem dados</p>}
          </div>
        </div>
      </div>

      {/* Listing */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando imóveis...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Nenhum imóvel encontrado.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pageItems.map((i, idx) => {
              const statusKey = (i.status ?? 'ativo').toLowerCase();
              const statusClass = STATUS_STYLES[statusKey] ?? 'bg-muted text-muted-foreground';
              const isImoview = i.origem === 'imoview';
              return (
                <motion.div
                  key={i.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05, ease: 'easeOut' }}
                  className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="relative">
                    <PhotoCarousel fotos={i.fotos ?? []} />
                    {/* Origem badge — top-left */}
                    <Badge
                      className={`absolute top-2 left-2 border-none ${
                        isImoview
                          ? 'bg-blue-600 text-white hover:bg-blue-600'
                          : 'bg-muted text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {isImoview ? (
                        <><ExternalLink className="w-3 h-3 mr-1" /> Imoview</>
                      ) : 'Local'}
                    </Badge>
                    {/* Status badge — top-right */}
                    <Badge className={`absolute top-2 right-2 ${statusClass} border-none capitalize`}>
                      {statusKey}
                    </Badge>
                  </div>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <p className="text-[10px] font-mono text-muted-foreground tracking-wide">{i.codigo ?? '—'}</p>
                    <p className="font-bold text-foreground text-sm leading-tight">
                      {[i.tipo, i.bairro].filter(Boolean).join(' · ')}
                      {(i.cidade || i.estado) && (
                        <span className="font-normal text-muted-foreground"> — {[i.cidade, i.estado].filter(Boolean).join('/')}</span>
                      )}
                    </p>
                    <p className="text-lg font-bold text-accent">{fmtBRL(i.valor)}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{i.quartos ?? 0} quartos</span>
                      <span className="inline-flex items-center gap-1"><Car className="w-3.5 h-3.5" />{i.vagas ?? 0} vagas</span>
                      <span className="inline-flex items-center gap-1"><Ruler className="w-3.5 h-3.5" />{i.area_interna ?? 0} m²</span>
                    </div>
                    {i.nome_proprietario && (
                      <p className="text-xs text-foreground inline-flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-muted-foreground" /> {i.nome_proprietario}
                      </p>
                    )}
                    {i.telefone_proprietario && (
                      <a
                        href={`tel:${i.telefone_proprietario.replace(/\D/g, '')}`}
                        className="text-xs text-foreground inline-flex items-center gap-1.5 hover:text-accent"
                      >
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {i.telefone_proprietario}
                      </a>
                    )}
                    {i.corretor_email && (
                      <p className="text-[11px] text-muted-foreground truncate">Corretor: {i.corretor_email}</p>
                    )}
                    {isImoview ? (
                      <div className="flex gap-2 mt-1">
                        <Button
                          onClick={() => setSelectedImoview(i._raw)}
                          variant="outline"
                          className="flex-1 h-9"
                        >
                          Ver detalhes
                        </Button>
                        <Button
                          onClick={() => importarImoview(i._raw)}
                          disabled={importing}
                          className="flex-1 h-9"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Importar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => navigate(`/imoveis/${i.id}`)}
                        variant="outline"
                        className="w-full mt-1 h-9"
                      >
                        Ver detalhes
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
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

      {/* Imoview detail Sheet */}
      <Sheet open={!!selectedImoview} onOpenChange={(o) => !o && setSelectedImoview(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedImoview && (
            <ImoviewDetailSheet
              imovel={selectedImoview}
              onImport={() => importarImoview(selectedImoview)}
              importing={importing}
            />
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function ImoviewDetailSheet({ imovel, onImport, importing }: { imovel: any; onImport: () => void; importing: boolean }) {
  const fotos = extractFotos(imovel);
  const [main, setMain] = useState(0);
  const tel = String(imovel.proprietarios?.[0]?.telefone || '').replace(/\D/g, '');
  const wa = tel ? `https://wa.me/55${tel}` : null;

  const sections: Array<{ title: string; items: Array<[string, any]> }> = [
    { title: 'Identificação', items: [['Código', imovel.codigo], ['Tipo', imovel.tipo], ['Finalidade', imovel.finalidade], ['Situação', imovel.situacao]] },
    { title: 'Valores', items: [['Valor', fmtBRL(imovel.valor)], ['Condomínio', fmtBRL(imovel.valorcondominio)], ['IPTU', fmtBRL(imovel.valoriptu)]] },
    { title: 'Endereço', items: [['Logradouro', imovel.endereco], ['Número', imovel.numero], ['Complemento', imovel.complemento], ['Bairro', imovel.bairro], ['Cidade', imovel.cidade], ['Estado', imovel.estado], ['CEP', imovel.cep]] },
    { title: 'Características', items: [
      ['Área Principal', imovel.areaprincipal && `${imovel.areaprincipal}m²`],
      ['Área Interna', imovel.areainterna && `${imovel.areainterna}m²`],
      ['Área Externa', imovel.areaexterna && `${imovel.areaexterna}m²`],
      ['Área Lote', imovel.arealote && `${imovel.arealote}m²`],
      ['Quartos', imovel.numeroquartos], ['Suítes', imovel.numerosuites], ['Banheiros', imovel.numerobanhos], ['Vagas', imovel.numerovagas], ['Andar', imovel.numeroandar],
    ] },
    { title: 'Proprietário', items: [['Nome', imovel.proprietarios?.[0]?.nome], ['Telefone', imovel.proprietarios?.[0]?.telefone]] },
    { title: 'Captador', items: [['Nome', imovel.captadores?.[0]?.nome], ['Email', imovel.captadores?.[0]?.email]] },
  ];

  return (
    <>
      <SheetHeader>
        <SheetTitle>{imovel.tipo || 'Imóvel'} · #{imovel.codigo}</SheetTitle>
      </SheetHeader>
      <div className="mt-4 space-y-4">
        {fotos.length > 0 ? (
          <div>
            <div className="aspect-video w-full bg-muted rounded-xl overflow-hidden">
              <img src={fotos[main]} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {fotos.map((f, i) => (
                <button key={i} onClick={() => setMain(i)}
                  className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${i === main ? 'border-primary' : 'border-transparent'}`}>
                  <img src={f} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="aspect-video bg-muted rounded-xl flex items-center justify-center"><Building2 className="w-12 h-12 text-muted-foreground" /></div>
        )}

        {sections.map((s) => (
          <div key={s.title}>
            <h4 className="text-sm font-semibold mb-1">{s.title}</h4>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {s.items.filter(([, v]) => v != null && v !== '' && v !== '—').map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border/40 py-1">
                  <span className="text-muted-foreground text-xs">{k}</span>
                  <span className="text-right text-xs truncate ml-2">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {imovel.descricao && (
          <div>
            <h4 className="text-sm font-semibold mb-1">Descrição</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{imovel.descricao}</p>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2 border-t">
          {wa && (
            <Button asChild variant="outline">
              <a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="w-4 h-4 mr-2" />WhatsApp do proprietário</a>
            </Button>
          )}
          {imovel.proprietarios?.[0]?.telefone && (
            <Button asChild variant="outline">
              <a href={`tel:${imovel.proprietarios[0].telefone}`}><Phone className="w-4 h-4 mr-2" />Ligar</a>
            </Button>
          )}
          <Button onClick={onImport} disabled={importing}>
            <Download className="w-4 h-4 mr-2" />
            {importing ? 'Importando…' : 'Importar para o sistema'}
          </Button>
        </div>
      </div>
    </>
  );
}
