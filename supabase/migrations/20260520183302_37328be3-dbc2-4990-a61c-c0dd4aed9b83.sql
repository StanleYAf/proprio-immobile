
CREATE TABLE public.imoveis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE,
  tipo TEXT,
  finalidade TEXT,
  destinacao TEXT[],
  status TEXT DEFAULT 'ativo',
  valor NUMERIC,
  condominio NUMERIC,
  iptu NUMERIC,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  area_interna NUMERIC,
  area_externa NUMERIC,
  area_lote NUMERIC,
  quartos INTEGER,
  suites INTEGER,
  banheiros INTEGER,
  vagas INTEGER,
  tipo_vaga TEXT,
  andar INTEGER,
  salas INTEGER,
  varandas INTEGER,
  descricao TEXT,
  lazer TEXT[],
  financiamento TEXT,
  nome_proprietario TEXT,
  telefone_proprietario TEXT,
  corretor_email TEXT,
  fotos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.imoveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can select imoveis" ON public.imoveis FOR SELECT USING (true);
CREATE POLICY "Anyone can insert imoveis" ON public.imoveis FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update imoveis" ON public.imoveis FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete imoveis" ON public.imoveis FOR DELETE USING (true);

CREATE TABLE public.clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf TEXT,
  profissao TEXT,
  renda NUMERIC,
  estado_civil TEXT,
  observacoes TEXT,
  origem TEXT,
  corretor_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can select clientes" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert clientes" ON public.clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update clientes" ON public.clientes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete clientes" ON public.clientes FOR DELETE USING (true);

CREATE TABLE public.atendimentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id),
  corretor_email TEXT,
  status TEXT DEFAULT 'novo',
  etapa TEXT DEFAULT 'contato',
  finalidade_interesse TEXT,
  tipo_interesse TEXT[],
  bairros_interesse TEXT[],
  cidade_interesse TEXT,
  valor_min NUMERIC,
  valor_max NUMERIC,
  quartos_min INTEGER,
  vagas_min INTEGER,
  area_min NUMERIC,
  imovel_origem_id UUID REFERENCES public.imoveis(id),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can select atendimentos" ON public.atendimentos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert atendimentos" ON public.atendimentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update atendimentos" ON public.atendimentos FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete atendimentos" ON public.atendimentos FOR DELETE USING (true);

CREATE TABLE public.atendimento_historico (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  atendimento_id UUID REFERENCES public.atendimentos(id) ON DELETE CASCADE,
  corretor_email TEXT,
  tipo TEXT,
  conteudo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.atendimento_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can select historico" ON public.atendimento_historico FOR SELECT USING (true);
CREATE POLICY "Anyone can insert historico" ON public.atendimento_historico FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update historico" ON public.atendimento_historico FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete historico" ON public.atendimento_historico FOR DELETE USING (true);

CREATE TABLE public.atendimento_imoveis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  atendimento_id UUID REFERENCES public.atendimentos(id) ON DELETE CASCADE,
  imovel_id UUID REFERENCES public.imoveis(id),
  status TEXT DEFAULT 'sugerido',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.atendimento_imoveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can select atend_imoveis" ON public.atendimento_imoveis FOR SELECT USING (true);
CREATE POLICY "Anyone can insert atend_imoveis" ON public.atendimento_imoveis FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update atend_imoveis" ON public.atendimento_imoveis FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete atend_imoveis" ON public.atendimento_imoveis FOR DELETE USING (true);
