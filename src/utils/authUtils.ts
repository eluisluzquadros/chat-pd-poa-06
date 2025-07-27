import { AuthService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";

export const getCurrentAuthenticatedSession = async () => {
  // Se estiver em modo demo, usar o AuthService
  if (AuthService.isDemoMode()) {
    const demoSession = AuthService.getDemoSession();
    console.log("Demo session user ID:", demoSession?.user?.id);
    return demoSession;
  }
  
  // Caso contrário, usar o cliente Supabase padrão
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getCurrentAuthenticatedUser = async () => {
  const session = await getCurrentAuthenticatedSession();
  return session?.user || null;
};