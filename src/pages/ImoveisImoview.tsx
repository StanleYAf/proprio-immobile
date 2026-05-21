import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertCircle, Building2, BedDouble, Car, Ruler, ChevronLeft, ChevronRight, Filter, Phone, MessageCircle, ArrowLeft } from 'lucide-react';
import { useImoviewImoveis } from '@/hooks/useImoviewApi';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

type Filtros = {
  status: string;
  finalidade: string;
  tipo: string;
  bairro: string;
  cidade: string;
  numeroRegistros: number;
};

const initialFiltros: Filtros = {
  status: '',
  finalidade: '',
  tipo: '',
  bairro: '',
  cidade: '',
  numeroRegistros: 12,
};

const fmtMoney = (v?: number | string | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (!n || isNaN(n as number)) return '—';
  return (n as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
};

function getFotos(imovel: any): string[] {
  const raw = imovel?.Photos || imovel?.photos || imovel?.fotos || imovel?.Fotos || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((f: any) => (typeof f === 'string' ? f : f?.URL || f?.url || f?.Url)).filter(Boolean);
}

function ImovelCard({ imovel, onOpen }: { imovel: any; onOpen: () => void }) {
  const fotos = getFotos(imovel);
  const [idx, setIdx] = useState(0);
  const foto = fotos[idx];
  return (
    <Card className="rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-[16/10] bg-muted">
        {foto ? (
          <img src={foto} alt={imovel.TipoImovel || 'Imóvel'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Building2 className="w-12 h-12" />
          </div>
        )}
        {fotos.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + fotos.length) % fotos.length); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur p-1.5 rounded-full hover:bg-background">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % fotos.length); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur p-1.5 rounded-full hover:bg-background">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 right-2 text-[10px] bg-background/80 px-2 py-0.5 rounded-full">{idx + 1}/{fotos.length}</div>
          </>
        )}
        {imovel.Status && (
          <Badge className="absolute top-2 left-2" variant="secondary">{imovel.Status}</Badge>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">#{imovel.CodigoImovel || imovel.codigo || '—'}</span>
          <span className="text-base font-semibold">{fmtMoney(imovel.ValorVenda || imovel.ValorLocacao)}</span>
        </div>
        <p className="text-sm font-medium truncate">
          {[imovel.TipoImovel, imovel.Bairro, imovel.Cidade].filter(Boolean).join(' · ') || 'Imóvel'}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {imovel.Dormitorios != null && <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{imovel.Dormitorios}</span>}
          {imovel.Vagas != null && <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" />{imovel.Vagas}</span>}
          {(imovel.AreaUtil || imovel.AreaTotal) && <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" />{imovel.AreaUtil || imovel.AreaTotal}m²</span>}
        </div>
        {(imovel.NomeProprietario || imovel.TelefoneProprietario) && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            <p className="truncate">{imovel.NomeProprietario || '—'}</p>
            {imovel.TelefoneProprietario && <p className="truncate">{imovel.TelefoneProprietario}</p>}
          </div>
        )}
        <Button onClick={onOpen} variant="outline" size="sm" className="w-full mt-2">Ver detalhes</Button>
      </CardContent>
    </Card>
  );
}

export default function ImoveisImoview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Filtros>(initialFiltros);
  const [filtros, setFiltros] = useState<Filtros>(initialFiltros);
  const [pagina, setPagina] = useState(1);
  const [selected, setSelected] = useState<any | null>(null);
  const [showFiltros, setShowFiltros] = useState(true);
  const [importing, setImporting] = useState(false);

  const queryParams = useMemo(() => ({
    numeroPagina: pagina,
    numeroRegistros: filtros.numeroRegistros,
    status: filtros.status || undefined,
    finalidade: filtros.finalidade || undefined,
    tipo: filtros.tipo || undefined,
    bairro: filtros.bairro || undefined,
    cidade: filtros.cidade || undefined,
  }), [filtros, pagina]);

  const { data, isLoading, isError, error, refetch, isFetching } = useImoviewImoveis(queryParams);

  const configMissing = (error as any)?.code === 'CONFIG_MISSING';
  const imoveis: any[] = (data as any)?.Imoveis || (data as any)?.imoveis || (Array.isArray(data) ? (data as any) : []) || [];
  const totalPaginas: number = (data as any)?.TotalPaginas || (data as any)?.totalPaginas || 1;

  const aplicar = () => { setFiltros(draft); setPagina(1); };
  const limpar = () => { setDraft(initialFiltros); setFiltros(initialFiltros); setPagina(1); };

  async function importar(imovel: any) {
    try {
      setImporting(true);
      const fotos = getFotos(imovel);
      const codigo = `IMV-${imovel.CodigoImovel || imovel.codigo || Date.now()}`;
      const payload: any = {
        codigo,
        tipo: imovel.TipoImovel || null,
        finalidade: imovel.Finalidade || null,
        status: imovel.Status || 'ativo',
        valor: imovel.ValorVenda || imovel.ValorLocacao || null,
        condominio: imovel.ValorCondominio || null,
        iptu: imovel.ValorIPTU || null,
        endereco: imovel.Logradouro || null,
        numero: imovel.Numero || null,
        complemento: imovel.Complemento || null,
        bairro: imovel.Bairro || null,
        cidade: imovel.Cidade || null,
        estado: imovel.Estado || null,
        area_interna: imovel.AreaUtil || null,
        area_lote: imovel.AreaTotal || null,
        quartos: imovel.Dormitorios || null,
        suites: imovel.Suites || null,
        banheiros: imovel.Banheiros || null,
        vagas: imovel.Vagas || null,
        descricao: imovel.Descricao || null,
        nome_proprietario: imovel.NomeProprietario || null,
        telefone_proprietario: imovel.TelefoneProprietario || null,
        fotos,
        corretor_email: user?.email || null,
      };
      const { error: insErr } = await supabase.from('imoveis').insert(payload);
      if (insErr) throw insErr;
      toast.success(`Imóvel importado com sucesso! Código: ${codigo}`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao importar imóvel');
    } finally {
      setImporting(false);
    }
  }

  return (
    <AppLayout title="Imóveis — Imoview">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
      </div>

      {configMissing && (
        <div className="mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 text-yellow-900 dark:text-yellow-200 px-4 py-3 text-sm">
          Configure as credenciais do Imoview em Detalhes do Convênio → Chave da API.
        </div>
      )}

      <Collapsible open={showFiltros} onOpenChange={setShowFiltros} className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" />Filtros</Button>
          </CollapsibleTrigger>
          <span className="text-xs text-muted-foreground">{isFetching ? 'Atualizando…' : `${imoveis.length} resultado(s)`}</span>
        </div>
        <CollapsibleContent>
          <Card className="rounded-2xl">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={draft.status || 'all'} onValueChange={(v) => setDraft({ ...draft, status: v === 'all' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Disponivel">Disponível</SelectItem>
                    <SelectItem value="Vendido">Vendido</SelectItem>
                    <SelectItem value="Alugado">Alugado</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Finalidade</Label>
                <Select value={draft.finalidade || 'all'} onValueChange={(v) => setDraft({ ...draft, finalidade: v === 'all' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Venda">Venda</SelectItem>
                    <SelectItem value="Locacao">Locação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={draft.tipo || 'all'} onValueChange={(v) => setDraft({ ...draft, tipo: v === 'all' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Apartamento">Apartamento</SelectItem>
                    <SelectItem value="Casa">Casa</SelectItem>
                    <SelectItem value="Sala Comercial">Sala Comercial</SelectItem>
                    <SelectItem value="Terreno">Terreno</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Bairro</Label>
                <Input value={draft.bairro} onChange={(e) => setDraft({ ...draft, bairro: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Cidade</Label>
                <Input value={draft.cidade} onChange={(e) => setDraft({ ...draft, cidade: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Registros por página</Label>
                <Select value={String(draft.numeroRegistros)} onValueChange={(v) => setDraft({ ...draft, numeroRegistros: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="48">48</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 flex justify-end gap-2">
                <Button variant="outline" onClick={limpar}>Limpar</Button>
                <Button onClick={aplicar}>Buscar</Button>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-2xl overflow-hidden">
              <Skeleton className="aspect-[16/10] w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-8 w-full mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError && !configMissing ? (
        <Card className="rounded-2xl max-w-md mx-auto mt-12">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="text-sm text-muted-foreground">Não foi possível conectar ao Imoview. Verifique as credenciais nas configurações.</p>
            <p className="text-xs text-muted-foreground/70 break-all">{(error as any)?.message}</p>
            <Button onClick={() => refetch()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {imoveis.map((im, i) => (
                <motion.div key={im.CodigoImovel || im.codigo || i}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}>
                  <ImovelCard imovel={im} onOpen={() => setSelected(im)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {imoveis.length === 0 && !isFetching && (
            <p className="text-center text-sm text-muted-foreground py-12">Nenhum imóvel encontrado.</p>
          )}

          <div className="flex items-center justify-center gap-3 mt-6">
            <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
            <span className="text-sm text-muted-foreground">Página {pagina} de {totalPaginas}</span>
            <Button variant="outline" size="sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && <DetalheImovelSheet imovel={selected} onImport={() => importar(selected)} importing={importing} />}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function DetalheImovelSheet({ imovel, onImport, importing }: { imovel: any; onImport: () => void; importing: boolean }) {
  const fotos = getFotos(imovel);
  const [main, setMain] = useState(0);
  const tel = (imovel.TelefoneProprietario || '').replace(/\D/g, '');
  const wa = tel ? `https://wa.me/55${tel}` : null;

  const sections: Array<{ title: string; items: Array<[string, any]> }> = [
    { title: 'Identificação', items: [['Código', imovel.CodigoImovel], ['Tipo', imovel.TipoImovel], ['Finalidade', imovel.Finalidade], ['Status', imovel.Status]] },
    { title: 'Valores', items: [['Venda', fmtMoney(imovel.ValorVenda)], ['Locação', fmtMoney(imovel.ValorLocacao)], ['Condomínio', fmtMoney(imovel.ValorCondominio)], ['IPTU', fmtMoney(imovel.ValorIPTU)]] },
    { title: 'Endereço', items: [['Logradouro', imovel.Logradouro], ['Número', imovel.Numero], ['Complemento', imovel.Complemento], ['Bairro', imovel.Bairro], ['Cidade', imovel.Cidade], ['Estado', imovel.Estado]] },
    { title: 'Características', items: [['Área Útil', imovel.AreaUtil && `${imovel.AreaUtil}m²`], ['Área Total', imovel.AreaTotal && `${imovel.AreaTotal}m²`], ['Dormitórios', imovel.Dormitorios], ['Suítes', imovel.Suites], ['Banheiros', imovel.Banheiros], ['Vagas', imovel.Vagas]] },
    { title: 'Proprietário', items: [['Nome', imovel.NomeProprietario], ['Telefone', imovel.TelefoneProprietario]] },
  ];

  return (
    <>
      <SheetHeader>
        <SheetTitle>{imovel.TipoImovel || 'Imóvel'} · #{imovel.CodigoImovel}</SheetTitle>
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

        {imovel.Descricao && (
          <div>
            <h4 className="text-sm font-semibold mb-1">Descrição</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{imovel.Descricao}</p>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2 border-t">
          {wa && (
            <Button asChild variant="outline">
              <a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="w-4 h-4 mr-2" />WhatsApp do proprietário</a>
            </Button>
          )}
          {imovel.TelefoneProprietario && (
            <Button asChild variant="outline">
              <a href={`tel:${imovel.TelefoneProprietario}`}><Phone className="w-4 h-4 mr-2" />Ligar</a>
            </Button>
          )}
          <Button onClick={onImport} disabled={importing}>{importing ? 'Importando…' : 'Importar para o sistema'}</Button>
        </div>
      </div>
    </>
  );
}
