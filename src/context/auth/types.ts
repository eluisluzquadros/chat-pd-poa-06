
import { AppRole } from "@/types/app";
import { User, Session } from "@supabase/supabase-js";

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isAnalyst: boolean;
  userRole: AppRole | null;
  userId: string | null;
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
  refreshAuthState: () => Promise<void>;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isAnalyst: boolean;
  userRole: AppRole | null;
  userId: string | null;
  user: User | null;
  session: Session | null;
}
