import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, Check, X, StickyNote, Phone, Home as HomeIcon, Mail, MessageCircle,
  Plus, Trash2, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const TIPO_OPTIONS = ['Apartamento', 'Casa', 'Sala Comercial', 'Terreno', 'Galpão', 'Loja', 'Flat', 'Cobertura'];
const ORIGEM_OPTIONS = ['Portal imobiliário', 'Indicação', 'Ligação ativa', 'Instagram/Facebook', 'Site próprio', 'WhatsApp', 'Outro'];
const ESTADO_CIVIL = ['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'União estável'];
const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'visita_agendada', label: 'Visita agendada' },
  { value: 'proposta_enviada', label: 'Proposta enviada' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'perdido', label: 'Perdido' },
];
const ETAPAS = [
  { value: 'contato', label: 'Contato' },
  { value: 'qualificacao', label: 'Qualificação' },
  { value: 'visita', label: 'Visita' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'fechamento', label: 'Fechamento' },
];
const HISTORICO_TIPOS = [
  { value: 'nota', label: 'Nota', icon: StickyNote, color: 'bg-slate-500' },
  { value: 'ligacao', label: 'Ligação', icon: Phone, color: 'bg-blue-500' },
  { value: 'visita', label: 'Visita', icon: HomeIcon, color: 'bg-amber-500' },
  { value: 'email', label: 'E-mail', icon: Mail, color: 'bg-purple-500' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-emerald-500' },
];
const ATEND_IMOVEL_STATUS = ['sugerido', 'visitado', 'descartado', 'favorito'];

const maskTel = (v: string) => {
  const d = (v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 0) return `(${d}`;
  return '';
};
const maskCpf = (v: string) => {
  const d = (v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
};
const maskBRL = (v: string) => {
  const d = (v || '').replace(/\D/g, '');
  if (!d) return '';
  return (parseInt(d, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const parseBRL = (v: string) => {
  if (!v) return null;
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
};
const fmtBRL = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function DetalhesAtendimento() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['atendimento', id],
    queryFn: async () => {
      const { data: at, error } = await supabase.from('atendimentos').select('*').eq('id', id!).single();
      if (error) throw error;
      let cliente: any = null;
      if (at.cliente_id) {
        const r = await supabase.from('clientes').select('*').eq('id', at.cliente_id).single();
        cliente = r.data;
      }
      let imovelOrigem: any = null;
      if (at.imovel_origem_id) {
        const r = await supabase.from('imoveis').select('id,codigo,tipo,bairro').eq('id', at.imovel_origem_id).single();
        imovelOrigem = r.data;
      }
      return { at, cliente, imovelOrigem };
    },
    enabled: !!id,
  });

  if (isLoading || !data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-serif text-2xl md:text-3xl">Atendimento {data.at.codigo || ''}</h1>
            <p className="text-sm text-muted-foreground">Criado em {fmtDate(data.at.created_at)}</p>
          </div>
        </div>

        <Tabs defaultValue="perfil" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="perfil">Perfil do Cliente</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="progresso">Progresso</TabsTrigger>
            <TabsTrigger value="imoveis">Imóveis Encontrados</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <PerfilTab atendimento={data.at} cliente={data.cliente} imovelOrigem={data.imovelOrigem} onSaved={() => qc.invalidateQueries({ queryKey: ['atendimento', id] })} />
          </TabsContent>
          <TabsContent value="historico">
            <HistoricoTab atendimentoId={id!} corretorEmail={user?.email || ''} />
          </TabsContent>
          <TabsContent value="progresso">
            <ProgressoTab atendimento={data.at} onChanged={() => qc.invalidateQueries({ queryKey: ['atendimento', id] })} />
          </TabsContent>
          <TabsContent value="imoveis">
            <ImoveisTab atendimento={data.at} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

/* -------------------- Perfil -------------------- */
function PerfilTab({ atendimento, cliente, imovelOrigem, onSaved }: any) {
  const [c, setC] = useState({
    nome: cliente?.nome || '',
    telefone: maskTel(cliente?.telefone || ''),
    email: cliente?.email || '',
    cpf: maskCpf(cliente?.cpf || ''),
    profissao: cliente?.profissao || '',
    renda: cliente?.renda != null ? maskBRL(String(Math.round(cliente.renda * 100))) : '',
    estado_civil: cliente?.estado_civil || '',
    origem: cliente?.origem || '',
    observacoes: cliente?.observacoes || '',
  });
  const [interesse, setInteresse] = useState({
    finalidade_interesse: atendimento.finalidade_interesse || '',
    tipo_interesse: atendimento.tipo_interesse || [],
    bairros_interesse: atendimento.bairros_interesse || [],
    cidade_interesse: atendimento.cidade_interesse || '',
    valor_min: atendimento.valor_min != null ? maskBRL(String(Math.round(atendimento.valor_min * 100))) : '',
    valor_max: atendimento.valor_max != null ? maskBRL(String(Math.round(atendimento.valor_max * 100))) : '',
    quartos_min: atendimento.quartos_min ?? '',
    vagas_min: atendimento.vagas_min ?? '',
    area_min: atendimento.area_min ?? '',
  });
  const [bairroInput, setBairroInput] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleTipo = (t: string) =>
    setInteresse((p: any) => ({ ...p, tipo_interesse: p.tipo_interesse.includes(t) ? p.tipo_interesse.filter((x: string) => x !== t) : [...p.tipo_interesse, t] }));
  const addBairro = () => {
    const v = bairroInput.trim();
    if (!v) return;
    if (!interesse.bairros_interesse.includes(v)) setInteresse((p: any) => ({ ...p, bairros_interesse: [...p.bairros_interesse, v] }));
    setBairroInput('');
  };
  const removeBairro = (b: string) => setInteresse((p: any) => ({ ...p, bairros_interesse: p.bairros_interesse.filter((x: string) => x !== b) }));

  const salvar = async () => {
    setSaving(true);
    try {
      if (cliente?.id) {
        const { error } = await supabase.from('clientes').update({
          nome: c.nome,
          telefone: c.telefone.replace(/\D/g, ''),
          email: c.email || null,
          cpf: c.cpf.replace(/\D/g, '') || null,
          profissao: c.profissao || null,
          renda: parseBRL(c.renda),
          estado_civil: c.estado_civil || null,
          origem: c.origem || null,
          observacoes: c.observacoes || null,
        }).eq('id', cliente.id);
        if (error) throw error;
      }
      const { error: e2 } = await supabase.from('atendimentos').update({
        finalidade_interesse: interesse.finalidade_interesse || null,
        tipo_interesse: interesse.tipo_interesse,
        bairros_interesse: interesse.bairros_interesse,
        cidade_interesse: interesse.cidade_interesse || null,
        valor_min: parseBRL(interesse.valor_min),
        valor_max: parseBRL(interesse.valor_max),
        quartos_min: interesse.quartos_min ? Number(interesse.quartos_min) : null,
        vagas_min: interesse.vagas_min ? Number(interesse.vagas_min) : null,
        area_min: interesse.area_min ? Number(interesse.area_min) : null,
      }).eq('id', atendimento.id);
      if (e2) throw e2;
      toast.success('Alterações salvas.');
      onSaved();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {imovelOrigem && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 text-sm">
            Lead originado do imóvel <span className="font-semibold">{imovelOrigem.codigo}</span> — {imovelOrigem.tipo} em {imovelOrigem.bairro}
            <Button variant="link" size="sm" className="ml-2" onClick={() => window.open(`/imoveis/${imovelOrigem.id}`, '_blank')}>
              <ExternalLink className="mr-1 h-3 w-3" /> Abrir
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Dados do Cliente</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><Label>Nome completo</Label><Input value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} /></div>
          <div><Label>Telefone</Label><Input value={c.telefone} onChange={(e) => setC({ ...c, telefone: maskTel(e.target.value) })} /></div>
          <div><Label>E-mail</Label><Input type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /></div>
          <div><Label>CPF</Label><Input value={c.cpf} onChange={(e) => setC({ ...c, cpf: maskCpf(e.target.value) })} /></div>
          <div><Label>Profissão</Label><Input value={c.profissao} onChange={(e) => setC({ ...c, profissao: e.target.value })} /></div>
          <div><Label>Renda mensal (R$)</Label><Input value={c.renda} onChange={(e) => setC({ ...c, renda: maskBRL(e.target.value) })} /></div>
          <div>
            <Label>Estado civil</Label>
            <Select value={c.estado_civil} onValueChange={(v) => setC({ ...c, estado_civil: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="z-[9999]">{ESTADO_CIVIL.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Origem do lead</Label>
            <Select value={c.origem} onValueChange={(v) => setC({ ...c, origem: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="z-[9999]">{ORIGEM_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Observações</Label><Textarea rows={3} value={c.observacoes} onChange={(e) => setC({ ...c, observacoes: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Perfil de Interesse</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label>Finalidade</Label>
            <Select value={interesse.finalidade_interesse} onValueChange={(v) => setInteresse({ ...interesse, finalidade_interesse: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="z-[9999]">
                <SelectItem value="Compra">Compra</SelectItem>
                <SelectItem value="Aluguel">Aluguel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Cidade</Label><Input value={interesse.cidade_interesse} onChange={(e) => setInteresse({ ...interesse, cidade_interesse: e.target.value })} /></div>

          <div className="md:col-span-2">
            <Label>Tipos de imóvel</Label>
            <div className="flex flex-wrap gap-2 pt-2">
              {TIPO_OPTIONS.map((t) => (
                <Badge key={t} variant={interesse.tipo_interesse.includes(t) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleTipo(t)}>
                  {t}{interesse.tipo_interesse.includes(t) && <Check className="ml-1 h-3 w-3" />}
                </Badge>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <Label>Bairros de interesse</Label>
            <div className="flex gap-2">
              <Input value={bairroInput} onChange={(e) => setBairroInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBairro(); } }} placeholder="Digite e Enter" />
              <Button type="button" variant="outline" onClick={addBairro}>Adicionar</Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {interesse.bairros_interesse.map((b: string) => (
                <Badge key={b} variant="secondary" className="gap-1">{b}<X className="h-3 w-3 cursor-pointer" onClick={() => removeBairro(b)} /></Badge>
              ))}
            </div>
          </div>

          <div><Label>Valor mínimo (R$)</Label><Input value={interesse.valor_min} onChange={(e) => setInteresse({ ...interesse, valor_min: maskBRL(e.target.value) })} /></div>
          <div><Label>Valor máximo (R$)</Label><Input value={interesse.valor_max} onChange={(e) => setInteresse({ ...interesse, valor_max: maskBRL(e.target.value) })} /></div>
          <div><Label>Quartos mínimo</Label><Input type="number" value={interesse.quartos_min} onChange={(e) => setInteresse({ ...interesse, quartos_min: e.target.value })} /></div>
          <div><Label>Vagas mínimo</Label><Input type="number" value={interesse.vagas_min} onChange={(e) => setInteresse({ ...interesse, vagas_min: e.target.value })} /></div>
          <div><Label>Área mínima (m²)</Label><Input type="number" value={interesse.area_min} onChange={(e) => setInteresse({ ...interesse, area_min: e.target.value })} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={salvar} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar alterações</Button>
      </div>
    </motion.div>
  );
}

/* -------------------- Histórico -------------------- */
function HistoricoTab({ atendimentoId, corretorEmail }: { atendimentoId: string; corretorEmail: string }) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState('nota');
  const [conteudo, setConteudo] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: historico = [] } = useQuery({
    queryKey: ['historico', atendimentoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('atendimento_historico').select('*').eq('atendimento_id', atendimentoId).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const registrar = async () => {
    if (!conteudo.trim()) { toast.error('Conteúdo obrigatório.'); return; }
    setSaving(true);
    const { error } = await supabase.from('atendimento_historico').insert({
      atendimento_id: atendimentoId, tipo, conteudo: conteudo.trim(), corretor_email: corretorEmail,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setConteudo('');
    toast.success('Interação registrada.');
    qc.invalidateQueries({ queryKey: ['historico', atendimentoId] });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Nova interação</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[200px_1fr]">
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[9999]">
                {HISTORICO_TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea rows={3} placeholder="Descreva a interação..." value={conteudo} onChange={(e) => setConteudo(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={registrar} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar</Button>
          </div>
        </CardContent>
      </Card>

      {historico.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma interação registrada ainda.</p>
      ) : (
        <div className="space-y-3">
          {historico.map((h: any, i: number) => {
            const t = HISTORICO_TIPOS.find((x) => x.value === h.tipo) || HISTORICO_TIPOS[0];
            const Icon = t.icon;
            return (
              <motion.div key={h.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card>
                  <CardContent className="flex gap-3 p-4">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white', t.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{t.label}</span>
                        <span className="text-xs text-muted-foreground">{fmtDate(h.created_at)}</span>
                      </div>
                      {h.corretor_email && <p className="text-xs text-muted-foreground">{h.corretor_email}</p>}
                      <p className="mt-2 whitespace-pre-wrap text-sm">{h.conteudo}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------- Progresso -------------------- */
function ProgressoTab({ atendimento, onChanged }: any) {
  const [etapa, setEtapa] = useState(atendimento.etapa || 'contato');
  const [status, setStatus] = useState(atendimento.status || 'novo');
  const [lossOpen, setLossOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [dataVisita, setDataVisita] = useState('');
  const [valorProposta, setValorProposta] = useState('');
  const [dataFechamento, setDataFechamento] = useState('');
  const [valorFinal, setValorFinal] = useState('');
  const [tipoNeg, setTipoNeg] = useState('');

  const idx = ETAPAS.findIndex((e) => e.value === etapa);

  const changeEtapa = async (v: string) => {
    setEtapa(v);
    const { error } = await supabase.from('atendimentos').update({ etapa: v }).eq('id', atendimento.id);
    if (error) toast.error(error.message); else { toast.success('Etapa atualizada.'); onChanged(); }
  };
  const changeStatus = async (v: string) => {
    setStatus(v);
    const { error } = await supabase.from('atendimentos').update({ status: v }).eq('id', atendimento.id);
    if (error) toast.error(error.message); else toast.success('Status atualizado.');
  };
  const marcarPerdido = async () => {
    const { error } = await supabase.from('atendimentos').update({ status: 'perdido', notas: motivo || null }).eq('id', atendimento.id);
    if (error) { toast.error(error.message); return; }
    setStatus('perdido'); setLossOpen(false); toast.success('Marcado como perdido.'); onChanged();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {ETAPAS.map((e, i) => {
              const done = i < idx, current = i === idx;
              return (
                <div key={e.value} className="flex items-center gap-2">
                  <button
                    onClick={() => changeEtapa(e.value)}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors',
                      current && 'border-primary bg-primary text-primary-foreground',
                      done && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                      !current && !done && 'border-border text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {(done || current) && <Check className="h-3 w-3" />}
                    {e.label}
                  </button>
                  {i < ETAPAS.length - 1 && <span className="text-muted-foreground">→</span>}
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {etapa === 'visita' && (
              <div><Label>Data e hora da visita</Label><Input type="datetime-local" value={dataVisita} onChange={(e) => setDataVisita(e.target.value)} /></div>
            )}
            {etapa === 'negociacao' && (
              <div><Label>Valor da proposta (R$)</Label><Input value={valorProposta} onChange={(e) => setValorProposta(maskBRL(e.target.value))} /></div>
            )}
            {etapa === 'fechamento' && (
              <>
                <div><Label>Data do fechamento</Label><Input type="date" value={dataFechamento} onChange={(e) => setDataFechamento(e.target.value)} /></div>
                <div><Label>Valor final (R$)</Label><Input value={valorFinal} onChange={(e) => setValorFinal(maskBRL(e.target.value))} /></div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={tipoNeg} onValueChange={setTipoNeg}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="Venda">Venda</SelectItem>
                      <SelectItem value="Aluguel">Aluguel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Status do atendimento</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={changeStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[9999]">
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={lossOpen} onOpenChange={setLossOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10">Marcar como Perdido</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Motivo da perda</DialogTitle></DialogHeader>
              <Textarea rows={4} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por que esse atendimento foi perdido?" />
              <DialogFooter>
                <Button variant="ghost" onClick={() => setLossOpen(false)}>Cancelar</Button>
                <Button variant="destructive" onClick={marcarPerdido}>Confirmar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- Imóveis -------------------- */
function ImoveisTab({ atendimento }: any) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: imoveis = [] } = useQuery({
    queryKey: ['imoveis-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('imoveis').select('*').eq('status', 'ativo');
      if (error) throw error;
      return data;
    },
  });

  const { data: vinculados = [] } = useQuery({
    queryKey: ['atendimento-imoveis', atendimento.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('atendimento_imoveis').select('*').eq('atendimento_id', atendimento.id);
      if (error) throw error;
      const ids = (data || []).map((v: any) => v.imovel_id).filter(Boolean);
      let imv: any[] = [];
      if (ids.length) {
        const r = await supabase.from('imoveis').select('id,codigo,tipo,bairro,fotos').in('id', ids);
        imv = r.data || [];
      }
      return (data || []).map((v: any) => ({ ...v, imovel: imv.find((i) => i.id === v.imovel_id) }));
    },
  });

  const vinculadosIds = useMemo(() => new Set(vinculados.map((v: any) => v.imovel_id)), [vinculados]);

  const compativeis = useMemo(() => {
    return (imoveis || []).filter((im: any) => {
      const a = atendimento;
      if (a.finalidade_interesse && im.finalidade && !String(im.finalidade).includes(a.finalidade_interesse)) return false;
      if (a.tipo_interesse?.length && im.tipo && !a.tipo_interesse.includes(im.tipo)) return false;
      if (a.valor_max != null && im.valor != null && Number(im.valor) > Number(a.valor_max)) return false;
      if (a.valor_min != null && im.valor != null && Number(im.valor) < Number(a.valor_min)) return false;
      if (a.quartos_min != null && im.quartos != null && Number(im.quartos) < Number(a.quartos_min)) return false;
      if (a.bairros_interesse?.length && im.bairro && !a.bairros_interesse.includes(im.bairro)) return false;
      return true;
    });
  }, [imoveis, atendimento]);

  const adicionar = async (imovel_id: string) => {
    const { error } = await supabase.from('atendimento_imoveis').insert({ atendimento_id: atendimento.id, imovel_id, status: 'sugerido' });
    if (error) { toast.error(error.message); return; }
    toast.success('Imóvel vinculado.');
    qc.invalidateQueries({ queryKey: ['atendimento-imoveis', atendimento.id] });
  };
  const atualizarStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('atendimento_imoveis').update({ status }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Status atualizado.'); qc.invalidateQueries({ queryKey: ['atendimento-imoveis', atendimento.id] }); }
  };
  const remover = async (id: string) => {
    const { error } = await supabase.from('atendimento_imoveis').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Removido.'); qc.invalidateQueries({ queryKey: ['atendimento-imoveis', atendimento.id] }); }
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 font-serif text-lg">Imóveis compatíveis ({compativeis.length})</h3>
        {compativeis.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum imóvel compatível encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {compativeis.map((im: any) => (
              <Card key={im.id} className="overflow-hidden">
                <CardContent className="flex gap-3 p-3">
                  <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {im.fotos?.[0] ? <img src={im.fotos[0]} alt={im.codigo} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex-1 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{im.codigo} · {im.tipo}</span>
                      <Badge variant="outline">{im.status}</Badge>
                    </div>
                    <p className="text-muted-foreground">{im.bairro}</p>
                    <p className="font-semibold">{fmtBRL(im.valor)}</p>
                    <p className="text-xs text-muted-foreground">{im.quartos ?? 0} quartos · {im.vagas ?? 0} vagas · {im.area_interna ?? '—'}m²</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/imoveis/${im.id}`)}>Ver imóvel</Button>
                      <Button size="sm" disabled={vinculadosIds.has(im.id)} onClick={() => adicionar(im.id)}>
                        <Plus className="mr-1 h-3 w-3" />{vinculadosIds.has(im.id) ? 'Vinculado' : 'Adicionar'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-serif text-lg">Imóveis vinculados ({vinculados.length})</h3>
        {vinculados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum imóvel vinculado.</p>
        ) : (
          <div className="space-y-2">
            {vinculados.map((v: any) => (
              <Card key={v.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-3">
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    {v.imovel?.fotos?.[0] ? <img src={v.imovel.fotos[0]} className="h-full w-full object-cover" alt="" /> : null}
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{v.imovel?.codigo} · {v.imovel?.tipo}</p>
                    <p className="text-muted-foreground">{v.imovel?.bairro}</p>
                  </div>
                  <Select value={v.status} onValueChange={(s) => atualizarStatus(v.id, s)}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[9999]">
                      {ATEND_IMOVEL_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/imoveis/${v.imovel_id}`)}><ExternalLink className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remover(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
