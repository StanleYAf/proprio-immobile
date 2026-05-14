import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [userName, setUserName] = useState('');
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated (but not during success animation)
  useEffect(() => {
    if (isAuthenticated && !authLoading && !showSuccess) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, showSuccess, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      toast.error('Email inválido');
      return;
    }
    setLoading(true);
    const result = await login(email);
    if (result.success) {
      const stored = localStorage.getItem('imob_user');
      if (stored) {
        try { setUserName(JSON.parse(stored).name); } catch { /* */ }
      }
      setShowSuccess(true);
      // Don't navigate yet - let animation play fully
    } else {
      setLoading(false);
      toast.error(result.error || 'Erro ao fazer login');
    }
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6 overflow-hidden relative">
      <AnimatePresence mode="wait">
        {showSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-primary flex flex-col items-center justify-center z-50"
          >
            {/* Ripple circles */}
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute w-20 h-20 rounded-full border-2 border-primary-foreground/20"
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 14, opacity: 0 }}
                transition={{
                  duration: 2.5,
                  delay: i * 0.4,
                  ease: 'easeOut',
                }}
              />
            ))}

            {/* Check icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.3 }}
              className="relative z-10 w-24 h-24 rounded-full bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center mb-8 border border-primary-foreground/20"
            >
              <motion.svg
                viewBox="0 0 24 24"
                className="w-12 h-12 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path
                  d="M5 13l4 4L19 7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.7, delay: 0.7, ease: 'easeOut' }}
                />
              </motion.svg>
            </motion.div>

            {/* Welcome text */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="text-2xl font-bold text-primary-foreground tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Bem-vindo{userName ? `, ${userName}` : ''}!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 0.4 }}
              className="text-sm text-primary-foreground/50 mt-2"
            >
              Preparando seu painel...
            </motion.p>

            {/* Loading bar */}
            <motion.div
              className="mt-10 w-52 h-1.5 rounded-full bg-primary-foreground/10 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              <motion.div
                className="h-full bg-primary-foreground/40 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, delay: 1.5, ease: 'easeInOut' }}
                onAnimationComplete={() => navigate('/')}
              />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm"
          >
            {/* Branding */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-center mb-10"
            >
              <h1 className="text-3xl font-bold text-primary-foreground tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                Montreal
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-xs uppercase tracking-[0.3em] text-primary-foreground/50 mt-1.5 font-medium"
              >
                Imobiliária
              </motion.p>
            </motion.div>

            {/* Login Card */}
            <motion.form
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
              onSubmit={handleSubmit}
              className="bg-card rounded-2xl p-6 shadow-xl space-y-5 border border-border/50"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center mb-1"
              >
                <h2 className="text-lg font-semibold text-card-foreground">Bem-vindo</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Informe seu email para acessar</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-1.5"
              >
                <Label htmlFor="email" className="text-sm font-medium text-card-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="corretor@email.com"
                    className="h-12 pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button type="submit" className="w-full h-12 text-base font-semibold relative overflow-hidden" disabled={loading}>
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                      >
                        <motion.div
                          className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                        Verificando...
                      </motion.div>
                    ) : (
                      <motion.span
                        key="text"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                      >
                        Entrar
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </motion.form>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center text-xs text-primary-foreground/30 mt-8"
            >
              Acesso restrito a usuários autorizados
            </motion.p>

            {/* Credits */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="mt-10 text-center"
            >
              <motion.div
                className="inline-block"
                whileHover={{ scale: 1.05 }}
              >
                <div className="border border-primary-foreground/10 rounded-xl px-5 py-3 backdrop-blur-sm bg-primary-foreground/5">
                  <p className="text-[11px] font-semibold text-primary-foreground/50 tracking-wider uppercase">
                    Desenvolvido por
                  </p>
                  <p className="text-sm font-bold text-primary-foreground/70 mt-0.5 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Stanley Tiago
                  </p>
                  <div className="w-8 h-px bg-primary-foreground/20 mx-auto my-1.5" />
                  <p className="text-[10px] text-primary-foreground/30 font-medium">
                    Software Solutions
                  </p>
                  <p className="text-[9px] text-primary-foreground/20 mt-0.5">
                    Poços de Caldas — MG · Todos os direitos reservados
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
