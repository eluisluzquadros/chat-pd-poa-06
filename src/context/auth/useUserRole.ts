import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/types/app";

export const useUserRole = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isAnalyst, setIsAnalyst] = useState(false);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchedIdRef = useRef<string | null>(null);
  
  // Flag to track if a role fetch is in progress
  const isFetchingRef = useRef(false);

  const resetRoles = useCallback(() => {
    setUserRole(null);
    setIsAdmin(false);
    setIsSupervisor(false);
    setIsAnalyst(false);
    lastFetchedIdRef.current = null;
    
    // Clear session storage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('urbanista-user-role');
    }
  }, []);

  // Function to set all role states based on a role value
  const applyRole = useCallback((role: AppRole | null) => {
    console.log("Applying role:", role);
    setUserRole(role);
    setIsAdmin(role === 'admin');
    setIsSupervisor(role === 'supervisor');
    setIsAnalyst(role === 'analyst' || role === 'admin' || role === 'supervisor');
    
    // Store in session storage for quick recovery
    if (typeof window !== 'undefined') {
      if (role) {
        sessionStorage.setItem('urbanista-user-role', role);
      } else {
        sessionStorage.removeItem('urbanista-user-role');
      }
    }
  }, []);

  const fetchUserRole = useCallback(async (userId: string) => {
    // Skip if already fetching or if we already fetched for this user
    if (isFetchingRef.current) {
      console.log("Role fetch already in progress, skipping");
      return;
    }
    
    if (lastFetchedIdRef.current === userId && userRole !== null) {
      console.log("Role already fetched for user:", userId, "Current role:", userRole);
      return;
    }
    
    // Try to get role from session storage first for immediate response
    if (typeof window !== 'undefined') {
      const cachedRole = sessionStorage.getItem('urbanista-user-role') as AppRole | null;
      if (cachedRole) {
        console.log("Using cached role from session storage:", cachedRole);
        applyRole(cachedRole);
        // Still proceed with DB check to verify
      }
    }
    
    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      console.log("Fetching role for user:", userId);
      
      // First try user_roles table
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        // Don't reset roles here, as we might have a valid cached role
        return;
      }

      // If no role found in user_roles, check if user is in user_accounts with role
      if (!data || !data.role) {
        console.log("No role found in user_roles table, checking user_accounts...");
        
        const { data: accountData, error: accountError } = await supabase
          .from('user_accounts')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (accountError) {
          console.error('Error fetching user account:', accountError);
          // Still don't reset roles here
          return;
        }
        
        if (accountData && accountData.role) {
          const accountRole = accountData.role as AppRole;
          console.log("Found role in user_accounts:", accountRole);
          
          applyRole(accountRole);
          lastFetchedIdRef.current = userId;
          
          // Cache this role in user_roles
          try {
            console.log("Creating entry in user_roles for user:", userId);
            await supabase.functions.invoke('set-user-role', {
              body: {
                userId: userId,
                role: accountRole
              }
            });
          } catch (roleError) {
            console.error('Error setting user role:', roleError);
            // Continue anyway - at least we set the local state correctly
          }
          
          return;
        } else {
          console.log("No role found in user_accounts either, setting default role");
          // Default to citizen if no role found
          applyRole('citizen');
          lastFetchedIdRef.current = userId;
          return;
        }
      }

      const role = data?.role as AppRole | null;
      console.log("User role fetched from user_roles:", role);
      
      applyRole(role);
      lastFetchedIdRef.current = userId;
    } catch (error) {
      console.error('Error fetching user role:', error);
      // Only reset if we don't have a cached role
      if (!userRole) {
        resetRoles();
      }
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [resetRoles, userRole, applyRole]);

  return {
    isAdmin,
    isSupervisor,
    isAnalyst,
    userRole,
    fetchUserRole,
    resetRoles,
    isLoading
  };
};
