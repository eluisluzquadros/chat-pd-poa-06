// Direct database service to bypass PostgREST cache issues
import { chatSessions } from "../../shared/schema";
import { eq } from "drizzle-orm";

export class DirectDatabaseService {
  /**
   * Create a chat session directly in the database, bypassing PostgREST
   * This avoids PGRST204 cache issues with the agent_id column
   */
  static async createSession(userId: string, title: string, model: string, message: string, agentId?: string): Promise<string> {
    try {
      console.log('🔧 [DirectDB] Creating session with direct database connection');
      console.log('🔧 [DirectDB] Data:', { userId, title: title.slice(0, 50), model, agentId });
      
      // Import database dynamically to avoid module loading issues
      const dbModule = await import("../../server/db");
      const db = dbModule.db;
      
      const sessionData = {
        user_id: userId,
        title: title.slice(0, 50),
        model,
        last_message: message,
        agent_id: agentId || null,
      };

      const [newSession] = await db
        .insert(chatSessions)
        .values(sessionData)
        .returning({ id: chatSessions.id });

      console.log('✅ [DirectDB] Session created successfully:', newSession.id);
      return newSession.id;
      
    } catch (error) {
      console.error('❌ [DirectDB] Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Update session last message directly in the database
   */
  static async updateSession(sessionId: string, lastMessage: string): Promise<void> {
    try {
      // Import database dynamically to avoid module loading issues
      const dbModule = await import("../../server/db");
      const db = dbModule.db;
      
      await db
        .update(chatSessions)
        .set({ 
          last_message: lastMessage,
          updated_at: new Date()
        })
        .where(eq(chatSessions.id, sessionId));
        
      console.log('✅ [DirectDB] Session updated successfully:', sessionId);
    } catch (error) {
      console.error('❌ [DirectDB] Failed to update session:', error);
      throw error;
    }
  }
}