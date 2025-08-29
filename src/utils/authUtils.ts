import { AuthService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";

export const getCurrentAuthenticatedSession = async () => {
  try {
    // Usar o AuthService que tem cache e throttling implementado
    const session = await AuthService.getCurrentSession();
    console.log("🔍 AuthUtils - Session retrieved:", { 
      hasSession: !!session, 
      hasUser: !!session?.user,
      userId: session?.user?.id,
      isDemoMode: AuthService.isDemoMode()
    });
    return session;
  } catch (error) {
    console.error("🔍 AuthUtils - Error getting session:", error);
    return null;
  }
};

export const getCurrentAuthenticatedUser = async () => {
  const session = await getCurrentAuthenticatedSession();
  return session?.user || null;
};