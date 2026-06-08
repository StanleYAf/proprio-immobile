import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, AlertTriangle, Phone, Mail, ExternalLink,
  Plus, ImageOff,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import {
  useImoviewAtendimentoDetalhe,
  useImoviewImoveisEncontrados,
  useImoviewImoveisCarrinho,
  useImoviewImoveisVisita,
  useImoviewImoveisProposta,
  callImoview,
} from '@/hooks/useImoviewApi';

const pick = (obj: any, keys: string[]): any => {
  for (const k of keys) {
    const parts = k.split('.');
    let v: any = obj;
    for (const p of parts) v = v?.[p];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
};

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
const fmtBRL = (v: any) => {
  const n = parseValor(v);
  if (n == null) return 'Consulte-nos';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const ErrorBanner = ({ msg, onRetry }: { msg: string; onRetry: () => void }) => (
  <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 flex items-center gap-3">
    <AlertTriangle className="w-5 h-5 text-yellow-400" />
    <div className="flex-1">
      <p className="text-sm font-medium text-yellow-100">Não foi possível carregar</p>
      <p className="text-xs text-yellow-200/70 mt-0.5">{msg}</p>
    </div>
    <Button size="sm" variant="outline" onClick={onRetry}>Tentar novamente</Button>
  </div>
);

const SkeletonList = () => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
  </div>
);

function ImoveisGrid({ items, navigate }: { items: any[]; navigate: (p: string) => void }) {
  if (!items?.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Nenhum imóvel.</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((it, idx) => {
        const codigo = pick(it, ['codigo', 'codigoImovel', 'id']) ?? '';
        const tipo = pick(it, ['tipo', 'descricaoTipo', 'tipoImovel']);
        const bairro = pick(it, ['bairro', 'nomeBairro', 'endereco.bairro']);
        const cidade = pick(it, ['cidade', 'nomeCidade', 'endereco.cidade']);
        const valor = pick(it, ['valor', 'valorVenda', 'valorAluguel', 'preco']);
        const foto = pick(it, ['foto', 'urlFoto', 'fotoPrincipal', 'imagem', 'urlImagem']);
        return (
          <motion.div
            key={String(codigo) + idx}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: idx * 0.03 }}
            className="rounded-xl border border-border bg-card overflow-hidden flex flex-col"
          >
            <div className="aspect-[16/10] bg-muted flex items-center justify-center overflow-hidden">
              {foto ? (
                <img src={foto} alt={tipo ?? 'Imóvel'} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <ImageOff className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="p-3 flex-1 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">{codigo || '—'}</span>
                <Badge variant="outline" className="text-[10px]">{tipo ?? '—'}</Badge>
              </div>
              <p className="text-sm font-medium">{[bairro, cidade].filter(Boolean).join(' • ') || '—'}</p>
              <p className="text-base font-bold text-accent">{fmtBRL(valor)}</p>
              {codigo && (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate(`/imoveis?codigo=${codigo}`)}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Ver imóvel
                </Button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

const TIPOS_INTERACAO = [
  { value: 'Nota', label: 'Nota' },
  { value: 'Ligacao', label: 'Ligação' },
  { value: 'Email', label: 'E-mail' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Visita', label: 'Visita' },
];

export default function DetalhesAtendimento() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const codigoAtendimento = id;
  const qc = useQueryClient();

  const detalhe = useImoviewAtendimentoDetalhe(codigoAtendimento);
  const encontrados = useImoviewImoveisEncontrados(codigoAtendimento);
  const carrinho = useImoviewImoveisCarrinho(codigoAtendimento);
  const visita = useImoviewImoveisVisita(codigoAtendimento);
  const proposta = useImoviewImoveisProposta(codigoAtendimento);

  const cliente = useMemo(() => {
    const d: any = detalhe.data || {};
    return {
      nome: pick(d, ['nomeCliente', 'cliente.nome', 'nome']),
      telefone: pick(d, ['telefoneCliente', 'cliente.telefone', 'telefone']),
      email: pick(d, ['emailCliente', 'cliente.email', 'email']),
      cpf: pick(d, ['cpfCliente', 'cliente.cpf', 'cpf']),
      status: pick(d, ['status', 'situacao']),
      etapa: pick(d, ['etapa', 'estagio']),
      corretor: pick(d, ['nomeCorretor', 'corretor.nome', 'corretor']),
      finalidade: pick(d, ['finalidade']),
      tipo: pick(d, ['tipo', 'descricaoTipo']),
      bairros: pick(d, ['bairros', 'bairrosInteresse']),
      cidade: pick(d, ['cidade', 'cidadeInteresse']),
      valorMin: pick(d, ['valorMinimo', 'valorMin', 'valorde']),
      valorMax: pick(d, ['valorMaximo', 'valorMax', 'valorate']),
      observacoes: pick(d, ['observacoes', 'observacao']),
      raw: d,
    };
  }, [detalhe.data]);

  const interacoes: any[] = useMemo(() => {
    const d: any = detalhe.data || {};
    return d.interacoes ?? d.historico ?? d.historicos ?? [];
  }, [detalhe.data]);

  // Nova interação
  const [novoTipo, setNovoTipo] = useState('Nota');
  const [novoConteudo, setNovoConteudo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const registrarInteracao = async () => {
    if (!novoConteudo.trim()) { toast.error('Conteúdo obrigatório'); return; }
    setEnviando(true);
    try {
      await callImoview('incluir_interacao', {
        codigoAtendimento,
        tipo: novoTipo,
        conteudo: novoConteudo,
        descricao: novoConteudo,
      });
      toast.success('Interação registrada');
      setNovoConteudo('');
      qc.invalidateQueries({ queryKey: ['imoview', 'atendimento', codigoAtendimento] });
      detalhe.refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao registrar interação');
    } finally {
      setEnviando(false);
    }
  };

  const carrinhoList: any[] = (carrinho.data as any)?.lista ?? (Array.isArray(carrinho.data) ? carrinho.data : []);
  const visitaList: any[] = (visita.data as any)?.lista ?? (Array.isArray(visita.data) ? visita.data : []);
  const encontradosList: any[] = (encontrados.data as any)?.lista ?? (Array.isArray(encontrados.data) ? encontrados.data : []);
  const propostaList: any[] = (proposta.data as any)?.lista ?? (Array.isArray(proposta.data) ? proposta.data : []);

  return (
    <AppLayout title={`Atendimento ${codigoAtendimento ?? ''}`}>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/atendimentos')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
      </div>

      {detalhe.isLoading ? (
        <Skeleton className="h-32 w-full mb-4" />
      ) : detalhe.error ? (
        <ErrorBanner msg={(detalhe.error as any)?.message ?? 'Erro'} onRetry={() => detalhe.refetch()} />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">{cliente.nome ?? '—'}</h2>
              <p className="text-xs text-muted-foreground">Código #{codigoAtendimento}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {cliente.status && <Badge>{cliente.status}</Badge>}
              {cliente.etapa && <Badge variant="outline">{cliente.etapa}</Badge>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm">
            {cliente.telefone && (
              <a href={`tel:${String(cliente.telefone).replace(/\D/g, '')}`} className="flex items-center gap-2 hover:text-accent">
                <Phone className="w-4 h-4 text-muted-foreground" /> {cliente.telefone}
              </a>
            )}
            {cliente.email && (
              <a href={`mailto:${cliente.email}`} className="flex items-center gap-2 hover:text-accent truncate">
                <Mail className="w-4 h-4 text-muted-foreground" /> {cliente.email}
              </a>
            )}
            {cliente.corretor && (
              <span className="text-muted-foreground">Corretor: <span className="text-foreground">{cliente.corretor}</span></span>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="encontrados">Encontrados</TabsTrigger>
          <TabsTrigger value="visitas">Visitas</TabsTrigger>
          <TabsTrigger value="proposta">Proposta</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-4 space-y-3">
          {detalhe.isLoading ? <SkeletonList /> : detalhe.error ? (
            <ErrorBanner msg={(detalhe.error as any)?.message ?? 'Erro'} onRetry={() => detalhe.refetch()} />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ['Nome', cliente.nome],
                ['Telefone', cliente.telefone],
                ['E-mail', cliente.email],
                ['CPF', cliente.cpf],
                ['Finalidade', cliente.finalidade],
                ['Tipo de imóvel', cliente.tipo],
                ['Cidade', cliente.cidade],
                ['Bairros', Array.isArray(cliente.bairros) ? cliente.bairros.join(', ') : cliente.bairros],
                ['Valor mínimo', cliente.valorMin ? fmtBRL(cliente.valorMin) : null],
                ['Valor máximo', cliente.valorMax ? fmtBRL(cliente.valorMax) : null],
                ['Observações', cliente.observacoes],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</p>
                  <p className="text-sm">{value || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="encontrados" className="mt-4">
          {encontrados.isLoading ? <SkeletonList /> :
            encontrados.error ? <ErrorBanner msg={(encontrados.error as any)?.message ?? 'Erro'} onRetry={() => encontrados.refetch()} /> :
            <ImoveisGrid items={encontradosList} navigate={navigate} />}
        </TabsContent>

        <TabsContent value="visitas" className="mt-4 space-y-6">
          <section>
            <h3 className="text-sm font-semibold mb-2">Carrinho</h3>
            {carrinho.isLoading ? <SkeletonList /> :
              carrinho.error ? <ErrorBanner msg={(carrinho.error as any)?.message ?? 'Erro'} onRetry={() => carrinho.refetch()} /> :
              <ImoveisGrid items={carrinhoList} navigate={navigate} />}
          </section>
          <section>
            <h3 className="text-sm font-semibold mb-2">Visitas</h3>
            {visita.isLoading ? <SkeletonList /> :
              visita.error ? <ErrorBanner msg={(visita.error as any)?.message ?? 'Erro'} onRetry={() => visita.refetch()} /> :
              <ImoveisGrid items={visitaList} navigate={navigate} />}
          </section>
        </TabsContent>

        <TabsContent value="proposta" className="mt-4">
          {proposta.isLoading ? <SkeletonList /> :
            proposta.error ? <ErrorBanner msg={(proposta.error as any)?.message ?? 'Erro'} onRetry={() => proposta.refetch()} /> :
            <ImoveisGrid items={propostaList} navigate={navigate} />}
        </TabsContent>

        <TabsContent value="historico" className="mt-4 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">Nova interação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={novoTipo} onValueChange={setNovoTipo}>
                  <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {TIPOS_INTERACAO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Conteúdo</Label>
                <Textarea value={novoConteudo} onChange={(e) => setNovoConteudo(e.target.value)} rows={3} className="mt-1" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={registrarInteracao} disabled={enviando}>
                {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Registrar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {detalhe.isLoading ? <SkeletonList /> :
              interacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma interação registrada.</p>
              ) : interacoes.map((it: any, idx: number) => {
                const tipo = pick(it, ['tipo', 'descricaoTipo']);
                const conteudo = pick(it, ['conteudo', 'descricao', 'observacao']);
                const data = pick(it, ['datahora', 'data', 'dataInteracao', 'datahoracadastro']);
                const autor = pick(it, ['usuario', 'corretor', 'nomeUsuario']);
                return (
                  <div key={idx} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-[10px]">{tipo ?? 'Nota'}</Badge>
                      <span className="text-[10px] text-muted-foreground">{data ?? ''}</span>
                    </div>
                    <p className="text-sm">{conteudo ?? '—'}</p>
                    {autor && <p className="text-[10px] text-muted-foreground mt-1">por {autor}</p>}
                  </div>
                );
              })}
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
