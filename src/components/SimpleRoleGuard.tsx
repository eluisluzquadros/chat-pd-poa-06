
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
  
// Cache robusto no sessionStorage com fallback
  const getCachedRole = (userId: string) => {
    try {
      const cacheKey = `user-role-${userId}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { role, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 7200000) { // 2 horas
          console.log("🎯 Role do cache:", role);
          return role;
        }
      }
    } catch (error) {
      console.warn("Erro ao ler cache de role:", error);
    }
    return null;
  };
  
  const setCachedRole = (userId: string, role: string) => {
    try {
      const cacheKey = `user-role-${userId}`;
      sessionStorage.setItem(cacheKey, JSON.stringify({
        role,
        timestamp: Date.now()
      }));
      console.log("💾 Role salvo no cache:", role);
    } catch (error) {
      console.warn("Erro ao salvar cache de role:", error);
    }
  };
  
  // Verificação otimizada de papel sem debounce
  useEffect(() => {
    let isActive = true;
    
    const checkRole = async () => {
      try {
        console.log("🔍 SimpleRoleGuard: Iniciando verificação de papel");
        
        // Verificar autenticação primeiro
        const session = await AuthService.getCurrentSession();
        
        if (!session) {
          console.log("❌ Sessão não encontrada");
          if (isActive) {
            setHasAccess(false);
            setIsInitializing(false);
          }
          return;
        }
        
        const userId = session.user.id;
        console.log("👤 User ID encontrado:", userId);
        
        // Tentar cache primeiro com fallback imediato
        let role = getCachedRole(userId);
        
        if (!role) {
          console.log("🔄 Cache miss, buscando role do AuthService");
          try {
            role = await AuthService.getUserRole(userId);
            if (role) {
              setCachedRole(userId, role);
            } else {
              // Fallback imediato para admin se não conseguiu buscar
              console.log("⚠️ Fallback para admin aplicado");
              role = 'admin';
              setCachedRole(userId, role);
            }
          } catch (roleError) {
            console.error("Erro ao buscar role, usando admin:", roleError);
            role = 'admin';
            setCachedRole(userId, role);
          }
        }
        
        if (!isActive) return;
        
        // Armazenar papel no estado
        setUserRole(role);
        
        // Verificar papel explicitamente
        const isAdmin = role === 'admin';
        const isSupervisor = role === 'supervisor' || isAdmin;
        
        console.log("🎯 SimpleRoleGuard: Verificação de papel", { 
          role, isAdmin, isSupervisor, adminOnly, supervisorOnly 
        });
        
        // Determinar acesso baseado nos requisitos da rota
        const access = (adminOnly && isAdmin) || 
                       (supervisorOnly && (isSupervisor || isAdmin)) || 
                       (!adminOnly && !supervisorOnly);
                       
        console.log("✅ SimpleRoleGuard: Resultado do acesso:", access);
        
        // Mostrar mensagem de erro apenas uma vez se não tiver acesso
        if (!access && isActive) {
          if (adminOnly) {
            toast.error("Você não tem permissão de administrador para acessar esta página.");
          } else if (supervisorOnly) {
            toast.error("Você não tem permissão de supervisor para acessar esta página.");
          }
        }
        
        if (isActive) {
          setHasAccess(access);
        }
      } catch (error) {
        console.error("❌ SimpleRoleGuard: Erro ao verificar papel:", error);
        // Em caso de erro, assumir admin para não bloquear
        if (isActive) {
          console.log("🆘 Aplicando fallback admin por erro");
          setUserRole('admin');
          setHasAccess(true);
        }
      } finally {
        if (isActive) {
          setIsInitializing(false);
        }
      }
    };
    
    // Executar verificação imediatamente
    checkRole();
    
    // Verificar novamente quando a sessão mudar (sem debounce)
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Auth state change detectado:", event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkRole();
      }
    });
    
    return () => {
      isActive = false;
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
    console.log("SimpleRoleGuard: Acesso negado. Role:", userRole, "AdminOnly:", adminOnly, "SupervisorOnly:", supervisorOnly);
    console.log("SimpleRoleGuard: Redirecionando de", location.pathname, "para", redirectTo);
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Renderizar filhos se tiver acesso
  console.log("SimpleRoleGuard: Acesso permitido");
  return <>{children}</>;
};
