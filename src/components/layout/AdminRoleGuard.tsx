import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

interface AdminRoleGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const AdminRoleGuard = ({ 
  children, 
  redirectTo = "/chat" 
}: AdminRoleGuardProps) => {
  const { isAdmin, isLoading, userRole, isAuthenticated } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const location = useLocation();
  
  // Simplificado - apenas aguarda o contexto de auth estar pronto
  useEffect(() => {
    if (!isLoading) {
      setIsInitializing(false);
    }
  }, [isLoading]);
  
  // Log para debugging
  useEffect(() => {
    console.log("AdminRoleGuard: Estado atual", { 
      isAdmin, 
      userRole,
      isAuthenticated,
      isLoading,
      isInitializing,
      path: location.pathname
    });
  }, [isAdmin, userRole, isAuthenticated, isLoading, isInitializing, location.pathname]);
  
  // Loading enquanto inicializa ou carrega auth
  if (isInitializing || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }
  
  // Redirecionar se não autenticado
  if (!isAuthenticated) {
    console.log("AdminRoleGuard: Usuário não autenticado, redirecionando para /auth");
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  
  // Verificar se é admin
  if (!isAdmin) {
    console.log("AdminRoleGuard: Acesso negado - usuário não é admin", {
      userRole,
      isAdmin,
      path: location.pathname
    });
    
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-background to-background/95 p-4">
        <div className="max-w-md bg-card p-8 rounded-xl shadow-lg border border-border">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="bg-destructive/10 p-4 rounded-full">
              <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Acesso Restrito</h1>
            <p className="text-muted-foreground">
              Esta área é restrita a administradores. Seu perfil atual ({userRole || 'desconhecido'}) 
              não possui as permissões necessárias.
            </p>
            <div className="flex flex-col gap-2 w-full mt-4">
              <button 
                onClick={() => window.history.back()}
                className="w-full bg-primary/10 hover:bg-primary/20 text-primary py-2 px-4 rounded-md transition-colors"
              >
                Voltar
              </button>
              <button 
                onClick={() => window.location.href = '/chat'}
                className="w-full bg-muted/50 hover:bg-muted/80 text-muted-foreground py-2 px-4 rounded-md transition-colors"
              >
                Ir para o Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log("AdminRoleGuard: Acesso permitido");
  return <>{children}</>;
};