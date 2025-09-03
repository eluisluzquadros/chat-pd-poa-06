
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
        
        // Buscar role real do usuário com retry em caso de inconsistência
        let realRole = await AuthService.getUserRole(session.user.id);
        console.log("🔍 Role real do usuário:", realRole);
        
        // Se role é 'user' ou 'citizen' mas usuário é admin conhecido, fazer retry
        if ((realRole === 'user' || realRole === 'citizen') && 
            session.user.email === 'admin@chat-pd-poa.org') {
          console.log("🔄 Inconsistência detectada para admin - limpando cache e tentando novamente");
          AuthService.clearAuthCache();
          
          // Aguardar um pouco e tentar novamente
          await new Promise(resolve => setTimeout(resolve, 100));
          realRole = await AuthService.getUserRole(session.user.id);
          console.log("🔍 Role após retry:", realRole);
        }
        
        // Verificar se tem acesso baseado no role real
        let hasAccess = false;
        
        if (adminOnly && realRole === 'admin') {
          hasAccess = true;
        } else if (supervisorOnly && (realRole === 'supervisor' || realRole === 'admin')) {
          hasAccess = true;
        } else if (!adminOnly && !supervisorOnly) {
          // Para componentes sem restrição específica, permitir todos os roles
          hasAccess = true;
        }
        
        if (isActive) {
          setUserRole(realRole);
          setHasAccess(hasAccess);
          setIsInitializing(false);
          console.log(`✅ Verificação completa - Role: ${realRole}, Acesso: ${hasAccess}`);
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
        // Buscar role real e verificar acesso
        setTimeout(async () => {
          if (!isActive) return;
          
          let realRole = await AuthService.getUserRole(session.user.id);
          console.log("🔍 Role real no auth change:", realRole);
          
          // Retry logic para admin conhecido
          if ((realRole === 'user' || realRole === 'citizen') && 
              session.user.email === 'admin@chat-pd-poa.org') {
            console.log("🔄 Retry para admin no auth change");
            AuthService.clearAuthCache();
            await new Promise(resolve => setTimeout(resolve, 100));
            realRole = await AuthService.getUserRole(session.user.id);
            console.log("🔍 Role após retry no auth change:", realRole);
          }
          
          let hasAccess = false;
          if (adminOnly && realRole === 'admin') {
            hasAccess = true;
          } else if (supervisorOnly && (realRole === 'supervisor' || realRole === 'admin')) {
            hasAccess = true;
          } else if (!adminOnly && !supervisorOnly) {
            hasAccess = true;
          }
          
          setUserRole(realRole);
          setHasAccess(hasAccess);
          setIsInitializing(false);
        }, 100);
      } else if (event === 'SIGNED_OUT') {
        console.log("❌ Logout detectado no SimpleRoleGuard");
        setHasAccess(false);
        setIsInitializing(false);
      }
    });
    
    // Verificação inicial
    checkAccess();
    
    // Timeout de fallback mais longo - 10 segundos para evitar negação prematura
    const fallbackTimeout = setTimeout(() => {
      if (isActive && isInitializing) {
        console.log("⏰ Timeout de fallback após 10s - verificando estado final");
        
        // Se já conseguiu verificar algum role, usar esse role
        if (userRole) {
          console.log("✅ Role já verificado durante timeout:", userRole);
          let finalAccess = false;
          
          if (adminOnly && userRole === 'admin') {
            finalAccess = true;
          } else if (supervisorOnly && (userRole === 'supervisor' || userRole === 'admin')) {
            finalAccess = true;
          } else if (!adminOnly && !supervisorOnly) {
            finalAccess = true;
          }
          
          setHasAccess(finalAccess);
          setIsInitializing(false);
          console.log("✅ Acesso baseado em role já verificado:", finalAccess);
        } else {
          console.log("❌ Timeout final sem role - negando acesso");
          setUserRole(null);
          setHasAccess(false);
          setIsInitializing(false);
        }
      }
    }, 10000);
    
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
