
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
  
  // Efeito melhorado para verificar autenticação com melhor persistência e timeout para mobile
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkAuth = async () => {
      try {
        console.log("🔍 SimpleRoleGuard: Iniciando verificação sem limpeza de cache");
        console.log("🔍 SimpleRoleGuard: Verificando acesso", {
          adminOnly: requiredRole === 'admin',
          supervisorOnly: requiredRole === 'supervisor',
          location: location.pathname
        });

        // Verificar cache de role no sessionStorage primeiro
        const cachedRole = sessionStorage.getItem('urbanista-user-role');
        
        const session = await AuthService.getCurrentSession();
        const isAuth = !!session;
        
        console.log(isAuth ? "✅ Sessão encontrada:" : "❌ Nenhuma sessão encontrada", session?.user?.email);
        
        setIsAuthenticated(isAuth);
        
        if (isAuth && session?.user) {
          // Se tem role em cache, usar primeiro para resposta rápida
          if (cachedRole && requiredRole) {
            console.log("🔄 Usando role do cache:", cachedRole);
            setUserRole(cachedRole);
            
            const hasAccess = (requiredRole === 'admin' && cachedRole === 'admin') || 
                             (requiredRole === 'supervisor' && (cachedRole === 'supervisor' || cachedRole === 'admin')) || 
                             (requiredRole === 'analyst' && (cachedRole === 'analyst' || cachedRole === 'supervisor' || cachedRole === 'admin')) ||
                             (!requiredRole);
                             
            setHasPermission(hasAccess);
            
            if (hasAccess) {
              console.log("✅ Acesso permitido via cache");
              setIsInitializing(false);
              return;
            }
          }
          
          // Buscar role real do usuário de forma assíncrona
          try {
            const realRole = await AuthService.getUserRole(session.user.id);
            console.log("🔍 Role real do usuário:", realRole);
            
            setUserRole(realRole);
            
            if (realRole) {
              // Atualizar cache
              sessionStorage.setItem('urbanista-user-role', realRole);
              
              const hasAccess = (requiredRole === 'admin' && realRole === 'admin') || 
                               (requiredRole === 'supervisor' && (realRole === 'supervisor' || realRole === 'admin')) || 
                               (requiredRole === 'analyst' && (realRole === 'analyst' || realRole === 'supervisor' || realRole === 'admin')) ||
                               (!requiredRole);
                               
              setHasPermission(hasAccess);
              console.log("✅ Verificação completa - Role:", realRole, "Acesso:", hasAccess);
            }
          } catch (roleError) {
            console.error("Erro ao buscar role:", roleError);
            // Em caso de erro, usar cache se disponível
            if (cachedRole) {
              setUserRole(cachedRole);
              const hasAccess = (requiredRole === 'admin' && cachedRole === 'admin') || 
                               (requiredRole === 'supervisor' && (cachedRole === 'supervisor' || cachedRole === 'admin')) || 
                               (!requiredRole);
              setHasPermission(hasAccess);
            } else {
              setHasPermission(false);
            }
          }
        } else {
          setUserRole(null);
          setHasPermission(false);
        }
      } catch (error) {
        console.error("SimpleAuthGuard: Erro na verificação:", error);
        setIsAuthenticated(false);
        setHasPermission(false);
      } finally {
        setIsInitializing(false);
      }
    };
    
    // Timeout de segurança para mobile (10 segundos)
    timeoutId = setTimeout(() => {
      console.warn("⚠️ SimpleAuthGuard: Timeout na verificação - forçando finalização");
      setIsInitializing(false);
      
      // Se ainda não autenticou após timeout, redirecionar
      setIsAuthenticated(false);
    }, 10000);
    
    checkAuth();
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [requiredRole, location.pathname]);

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
