
import { useState, useCallback, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { AppRole } from "@/types/app";
import { AuthService, setupAuthListener } from "@/services/authService";
import { toast } from "sonner";

export const useAuthContext = () => {
  // Estados
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isAnalyst, setIsAnalyst] = useState(false);
  
  // Função para atualizar o estado de autenticação
  const refreshAuthState = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Atualizando estado de autenticação...");
      
      // Verificar se está em modo demo primeiro
      const isDemoMode = sessionStorage.getItem('demo-mode') === 'true';
      if (isDemoMode) {
        const demoSessionStr = sessionStorage.getItem('demo-session');
        if (demoSessionStr) {
          const demoSession = JSON.parse(demoSessionStr);
          console.log("Modo demo detectado, configurando estado...");
          setSession(demoSession);
          setUser(demoSession.user);
          setUserId(demoSession.user.id);
          setIsAuthenticated(true);
          setUserRole('supervisor' as AppRole);
          setIsAdmin(false);
          setIsSupervisor(true);
          setIsAnalyst(true);
          return;
        }
      }
      
      // Obter sessão atual
      const currentSession = await AuthService.getCurrentSession();
      setSession(currentSession);
      
      if (currentSession) {
        // Autenticado
        const currentUser = currentSession.user;
        setUser(currentUser);
        setUserId(currentUser.id);
        setIsAuthenticated(true);
        
        // Obter papel do usuário
        const role = await AuthService.getUserRole(currentUser.id);
        
        // Atualizar estados baseados no papel
        setUserRole(role as AppRole);
        setIsAdmin(role === 'admin');
        setIsSupervisor(role === 'supervisor' || role === 'admin');
        setIsAnalyst(role === 'analyst' || role === 'supervisor' || role === 'admin');
        
        console.log("Usuário autenticado:", currentUser.id, "Papel:", role);
      } else {
        // Não autenticado - reseta estados
        setUser(null);
        setUserId(null);
        setIsAuthenticated(false);
        setUserRole(null);
        setIsAdmin(false);
        setIsSupervisor(false);
        setIsAnalyst(false);
        
        console.log("Usuário não autenticado");
      }
    } catch (error) {
      console.error("Erro ao atualizar estado de autenticação:", error);
      // Reseta estados em caso de erro
      setUser(null);
      setUserId(null);
      setIsAuthenticated(false);
      setUserRole(null);
      setIsAdmin(false);
      setIsSupervisor(false);
      setIsAnalyst(false);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Função de logout
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      toast.info("Encerrando sessão...");
      
      const result = await AuthService.signOut();
      
      if (result.success) {
        // Reseta estados
        setUser(null);
        setUserId(null);
        setSession(null);
        setIsAuthenticated(false);
        setUserRole(null);
        setIsAdmin(false);
        setIsSupervisor(false);
        setIsAnalyst(false);
        
        toast.success("Logout realizado com sucesso");
        
        // Redirecionar para a página de login
        window.location.href = '/auth';
      } else {
        toast.error("Erro ao fazer logout. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error("Erro ao fazer logout. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // Estados
    isAuthenticated,
    isLoading,
    user,
    session,
    userId,
    userRole,
    isAdmin,
    isSupervisor,
    isAnalyst,
    // Funções
    refreshAuthState,
    signOut,
    // Setters para uso no useEffect
    setUser,
    setUserId,
    setSession,
    setIsAuthenticated,
    setUserRole,
    setIsAdmin,
    setIsSupervisor,
    setIsAnalyst
  };
};
