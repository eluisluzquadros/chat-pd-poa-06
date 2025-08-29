
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
  redirectTo = "/" 
}: SimpleRoleGuardProps) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const location = useLocation();
  
  // Cache persistente no sessionStorage
  const getCachedRole = (userId: string) => {
    const cacheKey = `user-role-${userId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { role, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 3600000) { // 1 hora
        return role;
      }
    }
    return null;
  };
  
  const setCachedRole = (userId: string, role: string) => {
    const cacheKey = `user-role-${userId}`;
    sessionStorage.setItem(cacheKey, JSON.stringify({
      role,
      timestamp: Date.now()
    }));
  };
  
  // Efeito para verificar papel com debounce
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkRole = async () => {
      try {
        // Verificar autenticação primeiro
        const session = await AuthService.getCurrentSession();
        
        if (!session) {
          setHasAccess(false);
          setIsInitializing(false);
          return;
        }
        
        const userId = session.user.id;
        
        // Tentar cache primeiro
        let role = getCachedRole(userId);
        
        if (!role) {
          // Buscar papel do usuário se não estiver em cache
          role = await AuthService.getUserRole(userId);
          if (role) {
            setCachedRole(userId, role);
          }
        }
        
        // Verificar papel explicitamente
        const isAdmin = role === 'admin';
        const isSupervisor = role === 'supervisor' || isAdmin;
        
        // Determinar acesso baseado nos requisitos da rota
        const access = (adminOnly && isAdmin) || 
                       (supervisorOnly && (isSupervisor || isAdmin)) || 
                       (!adminOnly && !supervisorOnly);
        
        // Mostrar mensagem de erro apenas uma vez se não tiver acesso
        if (!access) {
          if (adminOnly) {
            toast.error("Você não tem permissão de administrador para acessar esta página.");
          } else if (supervisorOnly) {
            toast.error("Você não tem permissão de supervisor para acessar esta página.");
          }
        }
        
        setHasAccess(access);
      } catch (error) {
        console.error("SimpleRoleGuard: Erro ao verificar papel:", error);
        setHasAccess(false);
      } finally {
        setIsInitializing(false);
      }
    };
    
    // Debounce para evitar múltiplas chamadas
    timeoutId = setTimeout(checkRole, 100);
    
    // Verificar novamente quando a sessão mudar
    const { data } = supabase.auth.onAuthStateChange(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkRole, 200);
    });
    
    return () => {
      clearTimeout(timeoutId);
      data.subscription.unsubscribe();
    };
  }, [adminOnly, supervisorOnly]);

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
    console.log("SimpleRoleGuard: Redirecionando de", location.pathname, "para", redirectTo);
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Renderizar filhos se tiver acesso
  console.log("SimpleRoleGuard: Acesso permitido");
  return <>{children}</>;
};
