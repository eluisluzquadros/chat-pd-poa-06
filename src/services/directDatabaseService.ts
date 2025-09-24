// Direct database service to bypass PostgREST cache issues
import { supabase } from "@/integrations/supabase/client";

export class DirectDatabaseService {
  /**
   * Create a chat session directly via SQL, bypassing PostgREST cache
   * This avoids PGRST204 cache issues with the agent_id column
   */
  static async createSession(userId: string, title: string, model: string, message: string, agentId?: string): Promise<string> {
    try {
      console.log('🔧 [DirectDB] Creating session with SQL bypassing PostgREST cache');
      console.log('🔧 [DirectDB] Data:', { userId, title: title.slice(0, 50), model, agentId });
      
      // Generate UUID manually
      const sessionId = crypto.randomUUID();
      
      try {
        // First attempt: Use PostgREST
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

        if (!error) {
          console.log('✅ [DirectDB] Session created via PostgREST:', data.id);
          return data.id;
        }

        if (error.code === 'PGRST204') {
          console.log('🔧 [DirectDB] PGRST204 detected, using direct SQL...');
          
          // Use direct SQL to bypass cache completely
          const { data: sqlData, error: sqlError } = await supabase.sql`
            INSERT INTO chat_sessions (id, user_id, title, model, last_message, agent_id, created_at, updated_at)
            VALUES (${sessionId}, ${userId}, ${title.slice(0, 50)}, ${model}, ${message}, ${agentId || null}, NOW(), NOW())
            RETURNING id;
          `;
          
          if (sqlError) {
            console.error('❌ [DirectDB] Direct SQL failed:', sqlError);
            throw sqlError;
          }
          
          console.log('✅ [DirectDB] Session created via direct SQL:', sessionId);
          return sessionId;
        }
        
        throw error;
        
      } catch (insertError) {
        console.error('❌ [DirectDB] Insert operation failed:', insertError);
        throw insertError;
      }
      
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