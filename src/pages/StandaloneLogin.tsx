import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";

// Create a standalone Supabase client just for this component
const standaloneSupabase = createClient(
  "https://xmsnlikpmmhzmuemxtrk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhtc25saWtwbW1oem11ZW14dHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg3MDI1NjUsImV4cCI6MjA1NDI3ODU2NX0.Y3sQBu3jBDbIt_UejmbF6kHqbTeBbas6fhHfEf7xiRg"
);

const StandaloneLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState('direct'); // 'direct', 'password', 'session', 'email'
  const [error, setError] = useState('');
  const [debug, setDebug] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Clear any existing sessions on load
  useEffect(() => {
    const clearAll = async () => {
      addDebug("Component mounted - clearing previous auth state");
      
      // Clear any existing auth state
      try {
        await standaloneSupabase.auth.signOut();
        addDebug("Successfully called signOut");
      } catch (e) {
        addDebug(`Error in signOut: ${e.message}`);
      }
      
      // Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('urbanista-auth-token');
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
        addDebug("Cleared local storage auth items");
      }
    };
    
    clearAll();
  }, []);

  const addDebug = (message: string) => {
    console.log(`[StandaloneLogin]: ${message}`);
    setDebug(prev => [...prev, `${new Date().toISOString().substring(11, 19)} - ${message}`]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Email e senha são necessários');
      return;
    }
    
    setError('');
    setLoading(true);
    addDebug(`Attempting login with method: ${loginMethod}`);
    
    try {
      let loginSuccess = false;
      let userId = null;
      
      // Try the selected login method
      if (loginMethod === 'direct') {
        addDebug("Using direct login method");
        
        // First clean any existing sessions
        await standaloneSupabase.auth.signOut();
        
        // Then try login
        const { data, error } = await standaloneSupabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          addDebug(`Direct login error: ${error.message}`);
          throw error;
        }
        
        if (data.user) {
          userId = data.user.id;
          addDebug(`Login successful for user: ${userId}`);
          setUserId(userId);
          loginSuccess = true;
          
          // Store session in localStorage directly
          if (data.session) {
            if (typeof window !== 'undefined') {
              // Save the token using Supabase's specific storage key
              const storageKey = 'sb-' + 'xmsnlikpmmhzmuemxtrk' + '-auth-token';
              localStorage.setItem(storageKey, JSON.stringify({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at
              }));
              
              // Also store the user ID for recovery
              localStorage.setItem('authUserIdToSync', userId);
              localStorage.setItem('authUserSyncRequired', 'true');
              sessionStorage.setItem('lastAuthenticatedUserId', userId);
              sessionStorage.setItem('urbanista-user-role', 'admin'); // Assume admin for testing
              sessionStorage.setItem('standalone_login_success', 'true');
              
              addDebug("Stored session data in localStorage and sessionStorage");
            }
          }
        }
      } 
      else if (loginMethod === 'password') {
        addDebug("Using password login method");
        const { data, error } = await standaloneSupabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          addDebug(`Password login error: ${error.message}`);
          throw error;
        }
        
        if (data.user) {
          userId = data.user.id;
          addDebug(`Login successful for user: ${userId}`);
          setUserId(userId);
          loginSuccess = true;
          
          // Store info in session/localStorage
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('standalone_login_success', 'true');
            sessionStorage.setItem('lastAuthenticatedUserId', userId);
            localStorage.setItem('authUserIdToSync', userId);
            localStorage.setItem('authUserSyncRequired', 'true');
          }
        }
      }
      else if (loginMethod === 'session') {
        addDebug("Using session login method");
        // Try first getting and storing session tokens
        const { data, error } = await standaloneSupabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          addDebug(`Session login error: ${error.message}`);
          throw error;
        }
        
        if (data.session) {
          userId = data.user?.id || null;
          
          // Manually store the session
          if (typeof window !== 'undefined') {
            localStorage.setItem('standaloneToken', data.session.access_token);
            
            // Also set auth sync flags
            sessionStorage.setItem('standalone_login_success', 'true');
            localStorage.setItem('authUserIdToSync', userId);
            localStorage.setItem('authUserSyncRequired', 'true');
            sessionStorage.setItem('lastAuthenticatedUserId', userId);
          }
          
          addDebug(`Got session token: ${data.session.access_token.substring(0, 10)}...`);
          loginSuccess = true;
          setUserId(userId);
        }
      }
      else if (loginMethod === 'email') {
        addDebug("Using email OTP method");
        const { data, error } = await standaloneSupabase.auth.signInWithOtp({
          email
        });
        
        if (error) {
          addDebug(`Email OTP error: ${error.message}`);
          throw error;
        }
        
        toast.success("Email de confirmação enviado! Verifique sua caixa de entrada.");
        addDebug("OTP email sent");
        setLoading(false);
        return; // Don't proceed with redirect since OTP flow requires email verification
      }
      
      if (loginSuccess) {
        addDebug("Login successful, redirecting");
        toast.success("Login bem sucedido!");
        
        // Force the app to reload completely for a clean state
        setTimeout(() => {
          // Use replace location to force a complete reload
          window.location.replace('/');
        }, 1000);
      } else {
        addDebug("No login success despite no errors");
        throw new Error("Login falhou sem erro específico");
      }
    } catch (err) {
      addDebug(`Login error: ${err.message}`);
      setError(err.message.includes("Invalid login") 
        ? "Credenciais inválidas" 
        : `Erro: ${err.message}`);
      setLoading(false);
    }
  };

  const renderDebugInfo = () => (
    <div className="mt-8 p-4 bg-gray-800 text-gray-300 rounded-md text-xs overflow-auto max-h-60">
      <h3 className="text-sm font-bold mb-2">Debug Info:</h3>
      {debug.map((line, i) => (
        <div key={i} className="mb-1">{line}</div>
      ))}
      {userId && (
        <div className="mt-4 p-2 bg-green-900/30 rounded">
          <p className="font-bold">User ID: {userId}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen pb-16 pt-24">
      <div className="flex-1 flex flex-col p-8 items-center justify-center">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">
              Login Alternativo
            </h2>
            <p className="mt-2 text-muted-foreground">
              Use este login se o normal não estiver funcionando
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary"
                  placeholder="seu@email.com"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-secondary pr-10"
                    placeholder="********"
                    disabled={loading || loginMethod === 'email'}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="loginMethod">Método de Login</Label>
                <select
                  id="loginMethod"
                  className="w-full h-10 px-3 border rounded bg-secondary"
                  value={loginMethod}
                  onChange={(e) => setLoginMethod(e.target.value)}
                  disabled={loading}
                >
                  <option value="direct">Login Direto (Recomendado)</option>
                  <option value="password">Senha (Alternativo)</option>
                  <option value="session">Token de Sessão</option>
                  <option value="email">Email OTP (Não precisa de senha)</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/20 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                  Entrando...
                </span>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button 
              variant="link" 
              onClick={() => window.location.href = '/auth'}
              disabled={loading}
            >
              Voltar para login normal
            </Button>
          </div>
          
          {renderDebugInfo()}
        </div>
      </div>
    </div>
  );
};

export default StandaloneLogin;
