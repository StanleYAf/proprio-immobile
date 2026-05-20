import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "./pages/Login";
import Index from "./pages/Index";
import RegisterProperty from "./pages/RegisterProperty";
import ListaImoveis from "./pages/ListaImoveis";
import DeactivateProperty from "./pages/DeactivateProperty";
import AuditLogs from "./pages/AuditLogs";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import RegisterUser from "./pages/RegisterUser";
import { ReactNode } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminOrMasterRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.isAdmin && user?.classificacao !== 'master') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function MasterRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.classificacao !== 'master' && !user?.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function CanRegisterUsersRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.classificacao !== 'master' && user?.classificacao !== 'stand1' && !user?.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/imovel/cadastrar" element={<ProtectedRoute><RegisterProperty /></ProtectedRoute>} />
    <Route path="/imoveis" element={<ProtectedRoute><ListaImoveis /></ProtectedRoute>} />
    <Route path="/imovel/desativar" element={<ProtectedRoute><DeactivateProperty /></ProtectedRoute>} />
    <Route path="/admin" element={<AdminOrMasterRoute><AdminPanel /></AdminOrMasterRoute>} />
    <Route path="/logs" element={<MasterRoute><AuditLogs /></MasterRoute>} />
    <Route path="/usuarios/cadastrar" element={<CanRegisterUsersRoute><RegisterUser /></CanRegisterUsersRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
