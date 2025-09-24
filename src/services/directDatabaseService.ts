// Direct database service to bypass PostgREST cache issues
import { supabase } from "@/integrations/supabase/client";

export class DirectDatabaseService {
  /**
   * Create a chat session directly via SQL, bypassing PostgREST cache
   * This avoids PGRST204 cache issues with the agent_id column
   */
  static async createSession(userId: string, title: string, model: string, message: string, agentId?: string): Promise<string> {
    try {
      console.log('🔧 [DirectDB] Creating session with direct SQL query');
      console.log('🔧 [DirectDB] Data:', { userId, title: title.slice(0, 50), model, agentId });
      
      // Use direct SQL query to bypass PostgREST cache completely
      const { data, error } = await supabase.rpc('create_chat_session_direct', {
        p_user_id: userId,
        p_title: title.slice(0, 50),
        p_model: model,
        p_last_message: message,
        p_agent_id: agentId || null
      });

      if (error) {
        console.error('❌ [DirectDB] SQL RPC error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No session ID returned from database');
      }

      console.log('✅ [DirectDB] Session created successfully via SQL:', data);
      return data;
      
    } catch (error) {
      console.error('❌ [DirectDB] Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Update session last message directly via SQL
   */
  static async updateSession(sessionId: string, lastMessage: string): Promise<void> {
    try {
      // Use direct SQL query to bypass PostgREST cache
      const { error } = await supabase.rpc('update_chat_session_direct', {
        p_session_id: sessionId,
        p_last_message: lastMessage
      });

      if (error) {
        console.error('❌ [DirectDB] SQL RPC update error:', error);
        throw error;
      }
        
      console.log('✅ [DirectDB] Session updated successfully via SQL:', sessionId);
    } catch (error) {
      console.error('❌ [DirectDB] Failed to update session:', error);
      throw error;
    }
  }
}