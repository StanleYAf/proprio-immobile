import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  email: string;
  name: string;
  isAdmin: boolean;
  classificacao: 'master' | 'stand1' | 'standard';
}

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('imob_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // Re-validate from database to get latest data
        supabase
          .from('allowed_users')
          .select('email, nome, is_admin, classificacao')
          .eq('email', parsed.email)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              const updated: User = {
                email: data.email,
                name: data.nome || data.email.split('@')[0],
                isAdmin: data.is_admin,
                classificacao: (data.classificacao as 'master' | 'stand1' | 'standard') || 'standard',
              };
              setUser(updated);
              localStorage.setItem('imob_user', JSON.stringify(updated));
            } else {
              // User removed from allowed list
              setUser(null);
              localStorage.removeItem('imob_user');
            }
            setLoading(false);
          });
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!email) return { success: false, error: 'Preencha o email' };

    // Check if email is in allowed_users
    const { data, error } = await supabase
      .from('allowed_users')
      .select('email, nome, is_admin, classificacao')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) return { success: false, error: 'Erro ao verificar acesso' };
    if (!data) return { success: false, error: 'Acesso não autorizado. Contate o administrador.' };

    const u: User = { email: data.email, name: data.nome || data.email.split('@')[0], isAdmin: data.is_admin, classificacao: (data.classificacao as 'master' | 'stand1' | 'standard') || 'standard' };
    setUser(u);
    localStorage.setItem('imob_user', JSON.stringify(u));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('imob_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
