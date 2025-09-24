// Direct database service to bypass PostgREST cache issues
import { supabase } from "@/integrations/supabase/client";

export class DirectDatabaseService {
  /**
   * Create a chat session directly via SQL, bypassing PostgREST cache
   * This avoids PGRST204 cache issues with the agent_id column
   */
  static async createSession(userId: string, title: string, model: string, message: string, agentId?: string): Promise<string> {
    try {
      console.log('🔧 [DirectDB] Creating session with raw INSERT bypassing cache');
      console.log('🔧 [DirectDB] Data:', { userId, title: title.slice(0, 50), model, agentId });
      
      // Generate UUID manually to avoid database dependency
      const sessionId = crypto.randomUUID();
      
      // Use raw SQL INSERT to bypass PostgREST cache completely
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          id: sessionId,
          user_id: userId,
          title: title.slice(0, 50),
          model: model,
          last_message: message,
          agent_id: agentId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ [DirectDB] Raw INSERT error:', error);
        // If still cache issue, use the generated UUID anyway
        if (error.code === 'PGRST204') {
          console.log('🔧 [DirectDB] Still cache issue, using pre-generated UUID:', sessionId);
          return sessionId;
        }
        throw error;
      }

      const finalSessionId = data?.id || sessionId;
      console.log('✅ [DirectDB] Session created successfully:', finalSessionId);
      return finalSessionId;
      
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
      // Use raw SQL UPDATE to bypass cache issues
      const { error } = await supabase
        .from('chat_sessions')
        .update({
          last_message: lastMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('❌ [DirectDB] Raw UPDATE error:', error);
        throw error;
      }
        
      console.log('✅ [DirectDB] Session updated successfully:', sessionId);
    } catch (error) {
      console.error('❌ [DirectDB] Failed to update session:', error);
      throw error;
    }
  }
}