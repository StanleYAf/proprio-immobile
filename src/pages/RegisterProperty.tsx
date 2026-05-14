import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormField from '@/components/FormField';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { sendToWebhook } from '@/lib/webhook';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function RegisterProperty() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cep, setCep] = useState('');
  const [form, setForm] = useState({
    tipo: '', valor: '', condominio: '', iptu: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', descricao: '',
    nome_proprietario: '', telefone_proprietario: '',
    quartos: '', suites: '', vagas: '', finalidade: '', tipo_complemento: '',
    andar: '', banheiros: '', salas: '', varandas: '',
    vagas_garagem: '', tipo_vaga: '', torres_blocos: '', num_andares: '', unidade_por_andar: '', total_unidades: '',
    area_interna: '', area_externa: '', area_lote: '',
  });
  const [destinacao, setDestinacao] = useState({ comercial: false, residencial: false });

  const lazerOptions = [
    'Academia', 'Home cinema', 'Quadra esportiva', 'Salão de jogos',
    'Churrasqueira', 'Piscina', 'Sala de massagem', 'Sauna',
    'Hidromassagem', 'Playground', 'Salão de festas', 'Wifi',
  ];
  const [lazer, setLazer] = useState<Record<string, boolean>>({});
  const [financiamento, setFinanciamento] = useState<string>('');

  const update = (name: string, value: string) => setForm((p) => ({ ...p, [name]: value }));

  const handleTelefoneChange = (_name: string, value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    let masked = digits;
    if (digits.length > 6) {
      masked = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length > 2) {
      masked = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length > 0) {
      masked = `(${digits}`;
    }
    setForm((p) => ({ ...p, telefone_proprietario: masked }));
  };

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const num = parseInt(digits || '0', 10);
    return (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCurrencyChange = (name: string, value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setForm((p) => ({ ...p, [name]: '' }));
      return;
    }
    setForm((p) => ({ ...p, [name]: formatCurrency(value) }));
  };

  const tituloGerado = useMemo(() => {
    const parts: string[] = [];
    if (form.tipo) parts.push(form.tipo + ' à venda');
    if (form.quartos) parts.push(form.quartos + ' quartos');
    if (form.suites) parts.push(form.suites + ' suítes');
    if (form.vagas) parts.push(form.vagas + ' vagas');
    if (form.bairro) parts.push(form.bairro);

    let titulo = parts.join(', ');

    if (form.cidade || form.estado) {
      titulo += ' - ' + [form.cidade, form.estado].filter(Boolean).join('/');
    }
    return titulo;
  }, [form.tipo, form.quartos, form.suites, form.vagas, form.bairro, form.cidade, form.estado]);

  const handleCepChange = async (value: string) => {
    const digits = value.replace(/\D/g, '');
    const masked = digits.length > 5 ? digits.slice(0, 5) + '-' + digits.slice(5, 8) : digits;
    setCep(masked);

    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm((p) => ({
            ...p,
            endereco: data.logradouro || p.endereco,
            bairro: data.bairro || p.bairro,
            cidade: data.localidade || p.cidade,
            estado: data.uf || p.estado,
          }));
        } else {
          toast.error('CEP não encontrado');
        }
      } catch {
        toast.error('Erro ao buscar CEP');
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tipo || !form.valor || !form.finalidade || !destinacao.comercial && !destinacao.residencial || !cep || !form.endereco || !form.numero || !form.bairro || !form.cidade || !form.estado || !form.nome_proprietario || !form.telefone_proprietario || !form.descricao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setLoading(true);
    const res = await sendToWebhook({
      tipo: 'imovel', acao: 'cadastrar',
      usuario: { email: user!.email, name: user!.name },
      dados: { ...form, cep, destinacao, lazer: Object.keys(lazer).filter(k => lazer[k]), aceita_financiamento: financiamento, titulo: tituloGerado },
    });
    setLoading(false);
    if (res.success) {
      const codigo = res.data?.codigo_imovel || res.data?.codigo || res.data?.code || res.data?.id || '';
      toast.success(codigo ? `Imóvel cadastrado com sucesso! Código: ${codigo}` : 'Imóvel cadastrado com sucesso!');
      setForm({ tipo: '', valor: '', condominio: '', iptu: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', descricao: '', nome_proprietario: '', telefone_proprietario: '', quartos: '', suites: '', vagas: '', finalidade: '', tipo_complemento: '', andar: '', banheiros: '', salas: '', varandas: '', vagas_garagem: '', tipo_vaga: '', torres_blocos: '', num_andares: '', unidade_por_andar: '', total_unidades: '', area_interna: '', area_externa: '', area_lote: '' });
      setCep('');
      setDestinacao({ comercial: false, residencial: false });
      setLazer({});
      setFinanciamento('');
      
    } else {
      toast.error(res.error || 'Erro ao enviar');
    }
  };

  return (
    <AppLayout title="Cadastrar Imóvel">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label className="text-sm font-medium text-foreground">Tipo <span className="text-destructive">*</span></Label>
          <Select value={form.tipo} onValueChange={(v) => update('tipo', v)}>
            <SelectTrigger className="w-full h-11 rounded-xl bg-card border-border">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <SelectItem value="Apartamento">Apartamento</SelectItem>
              <SelectItem value="Barracão">Barracão</SelectItem>
              <SelectItem value="Casa">Casa</SelectItem>
              <SelectItem value="Conjunto">Conjunto</SelectItem>
              <SelectItem value="Loja">Loja</SelectItem>
              <SelectItem value="Lote">Lote</SelectItem>
              <SelectItem value="Sala">Sala</SelectItem>
              <SelectItem value="Vaga">Vaga</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm font-medium text-foreground">Tipo complemento</Label>
          <Select value={form.tipo_complemento} onValueChange={(v) => update('tipo_complemento', v)}>
            <SelectTrigger className="w-full h-11 rounded-xl bg-card border-border">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <SelectItem value="Apartamento">Apartamento</SelectItem>
              <SelectItem value="Barracão">Barracão</SelectItem>
              <SelectItem value="Casa">Casa</SelectItem>
              <SelectItem value="Conjunto">Conjunto</SelectItem>
              <SelectItem value="Loja">Loja</SelectItem>
              <SelectItem value="Lote">Lote</SelectItem>
              <SelectItem value="Sala">Sala</SelectItem>
              <SelectItem value="Vaga">Vaga</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <FormField label="Valor (R$)" name="valor" value={form.valor} onChange={handleCurrencyChange} required placeholder="0,00" />

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Condomínio (R$)" name="condominio" value={form.condominio} onChange={handleCurrencyChange} placeholder="0,00" />
          <FormField label="IPTU (R$)" name="iptu" value={form.iptu} onChange={handleCurrencyChange} placeholder="0,00" />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Destinação <span className="text-destructive">*</span></Label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox id="comercial" checked={destinacao.comercial} onCheckedChange={(v) => setDestinacao((p) => ({ ...p, comercial: !!v }))} />
              <Label htmlFor="comercial" className="text-sm text-foreground cursor-pointer">Comercial</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="residencial" checked={destinacao.residencial} onCheckedChange={(v) => setDestinacao((p) => ({ ...p, residencial: !!v }))} />
              <Label htmlFor="residencial" className="text-sm text-foreground cursor-pointer">Residencial</Label>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-sm font-medium text-foreground">Finalidade <span className="text-destructive">*</span></Label>
          <Select value={form.finalidade} onValueChange={(v) => update('finalidade', v)}>
            <SelectTrigger className="w-full h-11 rounded-xl bg-card border-border">
              <SelectValue placeholder="Selecione a finalidade" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <SelectItem value="Venda">Venda</SelectItem>
              <SelectItem value="Aluguel">Aluguel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold text-foreground uppercase">Características Externas</Label>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Vagas de garagem" name="vagas_garagem" value={form.vagas_garagem} onChange={update} placeholder="0" />
            <FormField label="Tipo de vaga" name="tipo_vaga" value={form.tipo_vaga} onChange={update} placeholder="Coberta, Descoberta..." />
            <FormField label="Nº torres / blocos" name="torres_blocos" value={form.torres_blocos} onChange={update} placeholder="0" />
            <FormField label="Nº andares" name="num_andares" value={form.num_andares} onChange={update} placeholder="0" />
            <FormField label="Unidade por andar" name="unidade_por_andar" value={form.unidade_por_andar} onChange={update} placeholder="0" />
            <FormField label="Total unidades" name="total_unidades" value={form.total_unidades} onChange={update} placeholder="0" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold text-foreground uppercase">Áreas</Label>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Área interna (m²)" name="area_interna" value={form.area_interna} onChange={update} placeholder="0" />
            <FormField label="Área externa (m²)" name="area_externa" value={form.area_externa} onChange={update} placeholder="0" />
            <FormField label="Área do lote (m²)" name="area_lote" value={form.area_lote} onChange={update} placeholder="0" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold text-foreground uppercase">Características Internas</Label>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Andar" name="andar" value={form.andar} onChange={update} placeholder="0" />
            <FormField label="Banheiros" name="banheiros" value={form.banheiros} onChange={update} placeholder="0" />
            <FormField label="Quartos" name="quartos" value={form.quartos} onChange={update} placeholder="0" />
            <FormField label="Salas" name="salas" value={form.salas} onChange={update} placeholder="0" />
            <FormField label="Suítes" name="suites" value={form.suites} onChange={update} placeholder="0" />
            <FormField label="Varandas" name="varandas" value={form.varandas} onChange={update} placeholder="0" />
          </div>
        </div>

        <div className="relative">
          <FormField label="CEP" name="cep" value={cep} onChange={(_n, v) => handleCepChange(v)} required placeholder="00000-000" />
          {cepLoading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-9 text-muted-foreground" />}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <FormField label="Endereço" name="endereco" value={form.endereco} onChange={update} required placeholder="Rua, Avenida..." />
          <FormField label="Nº" name="numero" value={form.numero} onChange={update} required placeholder="000" />
        </div>
        <FormField label="Complemento" name="complemento" value={form.complemento} onChange={update} placeholder="Apto, Bloco, Sala..." />
        <FormField label="Bairro" name="bairro" value={form.bairro} onChange={update} required placeholder="Bairro" />
        <FormField label="Cidade" name="cidade" value={form.cidade} onChange={update} required placeholder="Cidade" />
        <FormField label="Estado" name="estado" value={form.estado} onChange={update} required placeholder="UF" />
        <FormField label="Nome do Proprietário" name="nome_proprietario" value={form.nome_proprietario} onChange={update} required placeholder="Nome completo" />
        <FormField label="Telefone do Proprietário" name="telefone_proprietario" value={form.telefone_proprietario} onChange={handleTelefoneChange} required placeholder="(11) 99999-9999" />
        <FormField label="Descrição" name="descricao" value={form.descricao} onChange={update} required multiline placeholder="Detalhes do imóvel..." />

        <div className="space-y-2">
          <Label className="text-sm font-bold text-foreground uppercase">Lazer</Label>
          <div className="grid grid-cols-2 gap-2">
            {lazerOptions.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <Checkbox
                  id={`lazer-${item}`}
                  checked={!!lazer[item]}
                  onCheckedChange={(v) => setLazer((p) => ({ ...p, [item]: !!v }))}
                />
                <Label htmlFor={`lazer-${item}`} className="text-sm text-foreground cursor-pointer">{item}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Label className="text-sm font-medium text-foreground">Aceita financiamento?</Label>
          <div className="flex items-center gap-2">
            <Checkbox id="fin-sim" checked={financiamento === 'sim'} onCheckedChange={(v) => setFinanciamento(v ? 'sim' : '')} />
            <Label htmlFor="fin-sim" className="text-sm text-foreground cursor-pointer">Sim</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="fin-nao" checked={financiamento === 'nao'} onCheckedChange={(v) => setFinanciamento(v ? 'nao' : '')} />
            <Label htmlFor="fin-nao" className="text-sm text-foreground cursor-pointer">Não</Label>
          </div>
        </div>

        

        {tituloGerado && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-1">
            <Label className="text-xs font-semibold text-accent uppercase tracking-wide">Título gerado</Label>
            <p className="text-sm font-medium text-foreground leading-snug">{tituloGerado}</p>
          </div>
        )}

        <Button type="submit" className="w-full h-12 text-base font-semibold mt-2" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</> : 'Enviar Cadastro'}
        </Button>
      </form>
    </AppLayout>
  );
}
