import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, ArrowRight, ArrowLeft, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const TIPO_OPTIONS = ['Apartamento', 'Casa', 'Sala Comercial', 'Terreno', 'Galpão', 'Loja', 'Flat', 'Cobertura'];
const ORIGEM_OPTIONS = ['Portal imobiliário', 'Indicação', 'Ligação ativa', 'Instagram/Facebook', 'Site próprio', 'WhatsApp', 'Outro'];

const maskTel = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 0) return `(${d}`;
  return '';
};
const maskCpf = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
};
const maskBRL = (v: string) => {
  const d = v.replace(/\D/g, '');
  if (!d) return '';
  return (parseInt(d, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const parseBRL = (v: string) => {
  if (!v) return null;
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
};

export default function NovoAtendimento() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [origem, setOrigem] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Step 2
  const [finalidade, setFinalidade] = useState('');
  const [tipos, setTipos] = useState<string[]>([]);
  const [bairros, setBairros] = useState<string[]>([]);
  const [bairroInput, setBairroInput] = useState('');
  const [cidade, setCidade] = useState('');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [quartosMin, setQuartosMin] = useState('0');
  const [vagasMin, setVagasMin] = useState('0');
  const [areaMin, setAreaMin] = useState('');

  const toggleTipo = (t: string) =>
    setTipos((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const addBairro = () => {
    const v = bairroInput.trim();
    if (v && !bairros.includes(v)) setBairros((p) => [...p, v]);
    setBairroInput('');
  };
  const removeBairro = (b: string) => setBairros((p) => p.filter((x) => x !== b));

  const goNext = () => {
    if (!nome.trim() || nome.length > 100) { toast.error('Nome obrigatório (máx. 100 caracteres)'); return; }
    if (telefone.replace(/\D/g, '').length < 10) { toast.error('Telefone inválido'); return; }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.error('E-mail inválido'); return; }
    if (!origem) { toast.error('Selecione a origem do lead'); return; }
    setStep(2);
  };

  const generateCodigo = async () => {
    const { count } = await supabase.from('atendimentos').select('*', { count: 'exact', head: true });
    return `ATD-${String((count ?? 0) + 1).padStart(4, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalidade) { toast.error('Selecione a finalidade'); return; }
    setLoading(true);
    try {
      const telDigits = telefone.replace(/\D/g, '');

      // Find or create cliente
      const { data: existente } = await supabase
        .from('clientes').select('id').eq('telefone', telefone).maybeSingle();

      let clienteId: string;
      if (existente?.id) {
        clienteId = existente.id;
        toast.info('Cliente já cadastrado, vinculando ao atendimento existente');
      } else {
        const { data: novo, error: cErr } = await supabase.from('clientes').insert({
          nome: nome.trim(),
          telefone,
          email: email.trim() || null,
          cpf: cpf || null,
          origem,
          observacoes: observacoes.trim() || null,
          corretor_email: user?.email ?? null,
        }).select('id').single();
        if (cErr) throw cErr;
        clienteId = novo.id;
      }

      const codigo = await generateCodigo();

      const qMin = parseInt(quartosMin, 10) || null;
      const vMin = parseInt(vagasMin, 10) || null;
      const aMin = areaMin ? parseFloat(areaMin.replace(',', '.')) : null;

      const { data: atend, error: aErr } = await supabase.from('atendimentos').insert({
        codigo,
        cliente_id: clienteId,
        corretor_email: user?.email ?? null,
        status: 'novo',
        etapa: 'contato',
        finalidade_interesse: finalidade,
        tipo_interesse: tipos,
        bairros_interesse: bairros,
        cidade_interesse: cidade.trim() || null,
        valor_min: parseBRL(valorMin),
        valor_max: parseBRL(valorMax),
        quartos_min: qMin,
        vagas_min: vMin,
        area_min: aMin,
        notas: observacoes.trim() || null,
      }).select('id').single();
      if (aErr) throw aErr;

      toast.success(`Atendimento ${codigo} criado com sucesso!`);
      // unused var to satisfy linter (telDigits intentionally kept above)
      void telDigits;
      navigate(`/atendimentos/${atend.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar atendimento';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const StepDot = ({ n, label }: { n: 1 | 2; label: string }) => {
    const active = step === n;
    const done = step > n;
    return (
      <div className="flex items-center gap-2 flex-1">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
          done ? 'bg-success text-success-foreground' : active ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
        }`}>
          {done ? <Check className="w-4 h-4" /> : n}
        </div>
        <span className={`text-xs font-medium ${active || done ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      </div>
    );
  };

  return (
    <AppLayout title="Novo Atendimento">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-5">
        <StepDot n={1} label="Cliente" />
        <div className={`h-px flex-1 transition-colors ${step > 1 ? 'bg-success' : 'bg-border'}`} />
        <StepDot n={2} label="Interesse" />
      </div>

      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              <div>
                <Label>Nome completo <span className="text-destructive">*</span></Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} placeholder="Nome do cliente" />
              </div>
              <div>
                <Label>Telefone <span className="text-destructive">*</span></Label>
                <Input value={telefone} onChange={(e) => setTelefone(maskTel(e.target.value))} placeholder="(99) 99999-9999" />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} placeholder="cliente@email.com" />
              </div>
              <div>
                <Label>CPF</Label>
                <Input value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" />
              </div>
              <div>
                <Label>Origem do lead <span className="text-destructive">*</span></Label>
                <Select value={origem} onValueChange={setOrigem}>
                  <SelectTrigger><SelectValue placeholder="Selecione a origem" /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {ORIGEM_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações iniciais</Label>
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} maxLength={1000} rows={3} placeholder="Anote o que for relevante..." />
              </div>
              <Button type="button" onClick={goNext} className="w-full h-12 mt-2">
                Próximo <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              <div>
                <Label>Finalidade de interesse <span className="text-destructive">*</span></Label>
                <Select value={finalidade} onValueChange={setFinalidade}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="Compra">Compra</SelectItem>
                    <SelectItem value="Aluguel">Aluguel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipos de imóvel</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {TIPO_OPTIONS.map((t) => {
                    const active = tipos.includes(t);
                    return (
                      <button
                        type="button" key={t} onClick={() => toggleTipo(t)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-accent'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Bairros de interesse</Label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {bairros.map((b) => (
                    <span key={b} className="text-xs px-2.5 py-1 rounded-full bg-accent/15 text-accent border border-accent/30 inline-flex items-center gap-1">
                      {b}
                      <button type="button" onClick={() => removeBairro(b)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <Input
                  value={bairroInput}
                  onChange={(e) => setBairroInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addBairro(); }
                  }}
                  placeholder="Digite e pressione Enter"
                  maxLength={60}
                />
              </div>

              <div>
                <Label>Cidade de interesse</Label>
                <Input value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={80} placeholder="Cidade" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor mín (R$)</Label>
                  <Input value={valorMin} onChange={(e) => setValorMin(maskBRL(e.target.value))} placeholder="0,00" />
                </div>
                <div>
                  <Label>Valor máx (R$)</Label>
                  <Input value={valorMax} onChange={(e) => setValorMax(maskBRL(e.target.value))} placeholder="0,00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quartos mínimo</Label>
                  <Select value={quartosMin} onValueChange={setQuartosMin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Label>Vagas mínimo</Label>
                  <Select value={vagasMin} onValueChange={setVagasMin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="0">Qualquer</SelectItem>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Área mínima (m²)</Label>
                <Input value={areaMin} onChange={(e) => setAreaMin(e.target.value.replace(/[^\d,]/g, ''))} placeholder="0" />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-12" disabled={loading}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <Button type="submit" className="flex-1 h-12" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</> : 'Salvar Atendimento'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </AppLayout>
  );
}
