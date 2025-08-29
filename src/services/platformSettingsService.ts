// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

export interface PlatformSetting {
  id: string;
  key: string;
  value: any;
  description?: string;
  category: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  is_active: boolean;
}

// Cache para configurações para evitar múltiplas consultas
const settingsCache = new Map<string, { value: any; timestamp: number }>();
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

class PlatformSettingsService {
  // Valores padrão para quando a tabela não existe ainda
  private getDefaultValue(key: string): any {
    const defaults: Record<string, any> = {
      'default_llm_model': 'anthropic/claude-3-5-sonnet-20241022',
      'allow_user_model_selection': false,
      'max_conversation_history': 10,
      'enable_chat_cache': true
    };
    
    return defaults[key] || null;
  }

  // Obter uma configuração específica
  async getSetting(key: string): Promise<any> {
    try {
      // Verificar cache primeiro
      const cached = settingsCache.get(key);
      if (cached && Date.now() - cached.timestamp < SETTINGS_CACHE_TTL) {
        return cached.value;
      }

      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', key)
        .eq('is_active', true)
        .single();

      if (error) {
        // Se a tabela não existe, retornar valores padrão
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn(`Tabela platform_settings não existe. Usando valor padrão para ${key}`);
          return this.getDefaultValue(key);
        }
        
        console.error(`Erro ao buscar configuração ${key}:`, error);
        return this.getDefaultValue(key);
      }

      const value = data?.value;
      
      // Atualizar cache
      settingsCache.set(key, { value, timestamp: Date.now() });
      
      return value;
    } catch (error: any) {
      console.error(`Erro ao buscar configuração ${key}:`, error);
      
      // Se é erro de tabela não existir, usar padrão
      if (error.code === '42P01' || error.message?.includes('relation')) {
        console.warn(`Tabela platform_settings não encontrada. Usando valor padrão para ${key}`);
        return this.getDefaultValue(key);
      }
      
      return this.getDefaultValue(key);
    }
  }

  // Obter múltiplas configurações
  async getSettings(keys?: string[]): Promise<Record<string, any>> {
    try {
      let query = supabase
        .from('platform_settings')
        .select('key, value')
        .eq('is_active', true);

      if (keys && keys.length > 0) {
        query = query.in('key', keys);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar configurações:', error);
        return {};
      }

      const settings: Record<string, any> = {};
      data?.forEach(setting => {
        settings[setting.key] = setting.value;
        // Atualizar cache
        settingsCache.set(setting.key, { 
          value: setting.value, 
          timestamp: Date.now() 
        });
      });

      return settings;
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      return {};
    }
  }

  // Obter todas as configurações (admin apenas)
  async getAllSettings(): Promise<PlatformSetting[]> {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (error) {
        console.error('Erro ao buscar todas as configurações:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar todas as configurações:', error);
      return [];
    }
  }

  // Atualizar configuração (admin apenas)
  async updateSetting(key: string, value: any, description?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({ 
          value,
          description,
          updated_at: new Date().toISOString()
        })
        .eq('key', key);

      if (error) {
        console.error(`Erro ao atualizar configuração ${key}:`, error);
        return false;
      }

      // Limpar cache para esta configuração
      settingsCache.delete(key);
      
      return true;
    } catch (error) {
      console.error(`Erro ao atualizar configuração ${key}:`, error);
      return false;
    }
  }

  // Criar nova configuração (admin apenas)
  async createSetting(
    key: string, 
    value: any, 
    description: string, 
    category: string = 'general'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('platform_settings')
        .insert([{
          key,
          value,
          description,
          category,
          is_active: true
        }]);

      if (error) {
        console.error(`Erro ao criar configuração ${key}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Erro ao criar configuração ${key}:`, error);
      return false;
    }
  }

  // Deletar configuração (admin apenas)
  async deleteSetting(key: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('platform_settings')
        .delete()
        .eq('key', key);

      if (error) {
        console.error(`Erro ao deletar configuração ${key}:`, error);
        return false;
      }

      // Limpar cache
      settingsCache.delete(key);
      
      return true;
    } catch (error) {
      console.error(`Erro ao deletar configuração ${key}:`, error);
      return false;
    }
  }

  // Métodos de conveniência para configurações comuns
  async getDefaultLLMModel(): Promise<string> {
    const model = await this.getSetting('default_llm_model');
    return model || 'anthropic/claude-3-5-sonnet-20241022';
  }

  async setDefaultLLMModel(model: string): Promise<boolean> {
    return this.updateSetting('default_llm_model', model, 'Modelo LLM padrão para usuários não-admin');
  }

  async getUserModelSelectionAllowed(): Promise<boolean> {
    const allowed = await this.getSetting('allow_user_model_selection');
    return allowed === true || allowed === 'true';
  }

  async setUserModelSelectionAllowed(allowed: boolean): Promise<boolean> {
    return this.updateSetting('allow_user_model_selection', allowed, 'Permite que usuários não-admin selecionem modelos LLM');
  }

  // Limpar cache manualmente
  clearCache(): void {
    settingsCache.clear();
  }

  // Obter configurações por categoria
  async getSettingsByCategory(category: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .eq('category', category)
        .eq('is_active', true);

      if (error) {
        console.error(`Erro ao buscar configurações da categoria ${category}:`, error);
        return {};
      }

      const settings: Record<string, any> = {};
      data?.forEach(setting => {
        settings[setting.key] = setting.value;
      });

      return settings;
    } catch (error) {
      console.error(`Erro ao buscar configurações da categoria ${category}:`, error);
      return {};
    }
  }
}

export const platformSettingsService = new PlatformSettingsService();