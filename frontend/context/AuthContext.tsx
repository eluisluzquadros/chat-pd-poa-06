
import { createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { AppRole } from "@/types/app";
import { useAuthContext } from "./auth/useAuthContext";
import { AuthInitializer } from "./auth/AuthInitializer";

// Interface do contexto
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isAnalyst: boolean;
  userRole: AppRole | null;
  userId: string | null;
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
  refreshAuthState: () => Promise<void>;
}

// Criar contexto com valor padrão
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
  isSupervisor: false,
  isAnalyst: false,
  userRole: null,
  userId: null,
  user: null,
  session: null,
  signOut: async () => {},
  refreshAuthState: async () => {},
});

// Hook para usar o contexto
export const useAuth = () => useContext(AuthContext);

// Provider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuthContext();
  
  // Valor do contexto
  const value: AuthContextType = {
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    isAdmin: auth.isAdmin,
    isSupervisor: auth.isSupervisor,
    isAnalyst: auth.isAnalyst,
    userRole: auth.userRole,
    userId: auth.userId,
    user: auth.user,
    session: auth.session,
    signOut: auth.signOut,
    refreshAuthState: auth.refreshAuthState,
  };
  
  // Renderizar provider com o valor
  return (
    <AuthContext.Provider value={value}>
      <AuthInitializer 
        refreshAuthState={auth.refreshAuthState}
        setUser={auth.setUser}
        setUserId={auth.setUserId}
        setSession={auth.setSession}
        setIsAuthenticated={auth.setIsAuthenticated}
        setUserRole={auth.setUserRole}
        setIsAdmin={auth.setIsAdmin}
        setIsSupervisor={auth.setIsSupervisor}
        setIsAnalyst={auth.setIsAnalyst}
      />
      {children}
    </AuthContext.Provider>
  );
};
