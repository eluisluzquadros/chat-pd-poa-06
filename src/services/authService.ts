
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Flag para evitar múltiplas operações simultâneas
let isAuthOperationInProgress = false;

// Função utilitária para limpeza completa de estado de autenticação
const cleanupCompleteAuthState = () => {
  console.log("=== LIMPEZA COMPLETA DE ESTADO DE AUTENTICAÇÃO ===");
  
  // Limpar localStorage
  const localKeys = Object.keys(localStorage);
  localKeys.forEach(key => {
    if (key.includes('supabase') || key.includes('sb-') || key.includes('urbanista') || key.includes('auth')) {
      localStorage.removeItem(key);
      console.log("Removido localStorage:", key);
    }
  });
  
  // Limpar sessionStorage
  const sessionKeys = Object.keys(sessionStorage);
  sessionKeys.forEach(key => {
    if (key.includes('supabase') || key.includes('sb-') || key.includes('urbanista') || key.includes('auth') || key.includes('demo')) {
      sessionStorage.removeItem(key);
      console.log("Removido sessionStorage:", key);
    }
  });
  
  console.log("Limpeza completa de estado concluída");
};

// Funções de autenticação centralizadas
export const AuthService = {
  // Obter a sessão atual
  getCurrentSession: async () => {
    try {
      // Verificar se está em modo demo
      const isDemoMode = sessionStorage.getItem('demo-mode') === 'true';
      if (isDemoMode) {
        const demoSessionStr = sessionStorage.getItem('demo-session');
        return demoSessionStr ? JSON.parse(demoSessionStr) : null;
      }
      
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error("Erro ao obter sessão:", error);
      return null;
    }
  },

  // Obter usuário atual
  getCurrentUser: async () => {
    try {
      // Verificar se está em modo demo
      const isDemoMode = sessionStorage.getItem('demo-mode') === 'true';
      if (isDemoMode) {
        const demoSessionStr = sessionStorage.getItem('demo-session');
        const demoSession = demoSessionStr ? JSON.parse(demoSessionStr) : null;
        return demoSession?.user || null;
      }
      
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error("Erro ao obter usuário:", error);
      return null;
    }
  },

  // Login com email/senha - versão simplificada e otimizada
  signIn: async (email: string, password: string) => {
    // Evitar múltiplas operações simultâneas
    if (isAuthOperationInProgress) {
      console.log("Operação de autenticação já em progresso, aguardando...");
      return { success: false, error: "Operação em progresso" };
    }

    try {
      isAuthOperationInProgress = true;
      
      console.log("Iniciando processo de login para:", email);
      
      // Login direto sem limpeza excessiva
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      
      if (error) {
        console.error("Erro no login:", error);
        throw error;
      }
      
      if (data.user && data.session) {
        console.log("Login bem-sucedido para usuário:", data.user.id);
        
        // Armazenar informações básicas
        sessionStorage.setItem('lastAuthenticatedUserId', data.user.id);
        
        // Buscar papel do usuário de forma assíncrona
        setTimeout(async () => {
          try {
            const role = await AuthService.getUserRole(data.user.id);
            if (role) {
              sessionStorage.setItem('urbanista-user-role', role);
            }
          } catch (roleError) {
            console.error("Erro ao obter papel do usuário:", roleError);
          }
        }, 100);
        
        return { success: true, data };
      }
      
      throw new Error("Dados de autenticação inválidos");
    } catch (error: any) {
      console.error("Erro durante o login:", error);
      
      // Mensagens de erro mais específicas e amigáveis
      let errorMessage = "Erro no login. Tente novamente.";
      
      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Email ou senha incorretos.";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Confirme seu email antes de fazer login.";
      } else if (error.message?.includes("Too many requests")) {
        errorMessage = "Muitas tentativas. Aguarde alguns segundos.";
      } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
        errorMessage = "Problema de conexão. Verifique sua internet.";
      }
      
      return { success: false, error: errorMessage };
    } finally {
      isAuthOperationInProgress = false;
    }
  },

  // Validar acesso do usuário para OAuth usando função do banco
  validateUserAccess: async (email: string, userId: string) => {
    try {
      console.log("=== VALIDANDO ACESSO USUÁRIO ===");
      console.log("Email:", email);
      console.log("User ID:", userId);
      
      // Usar a função do banco para validar acesso
      const { data, error } = await supabase.rpc('get_current_user_role');
      
      if (error) {
        console.error("Erro ao validar acesso:", error);
        throw error;
      }
      
      console.log("Resultado da validação:", data);
      
      // Fazer type assertion para acessar as propriedades do JSON
      const result = data as any;
      
      if (result.has_access) {
        console.log("Usuário validado com sucesso:", result.user_data?.full_name);
        return {
          hasAccess: true,
          userData: result.user_data
        };
      } else {
        console.log("Acesso negado:", result.reason);
        return {
          hasAccess: false,
          reason: result.reason,
          message: result.message
        };
      }
    } catch (error) {
      console.error("Erro ao validar acesso do usuário:", error);
      return {
        hasAccess: false,
        reason: 'validation_error',
        message: 'Erro ao validar acesso. Tente novamente.'
      };
    }
  },

  // Obter papel do usuário
  getUserRole: async (userId: string) => {
    try {
      // Se for usuário demo, retornar supervisor
      const isDemoMode = sessionStorage.getItem('demo-mode') === 'true';
      if (isDemoMode && userId === '00000000-0000-0000-0000-000000000001') {
        return 'supervisor';
      }
      
      // Buscar todos os roles do usuário e pegar o de maior privilégio
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (roleError) {
        console.error("Erro ao buscar roles:", roleError);
      }
      
      // Se tiver roles, pegar o de maior privilégio
      if (roleData && roleData.length > 0) {
        const roles = roleData.map(r => r.role);
        
        // Ordem de prioridade: admin > supervisor > analyst > user
        if (roles.includes('admin')) return 'admin';
        if (roles.includes('supervisor')) return 'supervisor';  
        if (roles.includes('analyst')) return 'analyst';
        if (roles.includes('user')) return 'user';
      }
      
      // Caso não encontre na user_roles, tentar na user_accounts
      const { data: accountData, error: accountError } = await supabase
        .from('user_accounts')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (accountError) {
        console.error("Erro ao buscar account:", accountError);
      }
      
      return accountData?.role || 'citizen';
    } catch (error) {
      console.error("Erro ao obter papel do usuário:", error);
      return 'citizen';
    }
  },

  // Login com Google OAuth
  signInWithGoogle: async () => {
    if (isAuthOperationInProgress) {
      console.log("Operação de autenticação já em progresso, aguardando...");
      return { success: false, error: "Operação em progresso" };
    }

    try {
      isAuthOperationInProgress = true;
      
      console.log("Iniciando processo de login com Google");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`
        }
      });
      
      if (error) {
        console.error("Erro no login com Google:", error);
        throw error;
      }
      
      console.log("Login com Google iniciado, redirecionando...");
      return { success: true, data };
    } catch (error: any) {
      console.error("Erro durante o login com Google:", error);
      
      let errorMessage = "Erro no login com Google. Tente novamente.";
      
      if (error.message?.includes("popup")) {
        errorMessage = "Popup bloqueado. Permita popups para continuar.";
      } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
        errorMessage = "Problema de conexão. Verifique sua internet.";
      }
      
      return { success: false, error: errorMessage };
    } finally {
      isAuthOperationInProgress = false;
    }
  },

  // Login como usuário demo supervisor (apenas para testes)
  signInAsDemo: async () => {
    try {
      console.log("Iniciando acesso demo supervisor");
      
      // Criar uma sessão simulada para o usuário demo
      const demoUser = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'demo-supervisor@test.com',
        aud: 'authenticated',
        role: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: { full_name: 'Supervisor Demo' }
      };
      
      const demoSession = {
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: demoUser
      };
      
      // Armazenar informações do demo
      sessionStorage.setItem('lastAuthenticatedUserId', demoUser.id);
      sessionStorage.setItem('urbanista-user-role', 'supervisor');
      sessionStorage.setItem('demo-mode', 'true');
      sessionStorage.setItem('demo-session', JSON.stringify(demoSession));
      
      console.log("Acesso demo supervisor configurado");
      return { success: true, data: { user: demoUser, session: demoSession } };
    } catch (error: any) {
      console.error("Erro ao configurar demo:", error);
      return { success: false, error: "Erro ao configurar acesso demo" };
    }
  },

  // Verificar se está em modo demo
  isDemoMode: () => {
    return sessionStorage.getItem('demo-mode') === 'true';
  },

  // Obter sessão demo
  getDemoSession: () => {
    const demoSessionStr = sessionStorage.getItem('demo-session');
    return demoSessionStr ? JSON.parse(demoSessionStr) : null;
  },

  // Limpeza completa de estado (função pública)
  cleanupAuthState: cleanupCompleteAuthState,

  // Logout
  signOut: async () => {
    if (isAuthOperationInProgress) {
      return { success: false, error: "Operação em progresso" };
    }

    try {
      isAuthOperationInProgress = true;
      
      console.log("Iniciando processo de logout");
      
      // Usar função centralizada de limpeza
      cleanupCompleteAuthState();
      
      // Fazer logout na API apenas se não estiver em modo demo
      const isDemoMode = sessionStorage.getItem('demo-mode') === 'true';
      if (!isDemoMode) {
        await supabase.auth.signOut({ scope: 'global' });
      }
      
      // Limpeza adicional após logout para garantir
      setTimeout(() => {
        cleanupCompleteAuthState();
      }, 100);
      
      console.log("Logout realizado com sucesso");
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao fazer logout:", error);
      
      // Mesmo com erro, garantir limpeza local
      cleanupCompleteAuthState();
      
      return { success: false, error: error.message };
    } finally {
      isAuthOperationInProgress = false;
    }
  }
};

// Configurar listener de mudanças de autenticação
export const setupAuthListener = (callback: (session: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    console.log("=== AUTH STATE CHANGE EVENT ===");
    console.log("Evento:", event);
    console.log("Session válida:", !!session);
    console.log("Provider:", session?.user?.app_metadata?.provider);
    console.log("User ID:", session?.user?.id);
    console.log("Email:", session?.user?.email);
    
    // Processar sessão OAuth especialmente
    if (event === 'SIGNED_IN' && session?.user?.app_metadata?.provider === 'google') {
      console.log("Google OAuth login detectado!");
      toast.success("Login com Google realizado com sucesso!");
    }
    
    callback(session);
  });
};
