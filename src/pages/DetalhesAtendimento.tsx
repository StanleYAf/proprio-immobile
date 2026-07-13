import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, Phone, Mail, ExternalLink,
  Plus, ImageOff, Calendar, FileText, Trash2, ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import {
  useImoviewImoveisEncontrados,
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
  if (n == null) return null;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const isYes = (v: any) => {
  if (v === true || v === 1) return true;
  if (typeof v === 'string') return ['s', 'sim', 'true', '1'].includes(v.toLowerCase().trim());
  return false;
};
const simNao = (v: any) => (v == null || v === '' ? '—' : (isYes(v) ? 'Sim' : 'Não'));

function ImoveisGrid({ items, navigate, emptyMsg }: { items: any[]; navigate: (p: string) => void; emptyMsg: string }) {
  if (!items?.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{emptyMsg}</p>;
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
              <p className="text-base font-bold text-accent">{fmtBRL(valor) ?? 'Consulte-nos'}</p>
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

const Chips = ({ items }: { items: any[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((it, i) => (
      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-muted text-foreground border border-border">
        {typeof it === 'string' ? it : (it?.nome ?? it?.descricao ?? JSON.stringify(it))}
      </span>
    ))}
  </div>
);

const Field = ({ label, value }: { label: string; value: any }) => (
  <div>
    <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</p>
    <div className="text-sm mt-0.5">{value ?? '—'}</div>
  </div>
);

const TIPOS_INTERACAO = [
  { value: 'Nota', label: 'Nota' },
  { value: 'Ligacao', label: 'Ligação' },
  { value: 'Email', label: 'E-mail' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Visita', label: 'Visita' },
];

function renderTexto(texto: string) {
  if (!texto) return null;
  const linhas = texto.split(/\r?\n/);
  const urlRe = /(https?:\/\/[^\s]+)/g;
  return linhas.map((linha, i) => {
    const parts = linha.split(urlRe);
    return (
      <div key={i}>
        {parts.map((p, j) =>
          urlRe.test(p) ? (
            <a key={j} href={p} target="_blank" rel="noreferrer" className="text-accent underline break-all">{p}</a>
          ) : (
            <span key={j}>{p}</span>
          )
        )}
        {linha === '' && <br />}
      </div>
    );
  });
}

function fmtDataHora(d: any) {
  if (!d) return '';
  if (typeof d === 'string') {
    const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (m) return `${m[1]}/${m[2]}/${m[3]} ${m[4]}:${m[5]}`;
    return d;
  }
  return String(d);
}

export default function DetalhesAtendimento() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const codigoAtendimento = id;
  const qc = useQueryClient();

  // 1) Tentar pegar do state da navegação
  const fromState: any = (location.state as any)?.atendimento ?? null;

  // 2) Caso contrário, procurar nas listas em cache do React Query
  const fromCache: any = useMemo(() => {
    if (fromState) return null;
    const queries = qc.getQueriesData({ queryKey: ['imoview', 'atendimentos'] });
    for (const [, data] of queries) {
      const lista: any[] = (data as any)?.lista ?? (Array.isArray(data) ? (data as any) : []);
      const match = lista.find((a: any) =>
        String(a?.codigo ?? a?.codigoAtendimento ?? a?.id) === String(codigoAtendimento)
      );
      if (match) return match;
    }
    return null;
  }, [fromState, qc, codigoAtendimento]);

  const root: any = fromState ?? fromCache;
  const semDados = !root;

  const encontrados = useImoviewImoveisEncontrados(semDados ? null : codigoAtendimento);

  const lead: any = root?.lead ?? {};
  const perfil: any = root?.perfil ?? {};

  const interacoes: any[] = root?.interacoes ?? [];
  const imoveisCarrinho: any[] = root?.imoveiscarrinho ?? [];
  const imoveisVisita: any[] = root?.imoveisvisita ?? [];
  const imoveisProposta: any[] = root?.imoveisproposta ?? [];
  const imoveisNegocio: any[] = root?.imoveisnegocio ?? [];
  const encontradosList: any[] = (encontrados.data as any)?.lista ?? (Array.isArray(encontrados.data) ? encontrados.data : []);

  const [novoTipo, setNovoTipo] = useState('Nota');
  const [novoConteudo, setNovoConteudo] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Dialog states
  const [dialogVisita, setDialogVisita] = useState(false);
  const [dialogProposta, setDialogProposta] = useState(false);
  const [dialogDescartar, setDialogDescartar] = useState(false);
  const [dialogTransferir, setDialogTransferir] = useState(false);

  // Imóveis em cache para os selects
  const imoveisCache = useMemo(() => {
    const queries = qc.getQueriesData({ queryKey: ['imoview', 'imoveis'] });
    const all: any[] = [];
    for (const [, data] of queries) {
      const lista: any[] = (data as any)?.lista ?? [];
      for (const im of lista) {
        if (!all.find((x) => String(x.codigo) === String(im.codigo))) all.push(im);
      }
    }
    return all;
  }, [qc, dialogVisita, dialogProposta]);

  // Usuários para transferência
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);
  useEffect(() => {
    if (dialogTransferir && usuarios.length === 0) {
      setCarregandoUsuarios(true);
      callImoview('listar_usuarios', {})
        .then((r: any) => setUsuarios(r?.lista ?? (Array.isArray(r) ? r : [])))
        .catch((e: any) => toast.error(e?.message || 'Erro ao carregar usuários'))
        .finally(() => setCarregandoUsuarios(false));
    }
  }, [dialogTransferir]);

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
      qc.invalidateQueries({ queryKey: ['imoview', 'atendimentos'] });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao registrar interação');
    } finally {
      setEnviando(false);
    }
  };


  const perfilPreenchido = useMemo(() => {
    const arrs = [perfil?.tiposimoveis, perfil?.cidades, perfil?.bairros].some(
      (a) => Array.isArray(a) && a.length > 0
    );
    const nums = [perfil?.valorde, perfil?.valorate, perfil?.numeroquarto, perfil?.numerovaga]
      .some((v) => Number(v) > 0);
    return arrs || nums;
  }, [perfil]);

  if (semDados) {
    return (
      <AppLayout title={`Atendimento ${codigoAtendimento ?? ''}`}>
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/atendimentos')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
        </div>
        <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Não foi possível abrir este atendimento diretamente. Abra a partir da listagem para ver os detalhes.
          </p>
          <Button onClick={() => navigate('/atendimentos')}>
            Voltar para listagem
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Atendimento ${codigoAtendimento ?? ''}`}>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/atendimentos')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">{lead?.nome ?? '—'}</h2>
            <p className="text-xs text-muted-foreground">Código #{codigoAtendimento}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {root?.situacao && <Badge>{root.situacao}</Badge>}
            {root?.funil && <Badge variant="outline">{root.funil}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={() => setDialogVisita(true)}>
            <Calendar className="w-4 h-4 mr-1.5" /> Agendar Visita
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialogProposta(true)}>
            <FileText className="w-4 h-4 mr-1.5" /> Incluir Proposta
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDialogTransferir(true)}>
            <ArrowRightLeft className="w-4 h-4 mr-1.5" /> Transferir Corretor
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDialogDescartar(true)}>
            <Trash2 className="w-4 h-4 mr-1.5" /> Descartar
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm">
          {lead?.telefone1 && (
            <a href={`tel:${String(lead.telefone1).replace(/\D/g, '')}`} className="flex items-center gap-2 hover:text-accent">
              <Phone className="w-4 h-4 text-muted-foreground" /> {lead.telefone1}
            </a>
          )}
          {lead?.email && (
            <a href={`mailto:${lead.email}`} className="flex items-center gap-2 hover:text-accent truncate">
              <Mail className="w-4 h-4 text-muted-foreground" /> {lead.email}
            </a>
          )}
          {root?.corretor && (
            <span className="text-muted-foreground">Corretor: <span className="text-foreground">{root.corretor}</span></span>
          )}
        </div>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="encontrados">Encontrados</TabsTrigger>
          <TabsTrigger value="visitas">Visitas</TabsTrigger>
          <TabsTrigger value="proposta">Proposta</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-4 space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Dados do Lead</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nome" value={lead?.nome} />
              <Field label="Telefone principal" value={lead?.telefone1} />
              {lead?.telefone2 && <Field label="Telefone 2" value={lead.telefone2} />}
              {lead?.email && <Field label="E-mail" value={lead.email} />}
              {lead?.profissao && <Field label="Profissão" value={lead.profissao} />}
              {Number(lead?.rendamensal) > 0 && <Field label="Renda mensal" value={fmtBRL(lead.rendamensal)} />}
              {Number(lead?.valorfgts) > 0 && <Field label="Valor FGTS" value={fmtBRL(lead.valorfgts)} />}
              {Number(lead?.valorentrada) > 0 && <Field label="Valor de entrada" value={fmtBRL(lead.valorentrada)} />}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Perfil de Interesse</h3>
            {!perfilPreenchido && !root?.finalidade ? (
              <p className="text-sm text-muted-foreground">Perfil de interesse não preenchido.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {root?.finalidade && <Field label="Finalidade" value={root.finalidade} />}
                {Array.isArray(perfil?.tiposimoveis) && perfil.tiposimoveis.length > 0 && (
                  <Field label="Tipo de imóvel" value={<Chips items={perfil.tiposimoveis} />} />
                )}
                {Array.isArray(perfil?.cidades) && perfil.cidades.length > 0 && (
                  <Field label="Cidades" value={<Chips items={perfil.cidades} />} />
                )}
                {Array.isArray(perfil?.bairros) && perfil.bairros.length > 0 && (
                  <Field label="Bairros" value={<Chips items={perfil.bairros} />} />
                )}
                {(Number(perfil?.valorde) > 0 || Number(perfil?.valorate) > 0) && (
                  <Field
                    label="Faixa de valor"
                    value={`${fmtBRL(perfil?.valorde) ?? 'R$ 0'} — ${fmtBRL(perfil?.valorate) ?? 'R$ 0'}`}
                  />
                )}
                {Number(perfil?.numeroquarto) > 0 && <Field label="Quartos" value={perfil.numeroquarto} />}
                {Number(perfil?.numerovaga) > 0 && <Field label="Vagas" value={perfil.numerovaga} />}
                {perfil?.aceitafinanciamento != null && perfil.aceitafinanciamento !== '' && (
                  <Field label="Aceita financiamento" value={simNao(perfil.aceitafinanciamento)} />
                )}
                {perfil?.mobiliado != null && perfil.mobiliado !== '' && (
                  <Field label="Mobiliado" value={simNao(perfil.mobiliado)} />
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Informações do Atendimento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Corretor" value={root?.corretor} />
              <Field label="Funil" value={root?.funil} />
              <Field label="Mídia de origem" value={root?.midia} />
              <Field label="Tipo" value={root?.tipo} />
              {root?.campanha && <Field label="Campanha" value={root.campanha} />}
              <Field label="Termômetro" value={root?.termometro} />
              <Field label="Entrada do lead" value={fmtDataHora(root?.datahoraentradalead)} />
              <Field label="Última interação" value={fmtDataHora(root?.datahoraultimainteracao)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="encontrados" className="mt-4">
          <ImoveisGrid items={encontradosList} navigate={navigate} emptyMsg="Nenhum imóvel encontrado." />
        </TabsContent>

        <TabsContent value="visitas" className="mt-4 space-y-6">
          <section>
            <h3 className="text-sm font-semibold mb-2">Carrinho</h3>
            <ImoveisGrid items={imoveisCarrinho} navigate={navigate} emptyMsg="Nenhum imóvel no carrinho." />
          </section>
          <section>
            <h3 className="text-sm font-semibold mb-2">Visitas</h3>
            <ImoveisGrid items={imoveisVisita} navigate={navigate} emptyMsg="Nenhuma visita registrada." />
          </section>
        </TabsContent>

        <TabsContent value="proposta" className="mt-4 space-y-6">
          {imoveisProposta.length === 0 && imoveisNegocio.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma proposta registrada.</p>
          ) : (
            <>
              {imoveisProposta.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold mb-2">Propostas</h3>
                  <ImoveisGrid items={imoveisProposta} navigate={navigate} emptyMsg="" />
                </section>
              )}
              {imoveisNegocio.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold mb-2">Negócios</h3>
                  <ImoveisGrid items={imoveisNegocio} navigate={navigate} emptyMsg="" />
                </section>
              )}
            </>
          )}
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
            {interacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma interação registrada.</p>
            ) : interacoes.map((it: any, idx: number) => {
              const data = pick(it, ['datahora', 'data', 'dataInteracao', 'datahoracadastro']);
              const usuario = pick(it, ['usuario', 'nomeUsuario', 'corretor']);
              const descricao = pick(it, ['descricao', 'conteudo', 'observacao']) ?? '';
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: idx * 0.02 }}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">{fmtDataHora(data)}</span>
                    {usuario && (
                      <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground border-border">
                        {usuario}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {renderTexto(String(descricao))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <DialogAgendarVisita
        open={dialogVisita}
        onOpenChange={setDialogVisita}
        codigoAtendimento={codigoAtendimento}
        imoveis={imoveisCache}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['imoview', 'atendimentos'] })}
      />
      <DialogIncluirProposta
        open={dialogProposta}
        onOpenChange={setDialogProposta}
        codigoAtendimento={codigoAtendimento}
        imoveis={imoveisCache}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['imoview', 'atendimentos'] })}
      />
      <DialogDescartar
        open={dialogDescartar}
        onOpenChange={setDialogDescartar}
        codigoAtendimento={codigoAtendimento}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['imoview', 'atendimentos'] });
          setTimeout(() => navigate('/atendimentos'), 1000);
        }}
      />
      <DialogTransferir
        open={dialogTransferir}
        onOpenChange={setDialogTransferir}
        codigoAtendimento={codigoAtendimento}
        usuarios={usuarios}
        carregando={carregandoUsuarios}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['imoview', 'atendimentos'] })}
      />
    </AppLayout>
  );
}

// ═══════════════════════════════════════════════════════════
// DIALOGS
// ═══════════════════════════════════════════════════════════

function ImovelSelect({ imoveis, value, onChange }: { imoveis: any[]; value: string; onChange: (v: string) => void }) {
  const [busca, setBusca] = useState('');
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return imoveis.slice(0, 100);
    return imoveis.filter((im) => {
      const cod = String(im.codigo ?? '').toLowerCase();
      const bairro = String(im.bairro ?? im.endereco?.bairro ?? '').toLowerCase();
      return cod.includes(q) || bairro.includes(q);
    }).slice(0, 100);
  }, [imoveis, busca]);
  return (
    <div className="space-y-2">
      <Input placeholder="Buscar por código ou bairro..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Selecionar imóvel" /></SelectTrigger>
        <SelectContent className="z-[9999] max-h-72">
          {filtrados.length === 0 && <div className="p-3 text-xs text-muted-foreground">Nenhum imóvel encontrado no cache. Abra a lista de imóveis primeiro.</div>}
          {filtrados.map((im: any) => (
            <SelectItem key={String(im.codigo)} value={String(im.codigo)}>
              #{im.codigo} — {im.tipo ?? im.descricaoTipo ?? '—'} • {im.bairro ?? im.endereco?.bairro ?? '—'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const HORARIOS: string[] = (() => {
  const arr: string[] = [];
  for (let h = 8; h <= 18; h++) {
    arr.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 18) arr.push(`${String(h).padStart(2, '0')}:30`);
  }
  return arr;
})();

function DialogAgendarVisita({ open, onOpenChange, codigoAtendimento, imoveis, onSuccess }: any) {
  const [codigoImovel, setCodigoImovel] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('09:00');
  const [obs, setObs] = useState('');
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    if (!codigoImovel) return toast.error('Selecione um imóvel');
    if (!data) return toast.error('Selecione a data');
    const [y, m, d] = data.split('-');
    const dataFmt = `${d}/${m}/${y}`;
    setEnviando(true);
    try {
      await callImoview('agendar_visita', {
        codigoAtendimento,
        codigoImovel,
        datavisita: dataFmt,
        horavisita: hora,
        observacao: obs,
      });
      toast.success('Visita agendada com sucesso!');
      onSuccess?.();
      onOpenChange(false);
      setCodigoImovel(''); setData(''); setObs('');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao agendar visita');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar Visita</DialogTitle>
          <DialogDescription>Selecione o imóvel e o horário da visita.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Imóvel</Label>
            <ImovelSelect imoveis={imoveis} value={codigoImovel} onChange={setCodigoImovel} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Hora</Label>
              <Select value={hora} onValueChange={setHora}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[9999] max-h-64">
                  {HORARIOS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={enviando}>
            {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogIncluirProposta({ open, onOpenChange, codigoAtendimento, imoveis, onSuccess }: any) {
  const [codigoImovel, setCodigoImovel] = useState('');
  const [valor, setValor] = useState('');
  const [obs, setObs] = useState('');
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    if (!codigoImovel) return toast.error('Selecione um imóvel');
    const valorNum = parseFloat(valor.replace(/\./g, '').replace(',', '.'));
    if (!valorNum || isNaN(valorNum)) return toast.error('Informe um valor válido');
    setEnviando(true);
    try {
      await callImoview('incluir_proposta', {
        codigoAtendimento,
        codigoImovel,
        valor: valorNum,
        observacao: obs,
      });
      toast.success('Proposta incluída com sucesso!');
      onSuccess?.();
      onOpenChange(false);
      setCodigoImovel(''); setValor(''); setObs('');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao incluir proposta');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Incluir Proposta</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Imóvel</Label>
            <ImovelSelect imoveis={imoveis} value={codigoImovel} onChange={setCodigoImovel} />
          </div>
          <div>
            <Label className="text-xs">Valor da proposta (R$)</Label>
            <Input inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={enviando}>
            {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogDescartar({ open, onOpenChange, codigoAtendimento, onSuccess }: any) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    if (!motivo.trim()) return toast.error('Informe o motivo');
    setEnviando(true);
    try {
      await callImoview('descartar_atendimento', { codigoAtendimento, motivo });
      toast.success('Atendimento descartado.');
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao descartar');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Descartar atendimento</DialogTitle>
          <DialogDescription>Esta ação removerá o atendimento do funil ativo.</DialogDescription>
        </DialogHeader>
        <div>
          <Label className="text-xs">Motivo do descarte</Label>
          <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={4} required />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={confirmar} disabled={enviando}>
            {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar Descarte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogTransferir({ open, onOpenChange, codigoAtendimento, usuarios, carregando, onSuccess }: any) {
  const [codigoNovoCorretor, setCodigoNovoCorretor] = useState('');
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    if (!codigoNovoCorretor) return toast.error('Selecione um corretor');
    const u = usuarios.find((x: any) => String(x.codigo ?? x.codigoUsuario) === codigoNovoCorretor);
    setEnviando(true);
    try {
      await callImoview('transferir_corretor', { codigoAtendimento, codigoNovoCorretor });
      toast.success(`Atendimento transferido para ${u?.nome ?? 'novo corretor'}.`);
      onSuccess?.();
      onOpenChange(false);
      setCodigoNovoCorretor('');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao transferir');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Corretor</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs">Novo corretor</Label>
          {carregando ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando usuários...
            </div>
          ) : (
            <Select value={codigoNovoCorretor} onValueChange={setCodigoNovoCorretor}>
              <SelectTrigger><SelectValue placeholder="Selecionar corretor" /></SelectTrigger>
              <SelectContent className="z-[9999] max-h-72">
                {usuarios.length === 0 && <div className="p-3 text-xs text-muted-foreground">Nenhum usuário encontrado.</div>}
                {usuarios.map((u: any) => {
                  const cod = String(u.codigo ?? u.codigoUsuario ?? '');
                  return (
                    <SelectItem key={cod} value={cod}>
                      {u.nome ?? u.nomeUsuario ?? '—'}{u.email ? ` • ${u.email}` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={enviando}>
            {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

