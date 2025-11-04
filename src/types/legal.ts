export type DocumentType = 'terms' | 'privacy' | 'cookies';

export interface LegalDocument {
  id: string;
  document_type: DocumentType;
  version: string;
  title: string;
  content: string;
  effective_date: string;
  is_active: boolean;
  created_at: string;
  created_by?: string;
}

export interface UserConsent {
  id: string;
  user_id: string;
  document_id: string;
  document_type: DocumentType;
  document_version: string;
  consented_at: string;
  ip_address?: string;
  user_agent?: string;
  revoked_at?: string;
  metadata?: Record<string, any>;
}

export interface CookiePreferences {
  id?: string;
  user_id?: string;
  session_id?: string;
  essential_cookies: boolean;
  analytics_cookies: boolean;
  functional_cookies: boolean;
  updated_at?: string;
  created_at?: string;
}

export interface ConsentMetadata {
  ip_address?: string;
  user_agent?: string;
  source?: string;
}
