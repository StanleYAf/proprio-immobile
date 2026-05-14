import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Search, CheckCircle2, XCircle, Building2, Users } from 'lucide-react';

interface Record {
  id: string;
  tipo: string;
  acao: string;
  titulo: string;
  status: string;
  created_at: string;
}

export default function SearchRecords() {
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sent_records')
      .select('id, tipo, acao, titulo, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setRecords((data as Record[]) || []);
    setLoading(false);
  };

  const filtered = records.filter((r) =>
    r.titulo.toLowerCase().includes(query.toLowerCase()) ||
    r.tipo.toLowerCase().includes(query.toLowerCase()) ||
    r.acao.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AppLayout title="Buscar Registros">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título, tipo ou ação..."
          className="h-12 pl-10 bg-card"
        />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum registro encontrado</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="bg-card rounded-lg p-3 border border-border flex items-center gap-3">
              <div className="shrink-0">
                {r.tipo === 'imovel' ? <Building2 className="w-5 h-5 text-primary" /> : <Users className="w-5 h-5 text-accent" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.titulo}</p>
                <p className="text-xs text-muted-foreground capitalize">{r.acao} • {new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="shrink-0">
                {r.status === 'enviado' ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
