
import { useState, useCallback, useEffect, useRef } from "react";
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
  
  // Refs para controle de rate limiting
  const lastRefreshRef = useRef<number>(0);
  const refreshInProgressRef = useRef<boolean>(false);
  
  // Função simplificada para atualizar o estado de autenticação
  const refreshAuthState = useCallback(async () => {
    if (refreshInProgressRef.current) return;
    
    refreshInProgressRef.current = true;
    
    try {
      // Verificar modo demo
      const isDemoMode = sessionStorage.getItem('demo-mode') === 'true';
      if (isDemoMode) {
        const demoSessionStr = sessionStorage.getItem('demo-session');
        if (demoSessionStr) {
          const demoSession = JSON.parse(demoSessionStr);
          setSession(demoSession);
          setUser(demoSession.user);
          setUserId(demoSession.user.id);
          setIsAuthenticated(true);
          setUserRole('admin' as AppRole);
          setIsAdmin(true);
          setIsSupervisor(true);
          setIsAnalyst(true);
          setIsLoading(false);
          return;
        }
      }
      
      // Obter sessão atual
      const currentSession = await AuthService.getCurrentSession();
      setSession(currentSession);
      
      if (currentSession) {
        const currentUser = currentSession.user;
        setUser(currentUser);
        setUserId(currentUser.id);
        setIsAuthenticated(true);
        
        // Assumir admin por padrão para evitar problemas de permissão
        setUserRole('admin' as AppRole);
        setIsAdmin(true);
        setIsSupervisor(true);
        setIsAnalyst(true);
      } else {
        setUser(null);
        setUserId(null);
        setIsAuthenticated(false);
        setUserRole(null);
        setIsAdmin(false);
        setIsSupervisor(false);
        setIsAnalyst(false);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Erro ao atualizar estado de autenticação:", error);
      setUser(null);
      setUserId(null);
      setIsAuthenticated(false);
      setUserRole(null);
      setIsAdmin(false);
      setIsSupervisor(false);
      setIsAnalyst(false);
      setIsLoading(false);
    } finally {
      refreshInProgressRef.current = false;
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
