import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Flag to prevent concurrent auth operations
let isAuthOperationInProgress = false;

// Complete auth state cleanup utility
const cleanupCompleteAuthState = () => {
  console.log("=== SECURE AUTH STATE CLEANUP ===");
  
  // Clear all auth-related storage
  const storageKeys = ['localStorage', 'sessionStorage'];
  storageKeys.forEach(storageType => {
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    const keys = Object.keys(storage);
    
    keys.forEach(key => {
      if (
        key.includes('supabase') || 
        key.includes('sb-') || 
        key.includes('auth') ||
        key.includes('demo') ||
        key.includes('urbanista')
      ) {
        storage.removeItem(key);
        console.log(`Removed ${storageType}:`, key);
      }
    });
  });
  
  console.log("Secure auth cleanup completed");
};

// Rate limiting for auth attempts
const checkRateLimit = async (ipAddress?: string): Promise<boolean> => {
  if (!ipAddress) return true; // Skip if no IP available
  
  try {
    const { data } = await supabase.rpc('check_auth_rate_limit', {
      user_ip: ipAddress,
      max_attempts: 5,
      window_minutes: 15
    });
    
    return data as boolean;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return true; // Allow if rate limiting fails
  }
};

// Log authentication attempt
const logAuthAttempt = async (email: string, success: boolean, ipAddress?: string) => {
  try {
    await supabase.from('auth_attempts').insert({
      email: email.toLowerCase(),
      success,
      ip_address: ipAddress || null
    });
  } catch (error) {
    console.error('Error logging auth attempt:', error);
  }
};

// Get user's IP address (for rate limiting)
const getUserIP = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting IP:', error);
    return null;
  }
};

// Enhanced input validation
const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) return { isValid: false, error: 'Email é obrigatório' };
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { isValid: false, error: 'Email inválido' };
  
  if (email.length > 254) return { isValid: false, error: 'Email muito longo' };
  
  return { isValid: true };
};

const validatePassword = (password: string, isSignup: boolean = false): { isValid: boolean; error?: string } => {
  if (!password) return { isValid: false, error: 'Senha é obrigatória' };
  
  if (isSignup) {
    if (password.length < 8) return { isValid: false, error: 'Senha deve ter pelo menos 8 caracteres' };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { isValid: false, error: 'Senha deve conter ao menos: 1 maiúscula, 1 minúscula e 1 número' };
    }
  }
  
  return { isValid: true };
};

// Sanitize input to prevent XSS
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/<[^>]*>?/gm, '');
};

// Secure Authentication Service
export const SecureAuthService = {
  // Enhanced sign in with security measures
  signIn: async (email: string, password: string) => {
    if (isAuthOperationInProgress) {
      return { success: false, error: "Operação em progresso" };
    }

    try {
      isAuthOperationInProgress = true;
      
      // Input validation
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return { success: false, error: emailValidation.error };
      }
      
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.error };
      }
      
      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email.toLowerCase());
      
      // Get user IP for rate limiting
      const userIP = await getUserIP();
      
      // Check rate limiting
      const canAttempt = await checkRateLimit(userIP);
      if (!canAttempt) {
        return { success: false, error: "Muitas tentativas. Aguarde 15 minutos." };
      }
      
      console.log("Iniciando login seguro para:", sanitizedEmail);
      
      // Clean auth state before login
      cleanupCompleteAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (signOutError) {
        console.log("Previous session cleanup:", signOutError);
      }
      
      // Perform login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password
      });
      
      // Log attempt
      await logAuthAttempt(sanitizedEmail, !error, userIP);
      
      if (error) {
        console.error("Login error:", error);
        
        // User-friendly error messages
        let errorMessage = "Erro no login. Tente novamente.";
        
        if (error.message?.includes("Invalid login credentials")) {
          errorMessage = "Email ou senha incorretos.";
        } else if (error.message?.includes("Email not confirmed")) {
          errorMessage = "Confirme seu email antes de fazer login.";
        } else if (error.message?.includes("Too many requests")) {
          errorMessage = "Muitas tentativas. Aguarde alguns minutos.";
        }
        
        return { success: false, error: errorMessage };
      }
      
      if (data.user && data.session) {
        console.log("Login seguro bem-sucedido:", data.user.id);
        
        // Log successful login action
        await supabase.rpc('log_user_action', {
          action_name: 'user_login',
          new_values: { email: sanitizedEmail, login_time: new Date().toISOString() }
        });
        
        return { success: true, data };
      }
      
      return { success: false, error: "Dados de autenticação inválidos" };
      
    } catch (error: any) {
      console.error("Erro durante login seguro:", error);
      return { success: false, error: "Erro inesperado. Tente novamente." };
    } finally {
      isAuthOperationInProgress = false;
    }
  },

  // Enhanced sign up with validation
  signUp: async (email: string, password: string, fullName: string) => {
    if (isAuthOperationInProgress) {
      return { success: false, error: "Operação em progresso" };
    }

    try {
      isAuthOperationInProgress = true;
      
      // Input validation
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return { success: false, error: emailValidation.error };
      }
      
      const passwordValidation = validatePassword(password, true);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.error };
      }
      
      if (!fullName.trim() || fullName.trim().length < 2) {
        return { success: false, error: "Nome completo é obrigatório" };
      }
      
      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email.toLowerCase());
      const sanitizedFullName = sanitizeInput(fullName);
      
      // Get user IP for rate limiting
      const userIP = await getUserIP();
      
      // Check rate limiting
      const canAttempt = await checkRateLimit(userIP);
      if (!canAttempt) {
        return { success: false, error: "Muitas tentativas. Aguarde 15 minutos." };
      }
      
      console.log("Iniciando cadastro seguro para:", sanitizedEmail);
      
      // Clean auth state before signup
      cleanupCompleteAuthState();
      
      // Perform signup
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: sanitizedFullName
          }
        }
      });
      
      // Log attempt
      await logAuthAttempt(sanitizedEmail, !error, userIP);
      
      if (error) {
        console.error("Signup error:", error);
        
        // User-friendly error messages
        let errorMessage = "Erro no cadastro. Tente novamente.";
        
        if (error.message?.includes("User already registered")) {
          errorMessage = "Este email já está cadastrado.";
        } else if (error.message?.includes("Password should be")) {
          errorMessage = "Senha deve atender aos critérios de segurança.";
        }
        
        return { success: false, error: errorMessage };
      }
      
      if (data.user) {
        console.log("Cadastro seguro bem-sucedido:", data.user.id);
        
        // Log successful signup action
        await supabase.rpc('log_user_action', {
          action_name: 'user_signup',
          new_values: { email: sanitizedEmail, signup_time: new Date().toISOString() }
        });
        
        return { success: true, data };
      }
      
      return { success: false, error: "Erro no cadastro" };
      
    } catch (error: any) {
      console.error("Erro durante cadastro seguro:", error);
      return { success: false, error: "Erro inesperado. Tente novamente." };
    } finally {
      isAuthOperationInProgress = false;
    }
  },

  // Secure sign out
  signOut: async () => {
    if (isAuthOperationInProgress) {
      return { success: false, error: "Operação em progresso" };
    }

    try {
      isAuthOperationInProgress = true;
      
      console.log("Iniciando logout seguro");
      
      // Log logout action before cleanup
      try {
        await supabase.rpc('log_user_action', {
          action_name: 'user_logout',
          new_values: { logout_time: new Date().toISOString() }
        });
      } catch (logError) {
        console.error("Error logging logout:", logError);
      }
      
      // Clean auth state
      cleanupCompleteAuthState();
      
      // Perform global sign out
      await supabase.auth.signOut({ scope: 'global' });
      
      // Additional cleanup after logout
      setTimeout(() => {
        cleanupCompleteAuthState();
      }, 100);
      
      console.log("Logout seguro concluído");
      return { success: true };
      
    } catch (error: any) {
      console.error("Erro durante logout seguro:", error);
      
      // Force cleanup even on error
      cleanupCompleteAuthState();
      
      return { success: false, error: error.message };
    } finally {
      isAuthOperationInProgress = false;
    }
  },

  // Get current session with validation
  getCurrentSession: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      // Validate session hasn't expired
      if (data.session && data.session.expires_at) {
        const expiresAt = new Date(data.session.expires_at * 1000);
        if (expiresAt <= new Date()) {
          console.log("Session expired, cleaning up");
          await SecureAuthService.signOut();
          return null;
        }
      }
      
      return data.session;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  },

  // Get user role with caching
  getUserRole: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      return data?.role || 'user';
    } catch (error) {
      console.error("Error getting user role:", error);
      return 'user';
    }
  },

  // Cleanup utility (public)
  cleanupAuthState: cleanupCompleteAuthState,

  // Validate session integrity
  validateSession: async (session: any) => {
    if (!session) return false;
    
    try {
      // Check if session is still valid by making a test API call
      const { error } = await supabase.from('profiles').select('id').limit(1);
      return !error;
    } catch (error) {
      console.error("Session validation failed:", error);
      return false;
    }
  }
};

// Setup secure auth listener
export const setupSecureAuthListener = (callback: (session: any) => void) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("=== SECURE AUTH STATE CHANGE ===");
    console.log("Event:", event);
    console.log("Session valid:", !!session);
    
    // Validate session integrity for signed in users
    if (event === 'SIGNED_IN' && session) {
      const isValid = await SecureAuthService.validateSession(session);
      if (!isValid) {
        console.log("Invalid session detected, signing out");
        await SecureAuthService.signOut();
        return;
      }
      
      toast.success("Login realizado com sucesso!");
    } else if (event === 'SIGNED_OUT') {
      cleanupCompleteAuthState();
    }
    
    callback(session);
  });
};