import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import FormField from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { sendToWebhook } from '@/lib/webhook';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function RegisterClient() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', interesse: '' });
  const update = (name: string, value: string) => setForm((p) => ({ ...p, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.telefone) { toast.error('Preencha nome e telefone'); return; }
    setLoading(true);
    const res = await sendToWebhook({
      tipo: 'cliente', acao: 'cadastrar',
      usuario: { email: user!.email, name: user!.name },
      dados: form,
    });
    setLoading(false);
    if (res.success) {
      toast.success('Cliente cadastrado com sucesso!');
      setForm({ nome: '', telefone: '', email: '', interesse: '' });
    } else {
      toast.error(res.error || 'Erro ao enviar');
    }
  };

  return (
    <AppLayout title="Cadastrar Cliente">
      <form onSubmit={handleSubmit} className="space-y-3">
        <FormField label="Nome" name="nome" value={form.nome} onChange={update} required placeholder="Nome completo" />
        <FormField label="Telefone" name="telefone" value={form.telefone} onChange={update} required placeholder="(11) 99999-0000" />
        <FormField label="Email" name="email" value={form.email} onChange={update} type="email" placeholder="cliente@email.com" />
        <FormField label="Interesse" name="interesse" value={form.interesse} onChange={update} multiline placeholder="Tipo de imóvel, região, faixa de preço..." />
        <Button type="submit" className="w-full h-12 text-base font-semibold mt-2" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</> : 'Enviar Cadastro'}
        </Button>
      </form>
    </AppLayout>
  );
}
