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
  finalidade: number; // 1=aluguel, 2=venda
  bairro: string;
  cidade: string;
  numeroquartos: string;
  valorde: string;
  valorate: string;
};

const initialFiltros: Filtros = {
  finalidade: 2,
  bairro: '',
  cidade: '',
  numeroquartos: '',
  valorde: '',
  valorate: '',
};

const PAGE_SIZE = 20;

const fmtMoney = (v?: number | string | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (!n || isNaN(n as number)) return '—';
  return (n as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
};

function getFotos(imovel: any): string[] {
  const raw = imovel?.fotos || [];
  if (!Array.isArray(raw)) return [];
  const arr = raw.map((f: any) => (typeof f === 'string' ? f : f?.url || f?.URL || f?.Url)).filter(Boolean);
  if (arr.length === 0 && imovel?.urlfotoprincipal) arr.push(imovel.urlfotoprincipal);
  return arr;
}

function precoPrincipal(imovel: any) {
  return imovel?.valor;
}

function ImovelCard({ imovel, onOpen }: { imovel: any; onOpen: () => void }) {
  const fotos = getFotos(imovel);
  const [idx, setIdx] = useState(0);
  const foto = fotos[idx] || imovel?.urlfotoprincipal;
  return (
    <Card className="rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-[16/10] bg-muted">
        {foto ? (
          <img src={foto} alt={imovel.tipo || 'Imóvel'} className="w-full h-full object-cover" />
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
        {imovel.situacao && (
          <Badge className="absolute top-2 left-2" variant="secondary">{imovel.situacao}</Badge>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">#{imovel.codigo || '—'}</span>
          <span className="text-base font-semibold">{fmtMoney(precoPrincipal(imovel))}</span>
        </div>
        <p className="text-sm font-medium truncate">
          {[imovel.tipo, imovel.bairro, imovel.cidade].filter(Boolean).join(' · ') || 'Imóvel'}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {imovel.numeroquartos != null && <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{imovel.numeroquartos}</span>}
          {imovel.numerovagas != null && <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" />{imovel.numerovagas}</span>}
          {imovel.areaprincipal != null && <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" />{imovel.areaprincipal}m²</span>}
        </div>
        {(imovel.proprietarios?.[0]?.nome || imovel.proprietarios?.[0]?.telefone) && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            <p className="truncate">{imovel.proprietarios?.[0]?.nome || '—'}</p>
            {imovel.proprietarios?.[0]?.telefone && <p className="truncate">{imovel.proprietarios[0].telefone}</p>}
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

  const queryParams = useMemo(() => {
    const p: Record<string, any> = {
      numeroPagina: pagina,
      numeroRegistros: PAGE_SIZE,
      finalidade: filtros.finalidade,
    };
    if (filtros.numeroquartos) p.numeroquartos = Number(filtros.numeroquartos);
    if (filtros.valorde) p.valorde = Number(filtros.valorde);
    if (filtros.valorate) p.valorate = Number(filtros.valorate);
    return p;
  }, [filtros, pagina]);

  const { data, isLoading, isError, error, refetch, isFetching } = useImoviewImoveis(queryParams as any);

  const configMissing = (error as any)?.code === 'CONFIG_MISSING';
  const imoveis: any[] = (data as any)?.lista || [];
  const quantidade: number = (data as any)?.quantidade ?? imoveis.length;
  const menorvalor: number | undefined = (data as any)?.menorvalor;
  const maiorvalor: number | undefined = (data as any)?.maiorvalor;
  const totalPaginas: number = Math.max(1, Math.ceil(quantidade / PAGE_SIZE));

  // Filtro client-side de bairro/cidade (caso a API não filtre por texto)
  const imoveisFiltrados = useMemo(() => {
    return imoveis.filter((im) => {
      if (filtros.bairro && !String(im.bairro || '').toLowerCase().includes(filtros.bairro.toLowerCase())) return false;
      if (filtros.cidade && !String(im.cidade || '').toLowerCase().includes(filtros.cidade.toLowerCase())) return false;
      return true;
    });
  }, [imoveis, filtros.bairro, filtros.cidade]);

  const aplicar = () => { setFiltros(draft); setPagina(1); };
  const limpar = () => { setDraft(initialFiltros); setFiltros(initialFiltros); setPagina(1); };

  async function importar(imovel: any) {
    try {
      setImporting(true);
      const fotos = getFotos(imovel);
      const codigo = `IMV-${imovel.codigo || Date.now()}`;
      const payload: any = {
        codigo,
        tipo: imovel.tipo || null,
        finalidade: imovel.finalidade || null,
        status: imovel.situacao || 'ativo',
        valor: imovel.valor || null,
        condominio: imovel.valorcondominio || null,
        iptu: imovel.valoriptu || null,
        endereco: imovel.endereco || null,
        numero: imovel.numero || null,
        complemento: imovel.complemento || null,
        bairro: imovel.bairro || null,
        cidade: imovel.cidade || null,
        estado: imovel.estado || null,
        area_interna: imovel.areainterna || imovel.areaprincipal || null,
        area_lote: imovel.arealote || null,
        quartos: imovel.numeroquartos || null,
        suites: imovel.numerosuites || null,
        banheiros: imovel.numerobanhos || null,
        vagas: imovel.numerovagas || null,
        descricao: imovel.descricao || null,
        nome_proprietario: imovel.proprietarios?.[0]?.nome || null,
        telefone_proprietario: imovel.proprietarios?.[0]?.telefone || null,
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
          <span className="text-xs text-muted-foreground">
            {isFetching ? 'Atualizando…' : `${quantidade} imóve${quantidade === 1 ? 'l' : 'is'} encontrado${quantidade === 1 ? '' : 's'}`}
          </span>
        </div>

        {(menorvalor || maiorvalor) && (
          <div className="text-xs text-muted-foreground mb-2">
            Faixa de preço: {fmtMoney(menorvalor)} – {fmtMoney(maiorvalor)}
          </div>
        )}

        <CollapsibleContent>
          <Card className="rounded-2xl">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Finalidade</Label>
                <Select value={String(draft.finalidade)} onValueChange={(v) => setDraft({ ...draft, finalidade: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="2">Venda</SelectItem>
                    <SelectItem value="1">Aluguel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Quartos (mín.)</Label>
                <Input type="number" min={0} value={draft.numeroquartos} onChange={(e) => setDraft({ ...draft, numeroquartos: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Valor de</Label>
                  <Input type="number" value={draft.valorde} onChange={(e) => setDraft({ ...draft, valorde: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Valor até</Label>
                  <Input type="number" value={draft.valorate} onChange={(e) => setDraft({ ...draft, valorate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Bairro</Label>
                <Input value={draft.bairro} onChange={(e) => setDraft({ ...draft, bairro: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Cidade</Label>
                <Input value={draft.cidade} onChange={(e) => setDraft({ ...draft, cidade: e.target.value })} />
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
              {imoveisFiltrados.map((im, i) => (
                <motion.div key={im.codigo || i}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}>
                  <ImovelCard imovel={im} onOpen={() => setSelected(im)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {imoveisFiltrados.length === 0 && !isFetching && (
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
  const tel = String(imovel.proprietarios?.[0]?.telefone || '').replace(/\D/g, '');
  const wa = tel ? `https://wa.me/55${tel}` : null;

  const sections: Array<{ title: string; items: Array<[string, any]> }> = [
    { title: 'Identificação', items: [['Código', imovel.codigo], ['Tipo', imovel.tipo], ['Finalidade', imovel.finalidade], ['Situação', imovel.situacao]] },
    { title: 'Valores', items: [['Valor', fmtMoney(imovel.valor)], ['Condomínio', fmtMoney(imovel.valorcondominio)], ['IPTU', fmtMoney(imovel.valoriptu)]] },
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
          <Button onClick={onImport} disabled={importing}>{importing ? 'Importando…' : 'Importar para o sistema'}</Button>
        </div>
      </div>
    </>
  );
}
