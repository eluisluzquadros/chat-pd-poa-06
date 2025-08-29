
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
  
  // Efeito para verificar papel
  useEffect(() => {
    console.log("SimpleRoleGuard: Verificando permissões");
    console.log("adminOnly:", adminOnly);
    console.log("supervisorOnly:", supervisorOnly);
    
    const checkRole = async () => {
      try {
        // Verificar autenticação primeiro
        const session = await AuthService.getCurrentSession();
        
        if (!session) {
          console.log("SimpleRoleGuard: Usuário não está autenticado");
          setHasAccess(false);
          setIsInitializing(false);
          return;
        }
        
        const userId = session.user.id;
        console.log("SimpleRoleGuard: ID do usuário:", userId);
        
        // Buscar papel do usuário
        const role = await AuthService.getUserRole(userId);
        console.log("SimpleRoleGuard: Papel do usuário:", role);
        
        // Verificar papel explicitamente
        const isAdmin = role === 'admin';
        const isSupervisor = role === 'supervisor' || isAdmin;
        
        // Determinar acesso baseado nos requisitos da rota
        const access = (adminOnly && isAdmin) || 
                       (supervisorOnly && (isSupervisor || isAdmin)) || 
                       (!adminOnly && !supervisorOnly);
        
        console.log("SimpleRoleGuard: Acesso concedido:", access);
        
        // Mostrar mensagem de erro se não tiver acesso
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
    
    // Verificar imediatamente
    checkRole();
    
    // Verificar novamente quando a sessão mudar
    const { data } = supabase.auth.onAuthStateChange(() => {
      console.log("SimpleRoleGuard: Estado de autenticação alterado, verificando papel novamente");
      checkRole();
    });
    
    return () => {
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
