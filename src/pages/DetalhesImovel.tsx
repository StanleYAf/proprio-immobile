import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, BedDouble, Bath, Car, Ruler, MapPin,
  Phone, MessageCircle, Mail, User as UserIcon, ExternalLink,
  ArrowUpRight, Inbox, Sparkles, Calendar, Trash2, Loader2,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { sendToWebhook } from '@/lib/webhook';
import { supabase } from '@/integrations/supabase/client';
import { useImoviewImoveisAlterados } from '@/hooks/useImoviewApi';

type Origem = 'local' | 'imoview';

const STATUS_STYLES: Record<string, string> = {
  ativo: 'bg-success text-success-foreground',
  disponível: 'bg-success text-success-foreground',
  disponivel: 'bg-success text-success-foreground',
  inativo: 'bg-muted text-muted-foreground',
  vendido: 'bg-blue-600 text-white',
  alugado: 'bg-purple-600 text-white',
};

const fmtBRL = (v: any): string => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  if (!n || isNaN(n) || n <= 0) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function extractFotos(raw: any): string[] {
  if (!raw) return [];
  const fotos = raw.fotos;
  if (Array.isArray(fotos)) {
    const arr = fotos.map((f: any) => (typeof f === 'string' ? f : f?.url || f?.URL || f?.Url)).filter(Boolean);
    if (arr.length) return arr;
  }
  if (raw.urlfotoprincipal) return [raw.urlfotoprincipal];
  return [];
}

/** Normaliza um objeto (Imoview OU local) para um shape único. */
function normalize(raw: any, origem: Origem) {
  if (!raw) return null;
  if (origem === 'imoview') {
    return {
      origem: 'imoview' as Origem,
      codigo: raw.codigo ?? null,
      tipo: raw.tipo ?? null,
      finalidade: raw.finalidade ?? null,
      destinacao: raw.destinacao ?? null,
      situacao: raw.situacao ?? 'ativo',
      fotos: extractFotos(raw),
      valor: raw.valor,
      valorcondominio: raw.valorcondominio,
      valoriptu: raw.valoriptu,
      valortotal: raw.valormaiscondominiomaisiptu,
      numeroquartos: raw.numeroquartos,
      numerosuites: raw.numerosuites,
      numerobanhos: raw.numerobanhos,
      numerovagas: raw.numerovagas,
      areaprincipal: raw.areaprincipal,
      areainterna: raw.areainterna,
      arealote: raw.arealote,
      numeroandar: raw.numeroandar,
      endereco: raw.endereco,
      numero: raw.numero,
      complemento: raw.complemento,
      bairro: raw.bairro,
      cidade: raw.cidade,
      estado: raw.estado,
      cep: raw.cep,
      aceitafinanciamento: raw.aceitafinanciamento,
      aceitapermuta: raw.aceitapermuta,
      exclusivo: raw.exclusivo,
      mobiliado: raw.mobiliado,
      descricao: raw.descricao,
      proprietarios: raw.proprietarios ?? [],
      captadores: raw.captadores ?? [],
      comodidades: raw,
      _raw: raw,
    };
  }
  // local (imoveis table)
  return {
    origem: 'local' as Origem,
    codigo: raw.codigo ?? null,
    tipo: raw.tipo ?? null,
    finalidade: raw.finalidade ?? null,
    destinacao: raw.destinacao ?? null,
    situacao: raw.status ?? 'ativo',
    fotos: Array.isArray(raw.fotos) ? raw.fotos.filter(Boolean) : [],
    valor: raw.valor,
    valorcondominio: raw.condominio,
    valoriptu: raw.iptu,
    valortotal: null,
    numeroquartos: raw.quartos,
    numerosuites: raw.suites,
    numerobanhos: raw.banheiros,
    numerovagas: raw.vagas,
    areaprincipal: raw.area_interna,
    areainterna: raw.area_interna,
    arealote: raw.area_lote,
    numeroandar: raw.andar,
    endereco: raw.endereco,
    numero: raw.numero,
    complemento: raw.complemento,
    bairro: raw.bairro,
    cidade: raw.cidade,
    estado: raw.estado,
    cep: raw.cep,
    aceitafinanciamento: raw.financiamento === 'sim' ? true : raw.financiamento === 'nao' ? false : null,
    aceitapermuta: null,
    exclusivo: null,
    mobiliado: null,
    descricao: raw.descricao,
    proprietarios: raw.nome_proprietario ? [{ nome: raw.nome_proprietario, telefone: raw.telefone_proprietario }] : [],
    captadores: raw.corretor_email ? [{ nome: raw.corretor_email, email: raw.corretor_email }] : [],
    comodidades: raw,
    _raw: raw,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

const COMODIDADES: Array<[string, string]> = [
  ['academia', 'Academia'], ['churrasqueira', 'Churrasqueira'], ['piscina', 'Piscina'],
  ['playground', 'Playground'], ['salaofestas', 'Salão de festas'], ['salaojogos', 'Salão de jogos'],
  ['quadraesportiva', 'Quadra esportiva'], ['quadratenis', 'Quadra de tênis'], ['sauna', 'Sauna'],
  ['wifi', 'Wi-Fi'], ['portaria24horas', 'Portaria 24h'], ['interfone', 'Interfone'],
  ['jardim', 'Jardim'], ['varanda', 'Varanda'], ['closet', 'Closet'],
  ['armarioquarto', 'Armário nos quartos'], ['armariocozinha', 'Armário na cozinha'],
  ['circuitotv', 'Circuito de TV'], ['portaoeletronico', 'Portão eletrônico'],
  ['espacogourmet', 'Espaço gourmet'], ['varandagourmet', 'Varanda gourmet'],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-wider text-accent mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function CharIcon({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-background/50 p-2.5">
      <Icon className="w-4 h-4 text-accent shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase text-muted-foreground font-semibold leading-none">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function boolText(v: any): string | null {
  if (v === true || v === 'sim' || v === 'Sim' || v === 1) return 'Sim';
  if (v === false || v === 'nao' || v === 'Não' || v === 0) return 'Não';
  return null;
}

export default function DetalhesImovel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const initialState = (location.state as { imovel?: any; origem?: Origem } | null) ?? null;
  const [photoIdx, setPhotoIdx] = useState(0);

  // Resolve source: state → cache → supabase
  const { data: imovelData, isLoading, error } = useQuery({
    queryKey: ['imovel-detalhe', id, initialState?.origem],
    enabled: !!id,
    queryFn: async () => {
      if (initialState?.imovel) {
        return { raw: initialState.imovel, origem: initialState.origem ?? 'imoview' };
      }
      // Try Supabase local
      const { data, error } = await supabase.from('imoveis').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      if (data) return { raw: data, origem: 'local' as Origem };
      // Fallback: search Imoview list cache by codigo
      const caches = queryClient.getQueriesData({ queryKey: ['imoview', 'imoveis'] });
      for (const [, val] of caches) {
        const lista: any[] = (val as any)?.data?.lista ?? (val as any)?.lista ?? [];
        const found = lista.find((it) => String(it?.codigo) === String(id));
        if (found) return { raw: found, origem: 'imoview' as Origem };
      }
      throw new Error('Imóvel não encontrado.');
    },
  });

  const imovel = useMemo(
    () => (imovelData ? normalize(imovelData.raw, imovelData.origem) : null),
    [imovelData]
  );

  // Atendimentos already in cache (radar tab)
  const atendimentosCache = useMemo(() => {
    const caches = queryClient.getQueriesData({ queryKey: ['imoview', 'atendimentos'] });
    const all: any[] = [];
    for (const [, val] of caches) {
      const lista: any[] = (val as any)?.data?.lista ?? (val as any)?.lista ?? [];
      all.push(...lista);
    }
    return all;
  }, [queryClient, imovel]);

  const radar = useMemo(() => {
    if (!imovel) return [];
    const valor = Number(imovel.valor) || 0;
    const quartos = Number(imovel.numeroquartos) || 0;
    const fin = (imovel.finalidade ?? '').toString().toLowerCase();
    return atendimentosCache.filter((a) => {
      if ((a.situacao ?? '').toString().toLowerCase() === 'descartado') return false;
      if (fin && a.finalidade && String(a.finalidade).toLowerCase() !== fin) return false;
      const p = a.perfil ?? {};
      const vAte = Number(p.valorate) || 0;
      const vDe = Number(p.valorde) || 0;
      if (vAte > 0 && valor > 0 && vAte < valor) return false;
      if (vDe > 0 && valor > 0 && vDe > valor) return false;
      const qMin = Number(p.numeroquarto) || 0;
      if (qMin > 0 && quartos > 0 && qMin > quartos) return false;
      return true;
    });
  }, [imovel, atendimentosCache]);

  // Histórico: só para Imoview
  const { data: alteradosData, isLoading: loadingHist, isError: histError } = useImoviewImoveisAlterados(
    imovel?.origem === 'imoview' ? imovel.codigo : null
  );
  const historico: any[] = useMemo(() => {
    const lista = (alteradosData as any)?.lista ?? (alteradosData as any) ?? [];
    return Array.isArray(lista) ? lista : [];
  }, [alteradosData]);

  useEffect(() => { setPhotoIdx(0); }, [imovel?.codigo]);

  if (isLoading) {
    return (
      <AppLayout title="Carregando...">
        <p className="text-sm text-muted-foreground">Carregando imóvel...</p>
      </AppLayout>
    );
  }

  if (error || !imovel) {
    return (
      <AppLayout title="Imóvel não encontrado">
        <p className="text-sm text-muted-foreground">Este imóvel não existe ou foi removido.</p>
        <Button onClick={() => navigate('/imoveis')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
        </Button>
      </AppLayout>
    );
  }

  const fotos = imovel.fotos ?? [];
  const statusKey = (imovel.situacao ?? 'ativo').toString().toLowerCase();
  const statusClass = STATUS_STYLES[statusKey] ?? 'bg-muted text-muted-foreground';

  const titulo = [imovel.tipo, imovel.bairro].filter(Boolean).join(' · ') +
    (imovel.cidade || imovel.estado ? ` — ${[imovel.cidade, imovel.estado].filter(Boolean).join('/')}` : '');

  const enderecoLinha1 = [imovel.endereco, imovel.numero, imovel.complemento].filter(Boolean).join(', ');
  const enderecoLinha2 = [
    imovel.bairro,
    [imovel.cidade, imovel.estado].filter(Boolean).join('/'),
    imovel.cep ? `CEP ${imovel.cep}` : null,
  ].filter(Boolean).join(' · ');

  const prop = imovel.proprietarios?.[0];
  const cap = imovel.captadores?.[0];
  const telProp = String(prop?.telefone ?? '').replace(/\D/g, '');
  const waNumber = telProp.length >= 10 ? `55${telProp}` : telProp;

  const comodidadesAtivas = COMODIDADES.filter(([k]) => imovel.comodidades?.[k] === true || imovel.comodidades?.[k] === 'sim');

  return (
    <AppLayout title={`Imóvel #${imovel.codigo ?? '—'}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
        </Button>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className={imovel.origem === 'imoview' ? 'bg-blue-600 text-white border-none' : 'bg-muted text-muted-foreground border-none'}>
            {imovel.origem === 'imoview' ? (<><ExternalLink className="w-3 h-3 mr-1" /> Imoview</>) : 'Local'}
          </Badge>
          <Badge className={`${statusClass} border-none capitalize`}>{statusKey}</Badge>
        </div>
      </div>

      {/* Título */}
      <div className="mb-4">
        <p className="text-[11px] font-mono text-muted-foreground tracking-wide">#{imovel.codigo ?? '—'}</p>
        <h1 className="text-lg md:text-xl font-bold text-foreground leading-tight">{titulo || '—'}</h1>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-4">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="radar">Clientes no Radar</TabsTrigger>
          <TabsTrigger value="hist">Histórico</TabsTrigger>
        </TabsList>

        {/* ─── INFORMAÇÕES ─── */}
        <TabsContent value="info" className="space-y-3">
          {/* Galeria */}
          {fotos.length > 0 ? (
            <div className="space-y-2">
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-muted border border-border">
                <img src={fotos[photoIdx]} alt={`Foto ${photoIdx + 1}`} className="w-full h-full object-cover" />
              </div>
              {fotos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {fotos.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPhotoIdx(i)}
                      className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === photoIdx ? 'border-accent' : 'border-transparent opacity-70'
                      }`}
                    >
                      <img src={src} alt={`Mini ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-video rounded-2xl bg-muted flex items-center justify-center border border-border">
              <Building2 className="w-10 h-10 text-muted-foreground/50" />
            </div>
          )}

          {/* Valores */}
          <Section title="Valores">
            <p className="text-3xl font-bold text-accent">{fmtBRL(imovel.valor)}</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {Number(imovel.valorcondominio) > 0 && <Info label="Condomínio" value={fmtBRL(imovel.valorcondominio)} />}
              {Number(imovel.valoriptu) > 0 && <Info label="IPTU" value={fmtBRL(imovel.valoriptu)} />}
              {Number(imovel.valortotal) > 0 && <Info label="Total" value={fmtBRL(imovel.valortotal)} />}
            </div>
          </Section>

          {/* Características */}
          <Section title="Características">
            <div className="grid grid-cols-2 gap-2">
              {Number(imovel.numeroquartos) > 0 && <CharIcon icon={BedDouble} label="Quartos" value={imovel.numeroquartos} />}
              {Number(imovel.numerosuites) > 0 && <CharIcon icon={BedDouble} label="Suítes" value={imovel.numerosuites} />}
              {Number(imovel.numerobanhos) > 0 && <CharIcon icon={Bath} label="Banheiros" value={imovel.numerobanhos} />}
              {Number(imovel.numerovagas) > 0 && <CharIcon icon={Car} label="Vagas" value={imovel.numerovagas} />}
              {Number(imovel.areaprincipal) > 0 && <CharIcon icon={Ruler} label="Área principal" value={`${imovel.areaprincipal} m²`} />}
              {Number(imovel.areainterna) > 0 && Number(imovel.areainterna) !== Number(imovel.areaprincipal) &&
                <CharIcon icon={Ruler} label="Área interna" value={`${imovel.areainterna} m²`} />}
              {Number(imovel.arealote) > 0 && <CharIcon icon={Ruler} label="Área do lote" value={`${imovel.arealote} m²`} />}
              {Number(imovel.numeroandar) > 0 && <CharIcon icon={Building2} label="Andar" value={imovel.numeroandar} />}
            </div>
          </Section>

          {/* Endereço */}
          <Section title="Endereço">
            <div className="text-sm text-foreground space-y-1">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>{enderecoLinha1 || '—'}</span>
              </p>
              {enderecoLinha2 && <p className="text-muted-foreground text-xs pl-6">{enderecoLinha2}</p>}
            </div>
          </Section>

          {/* Detalhes */}
          <Section title="Detalhes">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Finalidade" value={imovel.finalidade} />
              <Info label="Tipo" value={imovel.tipo} />
              <Info label="Destinação" value={Array.isArray(imovel.destinacao) ? imovel.destinacao.join(', ') : imovel.destinacao} />
              <Info label="Financiamento" value={boolText(imovel.aceitafinanciamento)} />
              <Info label="Permuta" value={boolText(imovel.aceitapermuta)} />
              <Info label="Exclusivo" value={boolText(imovel.exclusivo)} />
              <Info label="Mobiliado" value={boolText(imovel.mobiliado)} />
            </div>
          </Section>

          {/* Comodidades */}
          {comodidadesAtivas.length > 0 && (
            <Section title="Comodidades">
              <div className="flex flex-wrap gap-1.5">
                {comodidadesAtivas.map(([k, label]) => (
                  <Badge key={k} variant="secondary" className="gap-1">
                    <Sparkles className="w-3 h-3" /> {label}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {/* Descrição */}
          {imovel.descricao && (
            <Section title="Descrição">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{imovel.descricao}</p>
            </Section>
          )}

          {/* Proprietário */}
          {prop?.nome && (
            <Section title="Proprietário">
              <Info label="Nome" value={prop.nome} />
              {prop.email && (
                <p className="mt-2 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" /> {prop.email}
                </p>
              )}
              {prop.telefone && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button asChild size="sm" variant="outline">
                    <a href={`tel:${telProp}`}><Phone className="w-3.5 h-3.5 mr-1.5" /> {prop.telefone}</a>
                  </Button>
                  <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                    <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> WhatsApp
                    </a>
                  </Button>
                </div>
              )}
            </Section>
          )}

          {/* Captador */}
          {cap?.nome && (
            <Section title="Captador">
              <div className="space-y-1.5 text-sm">
                <p className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-muted-foreground" /> {cap.nome}</p>
                {cap.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> {cap.email}</p>}
                {cap.creci && <p className="text-xs text-muted-foreground pl-6">CRECI: {cap.creci}</p>}
              </div>
            </Section>
          )}
        </TabsContent>

        {/* ─── RADAR ─── */}
        <TabsContent value="radar" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Atendimentos cujo perfil de busca é compatível com este imóvel.
          </p>
          {radar.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <Inbox className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum cliente no radar para este imóvel.</p>
            </div>
          ) : (
            radar.map((a, i) => (
              <motion.div
                key={a.codigo ?? i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{a.lead?.nome ?? 'Lead sem nome'}</p>
                    {a.lead?.telefone1 && (
                      <a href={`tel:${String(a.lead.telefone1).replace(/\D/g, '')}`}
                         className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-accent">
                        <Phone className="w-3 h-3" /> {a.lead.telefone1}
                      </a>
                    )}
                  </div>
                  {a.situacao && <Badge variant="secondary" className="capitalize">{a.situacao}</Badge>}
                </div>
                {a.corretor && <p className="text-xs text-muted-foreground">Corretor: {a.corretor}</p>}
                <Button size="sm" variant="outline" className="w-full"
                  onClick={() => navigate(`/atendimentos/${a.codigo}`, { state: { atendimento: a } })}>
                  Abrir Atendimento <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* ─── HISTÓRICO ─── */}
        <TabsContent value="hist" className="space-y-3">
          {imovel.origem !== 'imoview' ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">Histórico disponível apenas para imóveis do Imoview.</p>
            </div>
          ) : loadingHist ? (
            <p className="text-sm text-muted-foreground">Carregando histórico...</p>
          ) : histError || historico.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhum histórico disponível.</p>
            </div>
          ) : (
            <div className="relative pl-5 border-l-2 border-border space-y-4">
              {historico.map((h, i) => {
                const when = h.datahoraalteracao ?? h.dataHoraAlteracao ?? h.dataalteracao ?? h.data ?? null;
                const label = h.descricao ?? h.tipoalteracao ?? h.acao ?? h.campo ?? 'Alteração';
                const user = h.usuario ?? h.nomeusuario ?? h.responsavel ?? null;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="relative"
                  >
                    <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-accent border-2 border-background" />
                    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> {fmtDate(when)}
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{label}</p>
                      {user && <p className="text-xs text-muted-foreground mt-0.5">por {user}</p>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
