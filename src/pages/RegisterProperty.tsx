import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FormField from '@/components/FormField';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { sendToWebhook } from '@/lib/webhook';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ImagePlus, X } from 'lucide-react';

const parseBRL = (v: string): number | null => {
  if (!v) return null;
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
};
const PG_INT_MAX = 2147483647;
const parseInt10 = (v: string): number | null => {
  if (!v) return null;
  const n = parseInt(v.replace(/\D/g, ''), 10);
  if (isNaN(n)) return null;
  return Math.min(n, PG_INT_MAX);
};

export default function RegisterProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cep, setCep] = useState('');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [photos, setPhotos] = useState<File[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
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

  const handlePhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 20 - photos.length;
    const arr = Array.from(files).slice(0, remaining).filter((f) => {
      if (!f.type.startsWith('image/')) {
        toast.error(`"${f.name}" não é uma imagem`);
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`"${f.name}" excede 10MB`);
        return false;
      }
      return true;
    });
    setPhotos((p) => [...p, ...arr]);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const removePhoto = (idx: number) => setPhotos((p) => p.filter((_, i) => i !== idx));

  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);

  const generateCodigo = async (): Promise<string> => {
    const { count, error } = await supabase
      .from('imoveis')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    const next = (count ?? 0) + 1;
    return `IMV-${String(next).padStart(4, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tipo || !form.valor || !form.finalidade || (!destinacao.comercial && !destinacao.residencial) || !cep || !form.endereco || !form.numero || !form.bairro || !form.cidade || !form.estado || !form.nome_proprietario || !form.telefone_proprietario || !form.descricao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setLoading(true);
    try {
      const codigo = await generateCodigo();
      const destinacaoArr = [
        destinacao.comercial && 'comercial',
        destinacao.residencial && 'residencial',
      ].filter(Boolean) as string[];
      const lazerArr = Object.keys(lazer).filter((k) => lazer[k]);

      const payload = {
        codigo,
        tipo: form.tipo,
        finalidade: form.finalidade,
        destinacao: destinacaoArr,
        status,
        valor: parseBRL(form.valor),
        condominio: parseBRL(form.condominio),
        iptu: parseBRL(form.iptu),
        cep,
        endereco: form.endereco,
        numero: form.numero,
        complemento: form.complemento || null,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
        area_interna: parseBRL(form.area_interna),
        area_externa: parseBRL(form.area_externa),
        area_lote: parseBRL(form.area_lote),
        quartos: parseInt10(form.quartos),
        suites: parseInt10(form.suites),
        banheiros: parseInt10(form.banheiros),
        vagas: parseInt10(form.vagas_garagem),
        tipo_vaga: form.tipo_vaga || null,
        andar: parseInt10(form.andar),
        salas: parseInt10(form.salas),
        varandas: parseInt10(form.varandas),
        descricao: form.descricao,
        lazer: lazerArr,
        financiamento: financiamento || null,
        nome_proprietario: form.nome_proprietario,
        telefone_proprietario: form.telefone_proprietario,
        corretor_email: user?.email ?? null,
        fotos: [] as string[],
      };

      const { data: inserted, error: insertError } = await supabase
        .from('imoveis')
        .insert(payload)
        .select('id')
        .single();
      if (insertError) throw insertError;
      const imovelId = inserted.id;

      // Upload photos
      const fotosUrls: string[] = [];
      for (const file of photos) {
        const ts = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${imovelId}/${ts}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from('property-images')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (upErr) {
          toast.error(`Falha ao enviar ${file.name}`);
          continue;
        }
        const { data: pub } = supabase.storage.from('property-images').getPublicUrl(path);
        fotosUrls.push(pub.publicUrl);
      }

      if (fotosUrls.length > 0) {
        await supabase.from('imoveis').update({ fotos: fotosUrls }).eq('id', imovelId);
      }

      // Webhook (best-effort)
      const res = await sendToWebhook({
        tipo: 'imovel', acao: 'cadastrar',
        usuario: { email: user!.email, name: user!.name },
        dados: { ...form, cep, codigo, status, destinacao: destinacaoArr, lazer: lazerArr, aceita_financiamento: financiamento, titulo: tituloGerado, fotos: fotosUrls, imovel_id: imovelId },
      });

      const resData = (res.data as Record<string, unknown> | undefined) ?? {};
      const codigoImoview =
        (resData.codigo_imovel as string | number | undefined) ??
        (resData.codigo as string | number | undefined) ??
        (resData.code as string | number | undefined);

      if (codigoImoview && imovelId) {
        await supabase
          .from('imoveis')
          .update({ codigo: String(codigoImoview) })
          .eq('id', imovelId);
      }

      toast.success(`Imóvel ${codigoImoview || codigo} cadastrado!`);
      navigate(`/imoveis/${imovelId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar imóvel';
      toast.error(msg);
    } finally {
      setLoading(false);
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

        <div className="space-y-1">
          <Label className="text-sm font-medium text-foreground">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as 'ativo' | 'inativo')}>
            <SelectTrigger className="w-full h-11 rounded-xl bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
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

        <div className="space-y-2">
          <Label className="text-sm font-bold text-foreground uppercase">Fotos do Imóvel</Label>
          <div className="grid grid-cols-3 gap-2">
            {previews.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {photos.length < 20 && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-xs">Adicionar</span>
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotosSelected}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground">{photos.length}/20 fotos • Máx 10MB cada</p>
        </div>

        {tituloGerado && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-1">
            <Label className="text-xs font-semibold text-accent uppercase tracking-wide">Título gerado</Label>
            <p className="text-sm font-medium text-foreground leading-snug">{tituloGerado}</p>
          </div>
        )}

        <Button type="submit" className="w-full h-12 text-base font-semibold mt-2" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</> : 'Enviar Cadastro'}
        </Button>
      </form>
    </AppLayout>
  );
}
