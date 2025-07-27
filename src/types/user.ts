
import { AppRole } from "./app";

export interface UserAccount {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  organization: string;
  role: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
  profile_id?: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}
