
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
  const initializedRef = useRef(false);
  const authListenerRef = useRef<any>(null);
  
  // Efeito para inicializar autenticação - executar apenas uma vez
  useEffect(() => {
    // Evitar múltiplas inicializações
    if (initializedRef.current) {
      console.log("Auth já inicializado, ignorando...");
      return;
    }
    
    initializedRef.current = true;
    console.log("=== INICIALIZANDO AUTH CONTEXT ===");
    
    // Verificação inicial
    refreshAuthState();
    
    // Configurar listener para mudanças de autenticação apenas uma vez
    if (!authListenerRef.current) {
      authListenerRef.current = setupAuthListener((session) => {
        console.log("=== AUTH STATE CHANGE ===");
        console.log("Session:", session ? "Autenticado" : "Não autenticado");
        
        if (session) {
          console.log("User ID:", session.user.id);
          console.log("Provider:", session.user.app_metadata?.provider);
          
          // Atualizar estados imediatamente
          setUser(session.user);
          setUserId(session.user.id);
          setSession(session);
          setIsAuthenticated(true);
          
          // Obter papel do usuário de forma assíncrona e com throttling
          setTimeout(async () => {
            try {
              const { AuthService } = await import('@/services/authService');
              const role = await AuthService.getUserRole(session.user.id);
              console.log("Papel do usuário:", role);
              
              setUserRole(role as AppRole);
              setIsAdmin(role === 'admin');
              setIsSupervisor(role === 'supervisor' || role === 'admin');
              setIsAnalyst(role === 'analyst' || role === 'supervisor' || role === 'admin');
            } catch (error: any) {
              console.error("Erro ao obter papel do usuário:", error);
              // Assumir role admin em caso de erro
              setUserRole('admin' as AppRole);
              setIsAdmin(true);
              setIsSupervisor(true);
              setIsAnalyst(true);
            }
          }, 200); // Delay para evitar rate limiting
        } else {
          // Logout - limpar todos os estados
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
    }
    
    // Limpar listener ao desmontar
    return () => {
      if (authListenerRef.current) {
        authListenerRef.current.data.subscription.unsubscribe();
        authListenerRef.current = null;
      }
      initializedRef.current = false;
    };
  }, []); // Sem dependências para executar apenas uma vez
  
  return null;
};
