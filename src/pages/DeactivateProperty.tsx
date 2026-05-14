import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import FormField from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { sendToWebhook } from '@/lib/webhook';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function DeactivateProperty() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ codigo: '', motivo: '' });
  const update = (name: string, value: string) => setForm((p) => ({ ...p, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo) { toast.error('Informe o código do imóvel'); return; }
    setLoading(true);
    const res = await sendToWebhook({
      tipo: 'imovel', acao: 'desativar',
      usuario: { email: user!.email, name: user!.name },
      dados: form,
    });
    setLoading(false);
    if (res.success) {
      toast.success('Solicitação enviada com sucesso!');
      setForm({ codigo: '', motivo: '' });
    } else {
      toast.error(res.error || 'Erro ao enviar');
    }
  };

  return (
    <AppLayout title="Desativar Imóvel">
      <form onSubmit={handleSubmit} className="space-y-3">
        <FormField label="Código do Imóvel" name="codigo" value={form.codigo} onChange={update} required placeholder="Ex: IMV-0042" />
        <FormField label="Motivo da Desativação" name="motivo" value={form.motivo} onChange={update} multiline placeholder="Por que desativar?" />
        <Button type="submit" className="w-full h-12 text-base font-semibold mt-2" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</> : 'Enviar Desativação'}
        </Button>
      </form>
    </AppLayout>
  );
}
