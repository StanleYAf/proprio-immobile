
-- Table to store sent records for search functionality
CREATE TABLE public.sent_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('imovel', 'cliente')),
  acao TEXT NOT NULL CHECK (acao IN ('cadastrar', 'desativar')),
  titulo TEXT NOT NULL,
  dados JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'erro')),
  usuario_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sent_records ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (we use local auth, no supabase auth)
CREATE POLICY "Anyone can insert records" ON public.sent_records FOR INSERT WITH CHECK (true);

-- Anyone can read records
CREATE POLICY "Anyone can read records" ON public.sent_records FOR SELECT USING (true);
