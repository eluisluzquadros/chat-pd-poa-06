// Utilitário para refresh completo do sistema de roles
import { AuthService } from '@/services/authService';

export const forceRoleRefresh = async () => {
  console.log("🔄 Forçando refresh completo do sistema de roles...");
  
  // 1. Limpar todos os caches de autenticação
  AuthService.clearAuthCache();
  
  // 2. Limpar storage local
  ['urbanista-user-role', 'lastAuthenticatedUserId'].forEach(key => {
    sessionStorage.removeItem(key);
  });
  
  // 3. Forçar nova verificação de sessão
  try {
    const session = await AuthService.getCurrentSession();
    if (session?.user) {
      console.log("✅ Sessão verificada:", session.user.email);
      
      // 4. Forçar nova busca de role
      const role = await AuthService.getUserRole(session.user.id);
      console.log("✅ Role atualizado:", role);
      
      return { success: true, role, email: session.user.email };
    }
  } catch (error) {
    console.error("❌ Erro no refresh:", error);
    return { success: false, error };
  }
  
  return { success: false, error: "Sessão não encontrada" };
};