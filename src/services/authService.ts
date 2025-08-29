
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Flag para evitar múltiplas operações simultâneas
let isAuthOperationInProgress = false;

// Cache para roles de usuário para evitar múltiplas consultas
const userRoleCache = new Map<string, { role: string; timestamp: number }>();
const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Cache para sessões para evitar múltiplas consultas
const sessionCache = new Map<string, { session: any; timestamp: number }>();
const SESSION_CACHE_TTL = 2 * 60 * 1000; // 2 minutos

// Throttling para operações de auth
const authCallsThrottle = new Map<string, number>();
const AUTH_THROTTLE_DELAY = 2000; // 2 segundos entre chamadas do mesmo tipo

// Controle de refresh token para evitar rate limiting
let lastTokenRefresh = 0;
const TOKEN_REFRESH_COOLDOWN = 30 * 1000; // 30 segundos entre refreshes

// Função utilitária para limpeza completa de estado de autenticação
const cleanupCompleteAuthState = () => {
  console.log("=== LIMPEZA COMPLETA DE ESTADO DE AUTENTICAÇÃO ===");
  
  // Limpar todos os caches de auth
  userRoleCache.clear();
  sessionCache.clear();
  authCallsThrottle.clear();
  
  // Resetar timestamps
  lastTokenRefresh = 0;
  
  console.log("Caches de autenticação limpos");
  
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
  // Obter a sessão atual com cache agressivo e throttling
  getCurrentSession: async () => {
    try {
      // Verificar se está em modo demo
      const isDemoMode = sessionStorage.getItem('demo-mode') === 'true';
      if (isDemoMode) {
        const demoSessionStr = sessionStorage.getItem('demo-session');
        return demoSessionStr ? JSON.parse(demoSessionStr) : null;
      }
      
      const cacheKey = 'current_session';
      const now = Date.now();
      
      // Verificar cache primeiro
      const cached = sessionCache.get(cacheKey);
      if (cached && (now - cached.timestamp) < SESSION_CACHE_TTL) {
        console.log("Sessão retornada do cache");
        return cached.session;
      }
      
      // Throttling para getCurrentSession
      const throttleKey = 'getCurrentSession';
      const lastCall = authCallsThrottle.get(throttleKey) || 0;
      
      if (now - lastCall < AUTH_THROTTLE_DELAY) {
        console.log("getCurrentSession throttled, retornando cache ou null");
        return cached?.session || null;
      }
      
      // Verificar se não estamos em cooldown de refresh
      if (now - lastTokenRefresh < TOKEN_REFRESH_COOLDOWN) {
        console.log("Token refresh em cooldown, usando cache");
        return cached?.session || null;
      }
      
      authCallsThrottle.set(throttleKey, now);
      
      console.log("Fazendo chamada real para getSession");
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Erro ao obter sessão:", error);
        // Retornar cache em caso de erro se disponível
        return cached?.session || null;
      }
      
      // Atualizar cache apenas se bem-sucedido
      sessionCache.set(cacheKey, { session: data.session, timestamp: now });
      
      // Marcar timestamp de refresh se a sessão foi atualizada
      if (data.session) {
        lastTokenRefresh = now;
      }
      
      return data.session;
    } catch (error) {
      console.error("Erro ao obter sessão:", error);
      // Retornar cache em caso de erro
      const cached = sessionCache.get('current_session');
      return cached?.session || null;
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
        
        // Atualizar cache de sessão imediatamente
        sessionCache.set('current_session', { session: data.session, timestamp: Date.now() });
        
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

  // Obter papel do usuário com cache e throttling
  getUserRole: async (userId: string) => {
    try {
      // Se for usuário demo, retornar supervisor
      const isDemoMode = sessionStorage.getItem('demo-mode') === 'true';
      if (isDemoMode && userId === '00000000-0000-0000-0000-000000000001') {
        return 'supervisor';
      }
      
      // Verificar cache primeiro
      const cached = userRoleCache.get(userId);
      if (cached && (Date.now() - cached.timestamp) < ROLE_CACHE_TTL) {
        console.log("Role retornado do cache:", cached.role);
        return cached.role;
      }
      
      // Throttling para evitar múltiplas chamadas rápidas
      const throttleKey = `getUserRole_${userId}`;
      const lastCall = authCallsThrottle.get(throttleKey) || 0;
      const now = Date.now();
      
      if (now - lastCall < AUTH_THROTTLE_DELAY) {
        console.log("getUserRole throttled, usando cache ou padrão");
        return cached?.role || 'admin'; // Fallback para admin se throttled
      }
      
      authCallsThrottle.set(throttleKey, now);
      
      // Primeiro, verificar metadados do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id === userId) {
        // Check app_metadata first (more reliable)
        if (user.app_metadata?.role) {
          const role = user.app_metadata.role;
          console.log("Role from app_metadata:", role);
          userRoleCache.set(userId, { role, timestamp: now });
          return role;
        }
        // Then check user_metadata
        if (user.user_metadata?.role) {
          const role = user.user_metadata.role;
          console.log("Role from user_metadata:", role);
          userRoleCache.set(userId, { role, timestamp: now });
          return role;
        }
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
        let finalRole = 'citizen';
        if (roles.includes('admin')) finalRole = 'admin';
        else if (roles.includes('supervisor')) finalRole = 'supervisor';  
        else if (roles.includes('analyst')) finalRole = 'analyst';
        else if (roles.includes('user')) finalRole = 'user';
        
        userRoleCache.set(userId, { role: finalRole, timestamp: now });
        return finalRole;
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
      
      const finalRole = accountData?.role || 'admin'; // Default para admin
      userRoleCache.set(userId, { role: finalRole, timestamp: now });
      return finalRole;
    } catch (error) {
      console.error("Erro ao obter papel do usuário:", error);
      // Em caso de erro, assumir admin para o usuário principal
      const fallbackRole = 'admin';
      userRoleCache.set(userId, { role: fallbackRole, timestamp: Date.now() });
      return fallbackRole;
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

  // Limpar apenas caches sem afetar localStorage/sessionStorage
  clearAuthCache: () => {
    console.log("Limpando caches de autenticação...");
    userRoleCache.clear();
    sessionCache.clear();
    authCallsThrottle.clear();
    lastTokenRefresh = 0;
    console.log("Caches limpos");
  },

  // Verificar estado de saúde da autenticação
  getAuthHealth: () => {
    const now = Date.now();
    return {
      sessionCacheSize: sessionCache.size,
      roleCacheSize: userRoleCache.size,
      throttleMapSize: authCallsThrottle.size,
      timeSinceLastRefresh: now - lastTokenRefresh,
      isInRefreshCooldown: (now - lastTokenRefresh) < TOKEN_REFRESH_COOLDOWN,
      caches: {
        session: Array.from(sessionCache.entries()).map(([key, value]) => ({
          key,
          age: now - value.timestamp,
          valid: (now - value.timestamp) < SESSION_CACHE_TTL
        })),
        roles: Array.from(userRoleCache.entries()).map(([key, value]) => ({
          key,
          role: value.role,
          age: now - value.timestamp,
          valid: (now - value.timestamp) < ROLE_CACHE_TTL
        }))
      }
    };
  },

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

// Função para refresh seguro com retry
const safeTokenRefresh = async (retryCount = 0): Promise<any> => {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 segundo
  
  try {
    const now = Date.now();
    
    // Verificar cooldown
    if (now - lastTokenRefresh < TOKEN_REFRESH_COOLDOWN) {
      console.log("Token refresh em cooldown, aguardando...");
      await new Promise(resolve => setTimeout(resolve, TOKEN_REFRESH_COOLDOWN));
    }
    
    console.log(`Tentativa ${retryCount + 1} de refresh token`);
    lastTokenRefresh = now;
    
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        if (retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount); // Backoff exponencial
          console.log(`Rate limit atingido, aguardando ${delay}ms antes de retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return safeTokenRefresh(retryCount + 1);
        } else {
          console.error("Max retries atingido para refresh token");
          throw error;
        }
      }
      throw error;
    }
    
    // Atualizar cache com nova sessão
    if (data.session) {
      sessionCache.set('current_session', { session: data.session, timestamp: Date.now() });
    }
    
    return data;
  } catch (error) {
    console.error("Erro no refresh token:", error);
    throw error;
  }
};

// Configurar listener de mudanças de autenticação com controle de rate limiting
export const setupAuthListener = (callback: (session: any) => void) => {
  let lastEventTime = 0;
  const EVENT_THROTTLE_DELAY = 1000; // 1 segundo entre eventos
  
  return supabase.auth.onAuthStateChange(async (event, session) => {
    const now = Date.now();
    
    // Throttling de eventos
    if (now - lastEventTime < EVENT_THROTTLE_DELAY && event !== 'SIGNED_OUT') {
      console.log("Auth event throttled:", event);
      return;
    }
    
    lastEventTime = now;
    
    console.log("=== AUTH STATE CHANGE EVENT ===");
    console.log("Evento:", event);
    console.log("Session válida:", !!session);
    console.log("Provider:", session?.user?.app_metadata?.provider);
    console.log("User ID:", session?.user?.id);
    console.log("Email:", session?.user?.email);
    
    // Processar eventos específicos
    if (event === 'SIGNED_IN' && session?.user?.app_metadata?.provider === 'google') {
      console.log("Google OAuth login detectado!");
      toast.success("Login com Google realizado com sucesso!");
    }
    
    // Para TOKEN_REFRESHED, tentar fazer refresh seguro se necessário
    if (event === 'TOKEN_REFRESHED' && !session) {
      console.log("Token refresh falhou, tentando refresh seguro...");
      try {
        const refreshResult = await safeTokenRefresh();
        if (refreshResult.session) {
          session = refreshResult.session;
          console.log("Refresh seguro bem-sucedido");
        }
      } catch (error) {
        console.error("Refresh seguro falhou:", error);
        // Não interromper o fluxo, deixar callback decidir
      }
    }
    
    callback(session);
  });
};
