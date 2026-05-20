import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ImageOff, Pencil, BedDouble, Bath, Car, Ruler, Building2,
  MapPin, Phone, MessageCircle, User as UserIcon, ArrowUpRight,
  Calendar, ParkingCircle, Sparkles, Inbox,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, string> = {
  ativo: 'bg-success text-success-foreground',
  inativo: 'bg-muted text-muted-foreground',
  vendido: 'bg-blue-600 text-white',
  alugado: 'bg-purple-600 text-white',
};

const fmtBRL = (v: number | null | undefined) =>
  typeof v === 'number'
    ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';

const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-wider text-accent mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value ?? '—'}</p>
    </div>
  );
}

function CharIcon({ icon: Icon, label, value }: { icon: typeof BedDouble; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-background/50 p-2.5">
      <Icon className="w-4 h-4 text-accent shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase text-muted-foreground font-semibold leading-none">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function DetalhesImovel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [photoIdx, setPhotoIdx] = useState(0);

  const { data: imovel, isLoading, error } = useQuery({
    queryKey: ['imovel', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('imoveis').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: clientesRadar = [] } = useQuery({
    queryKey: ['imovel-radar', id, imovel?.id],
    enabled: !!imovel,
    queryFn: async () => {
      const { data: atendimentos, error } = await supabase
        .from('atendimentos')
        .select('id, codigo, etapa, status, corretor_email, finalidade_interesse, tipo_interesse, valor_min, valor_max, quartos_min, bairros_interesse, cliente_id');
      if (error) throw error;
      const list = (atendimentos ?? []).filter((a) => {
        if (a.finalidade_interesse && imovel!.finalidade && a.finalidade_interesse !== imovel!.finalidade) return false;
        if (Array.isArray(a.tipo_interesse) && a.tipo_interesse.length > 0 && imovel!.tipo && !a.tipo_interesse.includes(imovel!.tipo)) return false;
        if (a.valor_max != null && imovel!.valor != null && a.valor_max < imovel!.valor) return false;
        if (a.valor_min != null && imovel!.valor != null && a.valor_min > imovel!.valor) return false;
        if (a.quartos_min != null && imovel!.quartos != null && a.quartos_min > imovel!.quartos) return false;
        if (Array.isArray(a.bairros_interesse) && a.bairros_interesse.length > 0 && imovel!.bairro && !a.bairros_interesse.includes(imovel!.bairro)) return false;
        return true;
      });
      const clienteIds = Array.from(new Set(list.map((a) => a.cliente_id).filter(Boolean))) as string[];
      const clientesMap = new Map<string, { nome: string; telefone: string | null }>();
      if (clienteIds.length) {
        const { data: cls } = await supabase.from('clientes').select('id, nome, telefone').in('id', clienteIds);
        (cls ?? []).forEach((c) => clientesMap.set(c.id, { nome: c.nome, telefone: c.telefone }));
      }
      return list.map((a) => ({ ...a, cliente: a.cliente_id ? clientesMap.get(a.cliente_id) : null }));
    },
  });

  const { data: historico = [] } = useQuery({
    queryKey: ['imovel-historico', id, imovel?.codigo],
    enabled: !!imovel,
    queryFn: async () => {
      const filters: string[] = [];
      if (imovel!.codigo) filters.push(`dados->>codigo.eq.${imovel!.codigo}`);
      filters.push(`dados->>id.eq.${imovel!.id}`);
      filters.push(`dados->>imovel_id.eq.${imovel!.id}`);
      const { data, error } = await supabase
        .from('sent_records')
        .select('*')
        .or(filters.join(','))
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const canEdit = useMemo(() => {
    if (!imovel || !user) return false;
    return user.isAdmin || user.classificacao === 'master' || imovel.corretor_email === user.email;
  }, [imovel, user]);

  if (isLoading) {
    return <AppLayout title="Carregando..."><p className="text-sm text-muted-foreground">Carregando imóvel...</p></AppLayout>;
  }
  if (error || !imovel) {
    return (
      <AppLayout title="Imóvel não encontrado">
        <p className="text-sm text-muted-foreground">Este imóvel não existe ou foi removido.</p>
        <Button onClick={() => navigate('/imoveis')} className="mt-4">Voltar à lista</Button>
      </AppLayout>
    );
  }

  const fotos = (imovel.fotos ?? []) as string[];
  const statusKey = (imovel.status ?? 'ativo').toLowerCase();
  const statusClass = STATUS_STYLES[statusKey] ?? 'bg-muted text-muted-foreground';
  const enderecoCompleto = [
    [imovel.endereco, imovel.numero].filter(Boolean).join(', '),
    imovel.complemento,
    imovel.bairro,
    [imovel.cidade, imovel.estado].filter(Boolean).join('/'),
    imovel.cep ? `CEP ${imovel.cep}` : null,
  ].filter(Boolean).join(' · ');

  const telDigits = (imovel.telefone_proprietario ?? '').replace(/\D/g, '');
  const waNumber = telDigits.length >= 10 ? `55${telDigits}` : telDigits;

  return (
    <AppLayout title={imovel.codigo ?? 'Detalhes'}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <Badge className={`${statusClass} border-none capitalize`}>{statusKey}</Badge>
        {canEdit && (
          <Button
            size="sm" variant="outline"
            onClick={() => toast.info('Em breve: edição de imóvel.')}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
          </Button>
        )}
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-4">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="radar">Clientes no Radar</TabsTrigger>
          <TabsTrigger value="hist">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-3">
          {/* Gallery */}
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
                      className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === photoIdx ? 'border-accent' : 'border-transparent opacity-70'}`}
                    >
                      <img src={src} alt={`Mini ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full aspect-video rounded-2xl bg-muted flex items-center justify-center border border-border">
              <ImageOff className="w-10 h-10 text-muted-foreground/50" />
            </div>
          )}

          <Section title="Identificação">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Código" value={imovel.codigo} />
              <Info label="Tipo" value={imovel.tipo} />
              <Info label="Finalidade" value={imovel.finalidade} />
              <Info label="Destinação" value={Array.isArray(imovel.destinacao) ? imovel.destinacao.join(', ') : '—'} />
              <Info label="Status" value={<Badge className={`${statusClass} border-none capitalize`}>{statusKey}</Badge>} />
            </div>
          </Section>

          <Section title="Endereço">
            <p className="text-sm text-foreground flex items-start gap-2">
              <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>{enderecoCompleto || '—'}</span>
            </p>
          </Section>

          <Section title="Valores">
            <p className="text-2xl font-bold text-accent">{fmtBRL(imovel.valor)}</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {imovel.condominio != null && <Info label="Condomínio" value={fmtBRL(imovel.condominio)} />}
              {imovel.iptu != null && <Info label="IPTU" value={fmtBRL(imovel.iptu)} />}
            </div>
          </Section>

          <Section title="Características">
            <div className="grid grid-cols-2 gap-2">
              <CharIcon icon={BedDouble} label="Quartos" value={imovel.quartos} />
              <CharIcon icon={BedDouble} label="Suítes" value={imovel.suites} />
              <CharIcon icon={Bath} label="Banheiros" value={imovel.banheiros} />
              <CharIcon icon={Car} label="Vagas" value={imovel.vagas} />
              <CharIcon icon={ParkingCircle} label="Tipo de vaga" value={imovel.tipo_vaga} />
              <CharIcon icon={Building2} label="Andar" value={imovel.andar} />
              <CharIcon icon={Ruler} label="Área interna" value={imovel.area_interna ? `${imovel.area_interna} m²` : null} />
              <CharIcon icon={Ruler} label="Área externa" value={imovel.area_externa ? `${imovel.area_externa} m²` : null} />
              <CharIcon icon={Ruler} label="Área do lote" value={imovel.area_lote ? `${imovel.area_lote} m²` : null} />
            </div>
          </Section>

          {Array.isArray(imovel.lazer) && imovel.lazer.length > 0 && (
            <Section title="Lazer e Diferenciais">
              <div className="flex flex-wrap gap-1.5">
                {imovel.lazer.map((item: string) => (
                  <Badge key={item} variant="secondary" className="gap-1">
                    <Sparkles className="w-3 h-3" /> {item}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {imovel.financiamento && (
            <Section title="Financiamento">
              <p className="text-sm capitalize">{imovel.financiamento === 'sim' ? 'Aceita financiamento' : imovel.financiamento === 'nao' ? 'Não aceita financiamento' : imovel.financiamento}</p>
            </Section>
          )}

          {imovel.descricao && (
            <Section title="Descrição">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{imovel.descricao}</p>
            </Section>
          )}

          <Section title="Proprietário">
            <Info label="Nome" value={imovel.nome_proprietario} />
            {imovel.telefone_proprietario && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Button asChild size="sm" variant="outline">
                  <a href={`tel:${telDigits}`}><Phone className="w-3.5 h-3.5 mr-1.5" /> {imovel.telefone_proprietario}</a>
                </Button>
                <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> WhatsApp
                  </a>
                </Button>
              </div>
            )}
          </Section>

          <Section title="Registro">
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-muted-foreground" /> Corretor: <span className="font-medium">{imovel.corretor_email ?? '—'}</span></p>
              <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> Cadastrado em: <span className="font-medium">{fmtDate(imovel.created_at)}</span></p>
              <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> Atualizado em: <span className="font-medium">{fmtDate(imovel.updated_at)}</span></p>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="radar" className="space-y-3">
          <p className="text-sm text-muted-foreground">Clientes cujo perfil de busca é compatível com este imóvel.</p>
          {clientesRadar.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <Inbox className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum cliente no radar para este imóvel no momento.</p>
            </div>
          ) : (
            clientesRadar.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{a.cliente?.nome ?? 'Cliente sem nome'}</p>
                    {a.cliente?.telefone && (
                      <a href={`tel:${a.cliente.telefone.replace(/\D/g, '')}`} className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-accent">
                        <Phone className="w-3 h-3" /> {a.cliente.telefone}
                      </a>
                    )}
                  </div>
                  {a.etapa && <Badge variant="secondary" className="capitalize">{a.etapa}</Badge>}
                </div>
                {a.corretor_email && <p className="text-xs text-muted-foreground">Corretor: {a.corretor_email}</p>}
                <Button size="sm" variant="outline" className="w-full" onClick={() => navigate(`/atendimentos/${a.id}`)}>
                  Abrir Atendimento <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </motion.div>
            ))
          )}
        </TabsContent>

        <TabsContent value="hist" className="space-y-3">
          {historico.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhum histórico encontrado.</p>
            </div>
          ) : (
            <div className="relative pl-5 border-l-2 border-border space-y-4">
              {historico.map((h, i) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative"
                >
                  <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-accent border-2 border-background" />
                  <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                    <p className="text-xs text-muted-foreground">{fmtDate(h.created_at)}</p>
                    <p className="text-sm font-semibold text-foreground capitalize mt-0.5">
                      {h.tipo} · {h.acao}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">por {h.usuario_email}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
