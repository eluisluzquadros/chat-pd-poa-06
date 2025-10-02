
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Flag para evitar múltiplas operações simultâneas
let isAuthOperationInProgress = false;

// Cache para roles de usuário para evitar múltiplas consultas
const userRoleCache = new Map<string, { role: string; timestamp: number }>();
const ROLE_CACHE_TTL = 60 * 60 * 1000; // 60 minutos - aumentado para maior persistência

// Cache para sessões para evitar múltiplas consultas
const sessionCache = new Map<string, { session: any; timestamp: number }>();
const SESSION_CACHE_TTL = 30 * 60 * 1000; // 30 minutos - aumentado para maior persistência

// Throttling para operações de auth - otimizado para balance entre performance e confiabilidade
const authCallsThrottle = new Map<string, number>();
const AUTH_THROTTLE_DELAY = 20; // 20ms entre chamadas do mesmo tipo - otimizado para login rápido

// Controle de refresh token removido para evitar bloqueios desnecessários

// Função utilitária para limpeza completa de estado de autenticação
const cleanupCompleteAuthState = () => {
  console.log("=== LIMPEZA COMPLETA DE ESTADO DE AUTENTICAÇÃO ===");
  
  // Limpar todos os caches de auth
  userRoleCache.clear();
  sessionCache.clear();
  authCallsThrottle.clear();
  
  // Reset de caches realizado
  
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
      
      // Throttling otimizado para getCurrentSession
      const throttleKey = 'getCurrentSession';
      const lastCall = authCallsThrottle.get(throttleKey) || 0;
      
      if (now - lastCall < AUTH_THROTTLE_DELAY) {
        console.log("getCurrentSession throttled - usando cache se disponível");
        // Se temos cache válido, usar, senão permitir chamada
        if (cached && (now - cached.timestamp) < SESSION_CACHE_TTL) {
          return cached.session;
        }
        // Cache antigo mas ainda válido - usar para evitar chamadas desnecessárias
        if (cached && (now - cached.timestamp) < SESSION_CACHE_TTL * 1.5) {
          return cached.session;
        }
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
      
      // Cache atualizado com sucesso
      
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

  // Validar acesso do usuário para OAuth com auto-provisionamento
  validateUserAccess: async (email: string, userId: string) => {
    try {
      console.log("🔐 === VALIDANDO ACESSO USUÁRIO (Google OAuth) ===");
      console.log("📧 Email:", email);
      console.log("🆔 User ID:", userId);
      
      // Normalizar email
      const normalizedEmail = email.toLowerCase().trim();
      console.log("📧 Email normalizado:", normalizedEmail);
      
      // Primeiro, verificar se o usuário existe na tabela user_accounts
      console.log("🔍 Chamando RPC validate_oauth_access com:", { user_email: normalizedEmail, user_id: userId });
      
      const { data, error } = await supabase.rpc('validate_oauth_access', {
        user_email: normalizedEmail,
        user_id: userId
      });
      
      if (error) {
        console.error("❌ Erro ao validar acesso via RPC:", error);
        console.error("❌ Detalhes do erro:", { message: error.message, code: error.code, details: error.details, hint: error.hint });
        throw error;
      }
      
      console.log("✅ Resultado da validação RPC:", data);
      console.log("✅ Tipo do resultado:", typeof data);
      
      // Fazer type assertion para acessar as propriedades do JSON
      const result = data as any;
      
      if (result.has_access) {
        console.log("✅ Usuário validado com sucesso:", result.user_data?.full_name);
        return {
          hasAccess: true,
          userData: result.user_data
        };
      } else if (result.reason === 'user_not_found') {
        console.log("⚠️ Usuário não encontrado - iniciando auto-provisionamento via edge function...");
        
        try {
          // Obter sessão atual
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData?.session?.access_token) {
            throw new Error('Sessão inválida');
          }

          // Buscar dados do usuário
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError || !userData.user) {
            throw new Error('Usuário não autenticado');
          }

          const userName = userData.user.user_metadata?.full_name || 
                          userData.user.user_metadata?.name || 
                          normalizedEmail.split('@')[0];

          console.log("🚀 Chamando edge function oauth-provision...");
          console.log("📤 Dados enviados:", { email: normalizedEmail, userId, fullName: userName });
          
          // Chamar edge function que usa service role para bypassar RLS
          const { data: provisionData, error: provisionError } = await supabase.functions.invoke('oauth-provision', {
            body: { 
              email: normalizedEmail, 
              userId,
              fullName: userName
            },
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`
            }
          });

          console.log("📥 Resposta da edge function:", { data: provisionData, error: provisionError });

          if (provisionError) {
            console.error("❌ Erro ao provisionar via edge function:", provisionError);
            console.error("❌ Detalhes do erro:", { message: provisionError.message, context: provisionError.context });
            throw provisionError;
          }

          if (!provisionData?.success) {
            console.error("❌ Provisionamento retornou falha:", provisionData);
            throw new Error(provisionData?.error || 'Falha no provisionamento');
          }

          console.log("✅ Usuário provisionado com sucesso!");
          console.log("✅ Detalhes da conta:", provisionData.account);

          // Criar profile também
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: normalizedEmail,
              full_name: userName
            });

          if (profileError && !profileError.message?.includes('duplicate key')) {
            console.error("⚠️ Erro ao criar profile:", profileError);
          }

          return {
            hasAccess: true,
            userData: {
              id: userId,
              email: normalizedEmail,
              full_name: userName,
              role: 'citizen',
              is_active: true
            }
          };
          
        } catch (provisionError: any) {
          console.error("💥 Erro ao auto-provisionar usuário:", provisionError);
          return {
            hasAccess: false,
            reason: 'provision_failed',
            message: `Erro ao criar conta: ${provisionError.message || 'Erro desconhecido'}. Tente novamente ou entre em contato com o suporte.`
          };
        }
      } else {
        console.log("🚫 Acesso negado:", result.reason);
        return {
          hasAccess: false,
          reason: result.reason,
          message: result.message
        };
      }
    } catch (error: any) {
      console.error("💥 Erro crítico ao validar acesso do usuário:", error);
      console.error("Detalhes:", {
        message: error.message,
        code: error.code,
        details: error.details
      });
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
      
      // Verificar cache primeiro - com backup em localStorage
      const cached = userRoleCache.get(userId);
      if (cached && (Date.now() - cached.timestamp) < ROLE_CACHE_TTL) {
        console.log("Role retornado do cache:", cached.role);
        // Atualizar também o sessionStorage para persistência
        sessionStorage.setItem('urbanista-user-role', cached.role);
        return cached.role;
      }
      
      // Verificar cache em sessionStorage como backup
      const sessionRole = sessionStorage.getItem('urbanista-user-role');
      if (sessionRole && !cached) {
        console.log("Role recuperado do sessionStorage:", sessionRole);
        // Recriar cache com role do sessionStorage
        userRoleCache.set(userId, { role: sessionRole, timestamp: Date.now() });
        return sessionRole;
      }
      
      // Throttling para evitar múltiplas chamadas rápidas
      const throttleKey = `getUserRole_${userId}`;
      const lastCall = authCallsThrottle.get(throttleKey) || 0;
      const now = Date.now();
      
      if (now - lastCall < AUTH_THROTTLE_DELAY) {
        console.log("⚡ getUserRole throttled - verificando cache válido");
        // Se tem cache válido, usar, senão prosseguir com busca real
        if (cached && (Date.now() - cached.timestamp) < ROLE_CACHE_TTL) {
          console.log("Cache válido encontrado:", cached.role);
          return cached.role;
        }
        // Cache inválido ou ausente - prosseguir com busca real apesar do throttle
        console.log("Cache inválido/ausente - fazendo busca real mesmo com throttle");
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
      
      // Se não encontrou em user_roles, usar 'citizen' como padrão
      const finalRole = 'citizen';
      
      // Atualizar cache e sessionStorage
      userRoleCache.set(userId, { role: finalRole, timestamp: now });
      sessionStorage.setItem('urbanista-user-role', finalRole);
      
      return finalRole;
    } catch (error) {
      console.error("Erro ao obter papel do usuário:", error);
      // Em caso de erro, verificar se tem cache válido antes de fazer fallback
      const cached = userRoleCache.get(userId);
      if (cached && (Date.now() - cached.timestamp) < ROLE_CACHE_TTL) {
        console.log("Usando cache válido em caso de erro:", cached.role);
        return cached.role;
      }
      // Sem cache válido - assumir citizen (role mais restrito) 
      const fallbackRole = 'citizen';
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
    console.log("Caches limpos");
  },

  // Verificar estado de saúde da autenticação
  getAuthHealth: () => {
    const now = Date.now();
    return {
      sessionCacheSize: sessionCache.size,
      roleCacheSize: userRoleCache.size,
      throttleMapSize: authCallsThrottle.size,
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

// Função para refresh seguro com retry - simplificada
const safeTokenRefresh = async (retryCount = 0): Promise<any> => {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 segundo
  
  try {
    console.log(`Tentativa ${retryCount + 1} de refresh token`);
    
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
