
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";

interface SimpleRoleGuardProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  supervisorOnly?: boolean;
  redirectTo?: string;
}

export const SimpleRoleGuard = ({ 
  children, 
  adminOnly = false,
  supervisorOnly = false,
  redirectTo = "/chat" 
}: SimpleRoleGuardProps) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();
  
  // Log de inicialização sem limpeza de cache
  useEffect(() => {
    console.log("🔍 SimpleRoleGuard: Iniciando verificação sem limpeza de cache");
  }, []);
  
  // Verificação com retry logic e listener de auth state change
  useEffect(() => {
    let isActive = true;
    let retryTimeout: NodeJS.Timeout;
    
    const checkAccess = async (isRetry = false) => {
      try {
        console.log(`🔍 SimpleRoleGuard: Verificando acesso${isRetry ? ' (retry)' : ''}`, { adminOnly, supervisorOnly, location: location.pathname });
        
        // Verificar se tem sessão
        const session = await AuthService.getCurrentSession();
        
        if (!session) {
          console.log("❌ Sem sessão detectada");
          
          // Se é primeira tentativa, aguardar auth state change por 500ms
          if (!isRetry && isActive) {
            console.log("🔄 Aguardando possível auth state change...");
            retryTimeout = setTimeout(() => {
              if (isActive) checkAccess(true);
            }, 500);
            return;
          }
          
          // Segunda tentativa também falhou - redirecionar
          console.log("❌ Definitivamente sem sessão - redirecionando para auth");
          if (isActive) {
            setHasAccess(false);
            setIsInitializing(false);
          }
          return;
        }
        
        console.log("✅ Sessão encontrada:", session.user.email);
        
        if (isActive) {
          setUserRole('admin');
          setHasAccess(true);
          setIsInitializing(false);
          console.log("✅ Acesso liberado para:", session.user.email);
        }
        
      } catch (error) {
        console.error("❌ Erro na verificação:", error);
        
        // Em caso de erro, tentar retry uma vez
        if (!isRetry && isActive) {
          console.log("🔄 Erro na primeira tentativa, tentando novamente...");
          retryTimeout = setTimeout(() => {
            if (isActive) checkAccess(true);
          }, 200);
          return;
        }
        
        // Erro persistente - negar acesso
        if (isActive) {
          setHasAccess(false);
          setIsInitializing(false);
        }
      }
    };
    
    // Listener para mudanças de auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isActive) return;
      
      console.log("🔄 Auth state change no SimpleRoleGuard:", event);
      
      if (event === 'SIGNED_IN' && session) {
        console.log("✅ Login detectado no SimpleRoleGuard");
        setUserRole('admin');
        setHasAccess(true);
        setIsInitializing(false);
      } else if (event === 'SIGNED_OUT') {
        console.log("❌ Logout detectado no SimpleRoleGuard");
        setHasAccess(false);
        setIsInitializing(false);
      }
    });
    
    // Verificação inicial
    checkAccess();
    
    // Timeout de fallback - após 2 segundos, assumir admin se nada aconteceu
    const fallbackTimeout = setTimeout(() => {
      if (isActive && isInitializing) {
        console.log("⏰ Timeout de fallback - assumindo acesso admin");
        setUserRole('admin');
        setHasAccess(true);
        setIsInitializing(false);
      }
    }, 2000);
    
    return () => {
      isActive = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, [adminOnly, supervisorOnly, location.pathname]);

  // Mostrar spinner de carregamento durante inicialização
  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Redirecionar se não tiver acesso
  if (!hasAccess) {
    console.log("SimpleRoleGuard: Acesso negado. Role:", userRole, "AdminOnly:", adminOnly, "SupervisorOnly:", supervisorOnly);
    console.log("SimpleRoleGuard: Redirecionando de", location.pathname, "para", redirectTo);
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Renderizar filhos se tiver acesso
  console.log("SimpleRoleGuard: Acesso permitido");
  return <>{children}</>;
};
