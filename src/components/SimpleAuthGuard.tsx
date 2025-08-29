
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { AuthService } from '@/services/authService';
import { toast } from "sonner";

interface SimpleAuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requiredRole?: 'admin' | 'supervisor' | 'analyst';
}

export const SimpleAuthGuard = ({ 
  children, 
  redirectTo = "/auth",
  requiredRole
}: SimpleAuthGuardProps) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(true);
  const location = useLocation();
  
  // Efeito simplificado para verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await AuthService.getCurrentSession();
        const isAuth = !!session;
        
        setIsAuthenticated(isAuth);
        
        // Para admin routes, assumir permissão se autenticado
        if (isAuth && requiredRole) {
          setUserRole('admin');
          setHasPermission(true);
        }
      } catch (error) {
        console.error("SimpleAuthGuard: Erro na verificação:", error);
        setIsAuthenticated(false);
        setHasPermission(false);
      } finally {
        setIsInitializing(false);
      }
    };
    
    checkAuth();
  }, [requiredRole]);

  // Mostrar spinner de carregamento durante inicialização
  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Verificar permissões baseadas em papel do usuário
  if (isAuthenticated && !hasPermission) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-background to-background/95 p-4">
        <div className="max-w-md bg-card p-8 rounded-xl shadow-lg border border-border animate-fade-in">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="bg-destructive/10 p-4 rounded-full">
              <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Acesso Restrito</h1>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página. Esta área requer privilégios 
              elevados ({requiredRole}) que não estão associados ao seu perfil ({userRole || 'desconhecido'}).
            </p>
            <div className="flex flex-col gap-2 w-full mt-4">
              <button 
                onClick={() => window.history.back()}
                className="w-full bg-primary/10 hover:bg-primary/20 text-primary py-2 px-4 rounded-md transition-colors"
              >
                Voltar
              </button>
              <button 
                onClick={() => window.location.href = '/auth'}
                className="w-full bg-muted/50 hover:bg-muted/80 text-muted-foreground py-2 px-4 rounded-md transition-colors"
              >
                Ir para a página de login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirecionar se não estiver autenticado
  if (!isAuthenticated) {
    // Salvar a URL atual para redirecionar de volta após o login
    sessionStorage.setItem('redirectAfterLogin', location.pathname);
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Renderizar filhos se estiver autenticado e tiver permissão
  return <>{children}</>;
};
