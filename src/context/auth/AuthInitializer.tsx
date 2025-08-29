
import { useEffect, useRef } from "react";
import { setupAuthListener } from "@/services/authService";
import { AppRole } from "@/types/app";

interface AuthInitializerProps {
  refreshAuthState: () => Promise<void>;
  setUser: (user: any) => void;
  setUserId: (id: string | null) => void;
  setSession: (session: any) => void;
  setIsAuthenticated: (isAuth: boolean) => void;
  setUserRole: (role: AppRole | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setIsSupervisor: (isSupervisor: boolean) => void;
  setIsAnalyst: (isAnalyst: boolean) => void;
}

export const AuthInitializer = ({
  refreshAuthState,
  setUser,
  setUserId,
  setSession,
  setIsAuthenticated,
  setUserRole,
  setIsAdmin,
  setIsSupervisor,
  setIsAnalyst
}: AuthInitializerProps) => {
  const validationInProgressRef = useRef(false);
  const lastValidatedUserRef = useRef<string | null>(null);
  
  // Efeito para inicializar autenticação
  useEffect(() => {
    console.log("=== INICIALIZANDO AUTH CONTEXT ===");
    
    // Verificar se estamos em uma página de callback OAuth
    const isOAuthCallback = window.location.pathname.includes('/auth/callback') || 
                           window.location.pathname.includes('/callback');
    
    // Verificar se há hash ou query params do OAuth primeiro
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      if (urlParams.has('code') || hashParams.has('access_token') || hashParams.has('session')) {
        console.log("OAuth callback detectado no AuthInitializer, aguardando processamento...");
        // Se estivermos em callback, deixar o AuthCallback.tsx processar
        if (isOAuthCallback) {
          console.log("Estamos em página de callback, deixando AuthCallback processar...");
          return;
        }
        // Aguardar um pouco para o Supabase processar automaticamente
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    };
    
    // Processar callback OAuth se necessário
    handleOAuthCallback().then(() => {
      // Primeira verificação de autenticação apenas se não estivermos em callback
      if (!isOAuthCallback) {
        refreshAuthState();
      }
    });
    
    // Configurar listener para mudanças de autenticação
    const { data } = setupAuthListener((session) => {
      console.log("=== AUTH STATE CHANGE ===");
      console.log("Session:", session ? "Autenticado" : "Não autenticado");
      console.log("User ID:", session?.user?.id);
      console.log("Provider:", session?.user?.app_metadata?.provider);
      console.log("Current path:", window.location.pathname);
      
      // Atualizar estados baseados na nova sessão
      if (session) {
        setUser(session.user);
        setUserId(session.user.id);
        setSession(session);
        setIsAuthenticated(true);
        
        // Se for OAuth do Google e NÃO estivermos em callback, validar acesso
        if (session.user?.app_metadata?.provider === 'google' && !isOAuthCallback) {
          // Evitar validação dupla
          if (validationInProgressRef.current || lastValidatedUserRef.current === session.user.id) {
            console.log("Validação OAuth já em progresso ou já realizada, ignorando...");
            return;
          }
          
          console.log("Google OAuth detectado no AuthInitializer, validando acesso...");
          validationInProgressRef.current = true;
          lastValidatedUserRef.current = session.user.id;
          
          // Validar acesso com debounce para evitar deadlocks
          setTimeout(async () => {
            try {
              const { AuthService } = await import('@/services/authService');
              const accessValidation = await AuthService.validateUserAccess(session.user.email!, session.user.id);
              
              if (!accessValidation.hasAccess) {
                console.log("Acesso negado para usuário OAuth no AuthInitializer:", accessValidation.reason);
                
                // Limpar referências
                validationInProgressRef.current = false;
                lastValidatedUserRef.current = null;
                
                // Fazer logout automático com limpeza completa
                const { supabase } = await import('@/integrations/supabase/client');
                
                // Limpeza completa do estado
                const cleanupState = () => {
                  const localKeys = Object.keys(localStorage);
                  localKeys.forEach(key => {
                    if (key.includes('supabase') || key.includes('sb-') || key.includes('urbanista') || key.includes('auth')) {
                      localStorage.removeItem(key);
                    }
                  });
                  
                  const sessionKeys = Object.keys(sessionStorage);
                  sessionKeys.forEach(key => {
                    if (key.includes('supabase') || key.includes('sb-') || key.includes('urbanista') || key.includes('auth') || key.includes('demo')) {
                      sessionStorage.removeItem(key);
                    }
                  });
                };
                
                cleanupState();
                await supabase.auth.signOut({ scope: 'global' });
                
                // Notificar usuário
                const { toast } = await import('sonner');
                toast.error(accessValidation.message || 'Acesso restrito a usuários previamente cadastrados.');
                
                // Redirecionar para auth
                setTimeout(() => {
                  window.location.href = '/auth';
                }, 1000);
                return;
              }
              
              console.log("Usuário OAuth validado no AuthInitializer, permitindo acesso...");
              validationInProgressRef.current = false;
              
              // Só redirecionar se não estivermos em uma página adequada
              if (window.location.pathname === '/auth' || window.location.pathname === '/') {
                console.log("Redirecionando usuário validado para /chat...");
                window.location.href = '/chat';
              }
            } catch (error) {
              console.error("Erro ao validar usuário OAuth no AuthInitializer:", error);
              validationInProgressRef.current = false;
              lastValidatedUserRef.current = null;
              
              // Em caso de erro, fazer logout por segurança
              const { supabase } = await import('@/integrations/supabase/client');
              await supabase.auth.signOut({ scope: 'global' });
              window.location.href = '/auth';
            }
          }, 800); // Aumentar o delay para evitar conflitos
        }
        
        // Obter papel do usuário em um setTimeout para evitar deadlocks
        setTimeout(async () => {
          const { AuthService } = await import('@/services/authService');
          const role = await AuthService.getUserRole(session.user.id);
          console.log("Papel do usuário:", role);
          setUserRole(role as AppRole);
          setIsAdmin(role === 'admin');
          setIsSupervisor(role === 'supervisor' || role === 'admin');
          setIsAnalyst(role === 'analyst' || role === 'supervisor' || role === 'admin');
        }, 0);
      } else {
        // Limpar referências quando logout
        validationInProgressRef.current = false;
        lastValidatedUserRef.current = null;
        
        setUser(null);
        setUserId(null);
        setSession(null);
        setIsAuthenticated(false);
        setUserRole(null);
        setIsAdmin(false);
        setIsSupervisor(false);
        setIsAnalyst(false);
      }
    });
    
    // Limpar listener ao desmontar
    return () => {
      data.subscription.unsubscribe();
    };
  }, [refreshAuthState, setUser, setUserId, setSession, setIsAuthenticated, setUserRole, setIsAdmin, setIsSupervisor, setIsAnalyst]);
  
  return null;
};
