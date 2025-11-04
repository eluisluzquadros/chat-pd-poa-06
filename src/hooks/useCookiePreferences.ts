import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LegalService } from '@/services/legalService';
import type { CookiePreferences } from '@/types/legal';
import { toast } from 'sonner';

const STORAGE_KEY = 'cookie_session_id';

export const useCookiePreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential_cookies: true,
    analytics_cookies: true,
    functional_cookies: true
  });
  const [loading, setLoading] = useState(true);
  const [hasSetPreferences, setHasSetPreferences] = useState(false);

  const getOrCreateSessionId = (): string => {
    let sessionId = localStorage.getItem(STORAGE_KEY);
    if (!sessionId) {
      sessionId = LegalService.generateSessionId();
      localStorage.setItem(STORAGE_KEY, sessionId);
    }
    return sessionId;
  };

  const loadPreferences = async () => {
    try {
      setLoading(true);
      
      let prefs: CookiePreferences | null = null;
      
      if (user) {
        prefs = await LegalService.getCookiePreferences(user.id);
        
        // Migrate session preferences if exists
        const sessionId = localStorage.getItem(STORAGE_KEY);
        if (sessionId && !prefs) {
          await LegalService.migrateCookiePreferences(sessionId, user.id);
          prefs = await LegalService.getCookiePreferences(user.id);
          localStorage.removeItem(STORAGE_KEY);
        }
      } else {
        const sessionId = getOrCreateSessionId();
        prefs = await LegalService.getCookiePreferences(undefined, sessionId);
      }

      if (prefs) {
        setPreferences(prefs);
        setHasSetPreferences(true);
      } else {
        setHasSetPreferences(false);
      }
    } catch (error) {
      console.error('Error loading cookie preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const updatePreferences = async (newPreferences: Partial<CookiePreferences>) => {
    try {
      const updatedPrefs = { ...preferences, ...newPreferences };
      
      const saveData: Omit<CookiePreferences, 'id' | 'created_at' | 'updated_at'> = {
        essential_cookies: updatedPrefs.essential_cookies,
        analytics_cookies: updatedPrefs.analytics_cookies,
        functional_cookies: updatedPrefs.functional_cookies,
        ...(user ? { user_id: user.id } : { session_id: getOrCreateSessionId() })
      };

      await LegalService.saveCookiePreferences(saveData);
      setPreferences(updatedPrefs);
      setHasSetPreferences(true);
      toast.success('Preferências de cookies atualizadas');
    } catch (error) {
      console.error('Error updating cookie preferences:', error);
      toast.error('Erro ao atualizar preferências');
      throw error;
    }
  };

  const acceptAll = async () => {
    await updatePreferences({
      essential_cookies: true,
      analytics_cookies: true,
      functional_cookies: true
    });
  };

  const rejectNonEssential = async () => {
    await updatePreferences({
      essential_cookies: true,
      analytics_cookies: false,
      functional_cookies: false
    });
  };

  return {
    preferences,
    loading,
    hasSetPreferences,
    updatePreferences,
    acceptAll,
    rejectNonEssential,
    refreshPreferences: loadPreferences
  };
};
