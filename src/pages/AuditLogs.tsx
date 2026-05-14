import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Search, CalendarIcon, Clock, User, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tables } from '@/integrations/supabase/types';

type SentRecord = Tables<'sent_records'>;

export default function AuditLogs() {
  const [records, setRecords] = useState<SentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterAcao, setFilterAcao] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sent_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) setRecords(data);
    setLoading(false);
  }

  const filtered = records.filter((r) => {
    if (filterTipo !== 'todos' && r.tipo !== filterTipo) return false;
    if (filterAcao !== 'todos' && r.acao !== filterAcao) return false;
    if (filterStatus !== 'todos' && r.status !== filterStatus) return false;
    if (dateFrom) {
      const recordDate = new Date(r.created_at);
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (recordDate < from) return false;
    }
    if (dateTo) {
      const recordDate = new Date(r.created_at);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (recordDate > to) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      return (
        r.titulo.toLowerCase().includes(s) ||
        r.usuario_email.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const statusColor = (s: string) => {
    if (s === 'enviado') return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
    if (s === 'erro') return 'bg-red-500/15 text-red-700 border-red-500/30';
    return 'bg-muted text-muted-foreground';
  };

  const tipoLabel = (t: string) => (t === 'imovel' ? 'Imóvel' : t === 'cliente' ? 'Cliente' : t);
  const acaoLabel = (a: string) => (a === 'cadastrar' ? 'Cadastro' : a === 'desativar' ? 'Desativação' : a);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AppLayout title="Logs de Auditoria">
      {/* Filters */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("flex-1 justify-start text-left text-sm h-9 font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                {dateFrom ? format(dateFrom, 'dd/MM/yy') : 'De'}
                {dateFrom && <X className="w-3 h-3 ml-auto" onClick={(e) => { e.stopPropagation(); setDateFrom(undefined); }} />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("flex-1 justify-start text-left text-sm h-9 font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                {dateTo ? format(dateTo, 'dd/MM/yy') : 'Até'}
                {dateTo && <X className="w-3 h-3 ml-auto" onClick={(e) => { e.stopPropagation(); setDateTo(undefined); }} />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex gap-2">
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="flex-1 text-sm h-9">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="imovel">Imóvel</SelectItem>
              <SelectItem value="cliente">Cliente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAcao} onValueChange={setFilterAcao}>
            <SelectTrigger className="flex-1 text-sm h-9">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas ações</SelectItem>
              <SelectItem value="cadastrar">Cadastro</SelectItem>
              <SelectItem value="desativar">Desativação</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="flex-1 text-sm h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="erro">Erro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Records */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-xl p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </motion.div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-10 text-muted-foreground"
        >
          Nenhum registro encontrado.
        </motion.div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-2">{filtered.length} registro(s)</p>
          <AnimatePresence>
            {filtered.map((r, i) => {
              const isExpanded = expandedId === r.id;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.3 }}
                  className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className="w-full text-left p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs font-medium">
                          {tipoLabel(r.tipo)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {acaoLabel(r.acao)}
                        </Badge>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(r.status)}`}>
                          {r.status === 'enviado' ? '✓ Enviado' : '✗ Erro'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{r.titulo || '(sem título)'}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{r.usuario_email}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(r.created_at)}</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground mt-1 shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border p-3 bg-muted/30">
                          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                            <FileText className="w-3 h-3" /> Dados enviados
                          </div>
                          <pre className="text-xs bg-background rounded-lg p-3 overflow-x-auto max-h-60 border border-border whitespace-pre-wrap break-all">
                            {JSON.stringify(r.dados, null, 2)}
                          </pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </AppLayout>
  );
}
