
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requiredRole?: 'admin' | 'supervisor' | 'analyst';
}

export const AuthGuard = ({ 
  children, 
  redirectTo = "/auth",
  requiredRole
}: AuthGuardProps) => {
  const { 
    isAuthenticated, 
    isLoading, 
    refreshAuthState, 
    isAdmin,
    isSupervisor,
    isAnalyst,
    userRole
  } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const [checkCount, setCheckCount] = useState(0);
  const [lastCheck, setLastCheck] = useState(Date.now());
  const location = useLocation();
  
  // Effect para gerenciar a verificação inicial de autenticação
  useEffect(() => {
    let isMounted = true;
    const timeoutIds: NodeJS.Timeout[] = [];
    
    const initAuth = async () => {
      try {
        console.log("AuthGuard: Realizando verificação inicial de autenticação");
        
        // Tentar restaurar o estado de autenticação do localStorage
        if (typeof window !== 'undefined') {
          const hasAuthToken = localStorage.getItem('urbanista-auth-token') || 
                              localStorage.getItem('supabase.auth.token');
          
          if (hasAuthToken) {
            console.log("AuthGuard: Token de autenticação encontrado no armazenamento");
          }
        }
        
        await refreshAuthState();
        
        if (isMounted) {
          setCheckCount(prev => prev + 1);
          setLastCheck(Date.now());
        }
      } catch (error) {
        console.error("AuthGuard: Erro durante verificação inicial de autenticação:", error);
        if (isMounted) {
          toast.error("Erro ao verificar autenticação. Tentando novamente...");
          
          // Agendar outra verificação em caso de falha
          const retryId = setTimeout(() => {
            if (checkCount < 3) {
              initAuth();
            } else {
              setIsInitializing(false);
            }
          }, 1500);
          
          timeoutIds.push(retryId);
        }
      } finally {
        // Definir um pequeno atraso para evitar flash do estado de carregamento
        if (isMounted) {
          const delayId = setTimeout(() => {
            setIsInitializing(false);
          }, 300);
          
          timeoutIds.push(delayId);
        }
      }
    };
    
    if (isInitializing) {
      initAuth();
    }
    
    // Verificações periódicas para reautenticação silenciosa
    const intervalId = setInterval(() => {
      // Revalidar sessão a cada 5 minutos
      if (Date.now() - lastCheck > 5 * 60 * 1000) {
        refreshAuthState();
        setLastCheck(Date.now());
      }
    }, 60 * 1000);
    
    return () => {
      isMounted = false;
      timeoutIds.forEach(id => clearTimeout(id));
      clearInterval(intervalId);
    };
  }, [refreshAuthState, isInitializing, checkCount, lastCheck]);

  // Adicionar um timeout para evitar carregamento infinito
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isInitializing) {
        console.log("AuthGuard: Tempo limite de inicialização atingido, prosseguindo com o estado de autenticação atual");
        setIsInitializing(false);
      }
    }, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [isInitializing]);

  // Verificar se o usuário tem o papel requerido
  const hasRequiredRole = () => {
    if (!requiredRole) return true;
    
    switch (requiredRole) {
      case 'admin':
        return isAdmin;
      case 'supervisor':
        return isSupervisor;
      case 'analyst':
        return isAnalyst;
      default:
        return true;
    }
  };

  // Se ainda estiver inicializando, mas já verificou pelo menos uma vez, não mostrar o spinner de carregamento
  if (isInitializing && checkCount === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-background to-background/95">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-foreground font-medium">Verificando autenticação...</p>
            <p className="text-muted-foreground text-sm mt-1">Por favor, aguarde</p>
          </div>
        </div>
      </div>
    );
  }

  // Após a inicialização, basear decisões no estado atual de autenticação
  if (!isAuthenticated) {
    console.log(`AuthGuard: Usuário não autenticado, redirecionando de ${location.pathname} para ${redirectTo}`);
    
    // Salvar a URL atual para redirecionar de volta após o login
    sessionStorage.setItem('redirectAfterLogin', location.pathname);
    
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Verificar permissões baseadas em papel do usuário
  if (!hasRequiredRole()) {
    console.log(`AuthGuard: Usuário não tem o papel requerido (${requiredRole}), acesso negado`);
    
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

  console.log("AuthGuard: Acesso concedido");
  return <>{children}</>;
};
