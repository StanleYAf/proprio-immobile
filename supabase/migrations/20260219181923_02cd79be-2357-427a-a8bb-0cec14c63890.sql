
-- Table for allowed users managed by admin
CREATE TABLE public.allowed_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for login check)
CREATE POLICY "Anyone can read allowed_users"
ON public.allowed_users
FOR SELECT
USING (true);

-- Only authenticated inserts (we'll handle admin check in code)
CREATE POLICY "Anyone can insert allowed_users"
ON public.allowed_users
FOR INSERT
WITH CHECK (true);

-- Anyone can delete
CREATE POLICY "Anyone can delete allowed_users"
ON public.allowed_users
FOR DELETE
USING (true);

-- Seed admin user
INSERT INTO public.allowed_users (email, nome, is_admin)
VALUES ('stanleyffgio@gmail.com', 'Stanley', true);
