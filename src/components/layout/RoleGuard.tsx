
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  supervisorOnly?: boolean;
  redirectTo?: string;
}

export const RoleGuard = ({ 
  children, 
  adminOnly = false,
  supervisorOnly = false,
  redirectTo = "/auth" 
}: RoleGuardProps) => {
  const { isAdmin, isSupervisor, isLoading, userRole, refreshAuthState } = useAuth();
  const [isCheckingRoles, setIsCheckingRoles] = useState(true);
  const location = useLocation();
  
  // Force auth refresh when component mounts to ensure role is loaded
  useEffect(() => {
    const initCheck = async () => {
      try {
        console.log("RoleGuard: Refreshing auth state");
        await refreshAuthState();
      } catch (error) {
        console.error("RoleGuard: Error refreshing auth state:", error);
      }
    };
    
    initCheck();
  }, [refreshAuthState]);
  
  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsCheckingRoles(false);
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  // When loading completes, update checking state
  useEffect(() => {
    if (!isLoading && isCheckingRoles) {
      setIsCheckingRoles(false);
    }
  }, [isLoading, isCheckingRoles]);
  
  // Log role info for debugging
  useEffect(() => {
    console.log("RoleGuard: Current role info:", { 
      isAdmin, 
      isSupervisor,
      userRole,
      adminOnly,
      supervisorOnly,
      path: location.pathname
    });
  }, [isAdmin, isSupervisor, userRole, adminOnly, supervisorOnly, location.pathname]);
  
  // If roles are still loading, show a brief loading indicator
  if ((isLoading || isCheckingRoles) && !userRole) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }
  
  // Try loading role from session storage if not available yet
  if (!userRole && typeof window !== 'undefined') {
    const cachedRole = sessionStorage.getItem('urbanista-user-role');
    if (cachedRole) {
      console.log("RoleGuard: Using cached role from session storage:", cachedRole);
      
      // We can make a decision based on the cached role
      const hasAccess = (adminOnly && cachedRole === 'admin') || 
                        (supervisorOnly && (cachedRole === 'supervisor' || cachedRole === 'admin')) || 
                        (!adminOnly && !supervisorOnly);
                        
      if (!hasAccess) {
        console.log("RoleGuard: Access denied based on cached role");
        return <Navigate to={redirectTo} replace state={{ from: location }} />;
      }
      
      // If they have access based on cached role, let them in
      console.log("RoleGuard: Access granted based on cached role");
      return <>{children}</>;
    }
  }
  
  // Check if user has required role
  const hasAccess = (adminOnly && isAdmin) || 
                    (supervisorOnly && (isSupervisor || isAdmin)) || 
                    (!adminOnly && !supervisorOnly);
  
  if (!hasAccess) {
    console.log("RoleGuard: Access denied based on role check", {
      path: location.pathname,
      userRole,
      adminOnly,
      supervisorOnly,
      redirectTo
    });
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  console.log("RoleGuard: Access granted");
  return <>{children}</>;
};
