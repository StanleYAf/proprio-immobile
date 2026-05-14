import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, UserPlus, Loader2, Shield, User, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface AllowedUser {
  id: string;
  email: string;
  nome: string;
  is_admin: boolean;
  classificacao: string;
  created_at: string;
}

export default function AdminPanel() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.isAdmin;
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newClassificacao, setNewClassificacao] = useState('standard');
  const [adding, setAdding] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('allowed_users')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      toast.error('Erro ao carregar usuários');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.toLowerCase().trim();
    if (!email.includes('@')) {
      toast.error('Email inválido');
      return;
    }
    if (!newNome.trim()) {
      toast.error('Informe o nome');
      return;
    }
    setAdding(true);
    const { error } = await supabase
      .from('allowed_users')
      .insert({ email, nome: newNome.trim(), classificacao: newClassificacao });
    setAdding(false);
    if (error) {
      if (error.code === '23505') {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Erro ao adicionar usuário');
      }
      return;
    }
    toast.success('Acesso criado com sucesso');
    setNewEmail('');
    setNewNome('');
    setNewClassificacao('standard');
    fetchUsers();
  };

  const handleDelete = async (user: AllowedUser) => {
    if (user.is_admin) {
      toast.error('Não é possível remover o administrador');
      return;
    }
    // Master users can't delete other masters
    if (!isAdmin && user.classificacao === 'master') {
      toast.error('Apenas o administrador pode remover um Master');
      return;
    }
    const { error } = await supabase
      .from('allowed_users')
      .delete()
      .eq('id', user.id);
    if (error) {
      toast.error('Erro ao remover acesso');
      return;
    }
    toast.success(`Acesso de ${user.nome || user.email} removido`);
    fetchUsers();
  };

  const handleUpdateClassificacao = async (user: AllowedUser, classificacao: string) => {
    // Master users can't promote to master or change other masters
    if (!isAdmin && (classificacao === 'master' || user.classificacao === 'master')) {
      toast.error('Apenas o administrador pode alterar a classificação Master');
      return;
    }
    const { error } = await supabase
      .from('allowed_users')
      .update({ classificacao })
      .eq('id', user.id);
    if (error) {
      toast.error('Erro ao atualizar classificação');
      return;
    }
    const labels: Record<string, string> = { master: 'Master', stand1: 'Stand 1', standard: 'Standard' };
    toast.success(`${user.nome || user.email} atualizado para ${labels[classificacao] || classificacao}`);
    fetchUsers();
  };

  // Classification options available based on current user role
  const classOptions = isAdmin
    ? [{ value: 'standard', label: 'Standard' }, { value: 'stand1', label: 'Stand 1' }, { value: 'master', label: 'Master' }]
    : [{ value: 'standard', label: 'Standard' }, { value: 'stand1', label: 'Stand 1' }];

  const canEditUser = (u: AllowedUser) => {
    if (u.is_admin) return false;
    if (!isAdmin && u.classificacao === 'master') return false;
    return true;
  };

  return (
    <AppLayout title="Gerenciar Acessos">
      {/* Add user form */}
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        onSubmit={handleAdd}
        className="bg-card rounded-2xl p-5 shadow-sm border border-border/50 mb-6 space-y-4"
      >
        <h3 className="font-bold text-card-foreground flex items-center gap-2 text-base">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-primary" />
          </div>
          Novo Acesso
        </h3>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Nome</Label>
          <Input
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            placeholder="Nome do corretor"
            className="h-11"
            disabled={adding}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Email</Label>
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="corretor@email.com"
            className="h-11"
            disabled={adding}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Classificação</Label>
          <Select value={newClassificacao} onValueChange={setNewClassificacao} disabled={adding}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={adding}>
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
        </Button>
      </motion.form>

      {/* Users list */}
      <div className="space-y-2">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-bold text-foreground text-sm mb-3 flex items-center justify-between"
        >
          <span>Usuários com acesso</span>
          <Badge variant="secondary" className="text-xs font-medium">{users.length}</Badge>
        </motion.h3>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl p-4 shadow-sm border border-border/50 flex items-center gap-3"
              >
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="w-8 h-8 rounded-md" />
              </motion.div>
            ))}
          </div>
        ) : (
          users.map((u, i) => {
            const isMaster = u.classificacao === 'master';
            const isStand1 = u.classificacao === 'stand1';
            const borderColor = u.is_admin
              ? 'border-accent/40'
              : isMaster
              ? 'border-amber-400/50'
              : isStand1
              ? 'border-blue-400/50'
              : 'border-border/50';
            const iconBg = u.is_admin
              ? 'bg-accent/20 text-accent'
              : isMaster
              ? 'bg-amber-100 text-amber-600'
              : isStand1
              ? 'bg-blue-100 text-blue-600'
              : 'bg-muted text-muted-foreground';
            const editable = canEditUser(u);

            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.3 }}
                className={`bg-card rounded-2xl p-4 shadow-sm border ${borderColor} space-y-3`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                      {u.is_admin ? <Shield className="w-4 h-4" /> : isMaster ? <Crown className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-sm text-card-foreground truncate">
                          {u.nome || u.email.split('@')[0]}
                        </p>
                        {u.is_admin && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-accent text-accent font-bold shrink-0">ADMIN</Badge>}
                        {!u.is_admin && isMaster && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600 font-bold shrink-0">MASTER</Badge>}
                        {!u.is_admin && isStand1 && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-400 text-blue-600 font-bold shrink-0">STAND 1</Badge>}
                        {!u.is_admin && !isMaster && !isStand1 && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground shrink-0">STANDARD</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                    </div>
                  </div>
                  {editable && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:bg-destructive/10 w-9 h-9"
                      onClick={() => handleDelete(u)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {editable && (
                  <div className="pl-[52px]">
                    <Select value={u.classificacao} onValueChange={(v) => handleUpdateClassificacao(u, v)}>
                      <SelectTrigger className={`h-9 text-xs w-full max-w-[160px] ${isMaster ? 'border-amber-400/50 text-amber-600 font-semibold' : isStand1 ? 'border-blue-400/50 text-blue-600 font-semibold' : ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {classOptions.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </AppLayout>
  );
}
