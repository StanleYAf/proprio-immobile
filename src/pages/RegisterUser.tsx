import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function RegisterUser() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail.includes('@')) {
      toast.error('Email inválido');
      return;
    }
    if (!nome.trim()) {
      toast.error('Informe o nome');
      return;
    }
    setAdding(true);
    const { error } = await supabase
      .from('allowed_users')
      .insert({ email: trimmedEmail, nome: nome.trim(), classificacao: 'standard' });
    setAdding(false);
    if (error) {
      if (error.code === '23505') {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Erro ao cadastrar usuário');
      }
      return;
    }
    toast.success('Usuário cadastrado com sucesso');
    setNome('');
    setEmail('');
  };

  return (
    <AppLayout title="Cadastrar Usuário">
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15, ease: 'easeOut' }}
        onSubmit={handleSubmit}
        className="bg-card rounded-xl p-4 shadow-sm border border-border/50 space-y-3"
      >
        <h3 className="font-semibold text-card-foreground flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Novo Usuário
        </h3>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="space-y-1.5">
          <Label className="text-xs">Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do corretor" className="h-10" disabled={adding} />
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="corretor@email.com" className="h-10" disabled={adding} />
        </motion.div>
        <p className="text-xs text-muted-foreground">O usuário será cadastrado como <strong>Standard</strong> por padrão.</p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Button type="submit" className="w-full h-10" disabled={adding}>
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar'}
          </Button>
        </motion.div>
      </motion.form>
    </AppLayout>
  );
}
