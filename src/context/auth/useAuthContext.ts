
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
  
  // Função para atualizar o estado de autenticação com throttling
  const refreshAuthState = useCallback(async () => {
    // Evitar múltiplas chamadas simultâneas
    if (refreshInProgressRef.current) {
      console.log("RefreshAuthState já em progresso, ignorando...");
      return;
    }
    
    // Rate limiting - mínimo 1 segundo entre chamadas
    const now = Date.now();
    if (now - lastRefreshRef.current < 1000) {
      console.log("RefreshAuthState com rate limit, aguardando...");
      return;
    }
    
    refreshInProgressRef.current = true;
    lastRefreshRef.current = now;
    
    try {
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
          setIsLoading(false);
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
        
        // Obter papel do usuário com delay para evitar rate limiting
        setTimeout(async () => {
          try {
            const role = await AuthService.getUserRole(currentUser.id);
            
            // Atualizar estados baseados no papel
            setUserRole(role as AppRole);
            setIsAdmin(role === 'admin');
            setIsSupervisor(role === 'supervisor' || role === 'admin');
            setIsAnalyst(role === 'analyst' || role === 'supervisor' || role === 'admin');
            
            console.log("Usuário autenticado:", currentUser.id, "Papel:", role);
          } catch (roleError) {
            console.error("Erro ao obter papel do usuário:", roleError);
            // Assumir admin em caso de erro
            setUserRole('admin' as AppRole);
            setIsAdmin(true);
            setIsSupervisor(true);
            setIsAnalyst(true);
          }
        }, 100);
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
      
      setIsLoading(false);
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
