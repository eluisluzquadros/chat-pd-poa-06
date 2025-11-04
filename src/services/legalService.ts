import { supabase } from "@/integrations/supabase/client";
import type { LegalDocument, UserConsent, CookiePreferences, DocumentType, ConsentMetadata } from "@/types/legal";

export class LegalService {
  // Legal Documents
  static async getActiveLegalDocuments(): Promise<LegalDocument[]> {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('is_active', true)
      .order('document_type');

    if (error) throw error;
    return data || [];
  }

  static async getDocumentByType(type: DocumentType): Promise<LegalDocument | null> {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('document_type', type)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // User Consents
  static async getUserConsents(userId: string): Promise<UserConsent[]> {
    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .order('consented_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async checkUserHasAllConsents(userId: string): Promise<boolean> {
    const documents = await this.getActiveLegalDocuments();
    const consents = await this.getUserConsents(userId);
    
    const requiredTypes: DocumentType[] = ['terms', 'privacy', 'cookies'];
    const consentedTypes = new Set(consents.map(c => c.document_type));
    
    return requiredTypes.every(type => consentedTypes.has(type));
  }

  static async createConsent(
    userId: string,
    documentId: string,
    documentType: DocumentType,
    documentVersion: string,
    metadata?: ConsentMetadata
  ): Promise<void> {
    const { error } = await supabase
      .from('user_consents')
      .insert({
        user_id: userId,
        document_id: documentId,
        document_type: documentType,
        document_version: documentVersion,
        ip_address: metadata?.ip_address,
        user_agent: metadata?.user_agent,
        metadata: metadata || {}
      });

    if (error) throw error;

    // Update user_accounts timestamps
    const timestampField = `${documentType}_accepted_at`;
    await supabase
      .from('user_accounts')
      .update({ [timestampField]: new Date().toISOString() })
      .eq('user_id', userId);
  }

  static async revokeConsent(consentId: string): Promise<void> {
    const { error } = await supabase
      .from('user_consents')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', consentId);

    if (error) throw error;
  }

  // Cookie Preferences
  static async getCookiePreferences(userId?: string, sessionId?: string): Promise<CookiePreferences | null> {
    let query = supabase.from('cookie_preferences').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else {
      return null;
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async saveCookiePreferences(
    preferences: Omit<CookiePreferences, 'id' | 'created_at' | 'updated_at'>
  ): Promise<void> {
    const { error } = await supabase
      .from('cookie_preferences')
      .upsert(
        {
          ...preferences,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: preferences.user_id ? 'user_id' : 'session_id'
        }
      );

    if (error) throw error;

    // Update user_accounts if user is logged in
    if (preferences.user_id) {
      await supabase
        .from('user_accounts')
        .update({ cookies_accepted_at: new Date().toISOString() })
        .eq('user_id', preferences.user_id);
    }
  }

  static async migrateCookiePreferences(sessionId: string, userId: string): Promise<void> {
    const sessionPrefs = await this.getCookiePreferences(undefined, sessionId);
    
    if (sessionPrefs) {
      await this.saveCookiePreferences({
        user_id: userId,
        essential_cookies: sessionPrefs.essential_cookies,
        analytics_cookies: sessionPrefs.analytics_cookies,
        functional_cookies: sessionPrefs.functional_cookies
      });

      // Delete session preferences
      await supabase
        .from('cookie_preferences')
        .delete()
        .eq('session_id', sessionId);
    }
  }

  // Utility
  static getClientMetadata(): ConsentMetadata {
    return {
      user_agent: navigator.userAgent,
      source: window.location.pathname
    };
  }

  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
