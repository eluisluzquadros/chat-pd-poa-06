import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const useAuthState = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);
  const navigate = useNavigate();

  // This is a crucial function that syncs with Supabase's current authentication state
  const refreshAuthState = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Refreshing auth state...");
      
      // Check for direct session override from localStorage (for force syncing)
      if (typeof window !== 'undefined') {
        const forceSyncUserId = localStorage.getItem('authUserIdToSync');
        if (forceSyncUserId) {
          console.log("Found forced sync user ID in localStorage:", forceSyncUserId);
          localStorage.removeItem('authUserIdToSync');
          
          // Manually set the authenticated state with this user ID
          setIsAuthenticated(true);
          setUserId(forceSyncUserId);
          
          // Still proceed with the normal session check to get expiry etc.
        }
      }
      
      // Get current session from Supabase
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error getting session:", error);
        setIsAuthenticated(false);
        setUserId(null);
        setSessionExpiry(null);
        return;
      }
      
      const session = data?.session;
      
      if (session) {
        console.log("Valid session found:", session.user.id);
        
        // Set auth state with session data
        setIsAuthenticated(true);
        setUserId(session.user.id);
        
        if (session.expires_at) {
          const expiryDate = new Date(session.expires_at * 1000);
          setSessionExpiry(expiryDate);
          
          // Log expiry time for debugging
          console.log("Session expires at:", expiryDate.toLocaleString());
        }
        
        // Also store the user ID in sessionStorage for recovery
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('lastAuthenticatedUserId', session.user.id);
        }
      } else {
        console.log("No active session found");
        
        // Try one more approach - check localStorage directly for Supabase tokens
        // This is a backup approach for cases where getSession might not be working correctly
        if (typeof window !== 'undefined') {
          const hasSupabaseToken = Object.keys(localStorage).some(key => 
            key.includes('supabase.auth.token') || 
            key.includes('sb-') || 
            key.includes('urbanista-auth')
          );
          
          const lastAuthUserId = sessionStorage.getItem('lastAuthenticatedUserId');
          
          if (hasSupabaseToken && lastAuthUserId) {
            console.log("Found auth tokens but getSession returned no session. Using backup approach.");
            setIsAuthenticated(true);
            setUserId(lastAuthUserId);
            // Can't set expiry when using this backup approach
          } else {
            setIsAuthenticated(false);
            setUserId(null);
            setSessionExpiry(null);
          }
        } else {
          setIsAuthenticated(false);
          setUserId(null);
          setSessionExpiry(null);
        }
      }
    } catch (error) {
      console.error('Error refreshing auth state:', error);
      setIsAuthenticated(false);
      setUserId(null);
      setSessionExpiry(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add a special handler for successful login that ensures states are correctly set
  const handleSuccessfulLogin = useCallback(async (userId: string) => {
    console.log("Handling successful login for user:", userId);
    setIsAuthenticated(true);
    setUserId(userId);
    
    // Store in sessionStorage for recovery
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lastAuthenticatedUserId', userId);
    }
    
    // Force a refresh to get the full session details
    await refreshAuthState();
  }, [refreshAuthState]);

  // Effect to auto-refresh auth state when session is about to expire
  useEffect(() => {
    if (!sessionExpiry) return;
    
    const now = new Date();
    const timeUntilExpiry = sessionExpiry.getTime() - now.getTime();
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry
    
    if (timeUntilExpiry <= refreshThreshold) {
      console.log("Session about to expire, refreshing token...");
      supabase.auth.refreshSession();
    }
  }, [sessionExpiry]);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Starting sign out process");
      
      // First clear the role from session storage
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('lastAuthenticatedUserId');
        sessionStorage.removeItem('urbanista-user-role');
      }
      
      // Then do the API call
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear local storage - do this after API call in case API fails
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('urbanista-auth-token');
        
        // Also clear any other potential auth tokens
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
      }
      
      // Update local state
      setIsAuthenticated(false);
      setUserId(null);
      setSessionExpiry(null);
      
      toast.success("Logout realizado com sucesso");
      navigate('/auth', { replace: true });
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error("Erro ao fazer logout: " + error.message);
      
      // Force a logout even if there's an error
      setIsAuthenticated(false);
      setUserId(null);
      setSessionExpiry(null);
      navigate('/auth', { replace: true });
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  return {
    isAuthenticated,
    isLoading,
    userId,
    sessionExpiry,
    refreshAuthState,
    signOut,
    handleSuccessfulLogin, // Add this new method
  };
};
