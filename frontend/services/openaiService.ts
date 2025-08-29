
import { supabase } from "@/integrations/supabase/client";

interface ThreadMessage {
  role: string;
  content: string[];
  file_ids?: string[];
}

export class OpenAIService {
  private assistantId: string | null = null;
  private vectorStoreId: string | null = null;
  private threadId: string | null = null;

  constructor() {
    // IDs will be loaded from secrets table
  }

  private async getAssistantId(): Promise<string> {
    if (this.assistantId) return this.assistantId;
    
    // For now, return a placeholder or get from environment
    this.assistantId = 'asst_placeholder';
    return this.assistantId;
  }

  private async getVectorStoreId(): Promise<string> {
    if (this.vectorStoreId) return this.vectorStoreId;
    
    // For now, return a placeholder or get from environment
    this.vectorStoreId = 'vs_placeholder';
    return this.vectorStoreId;
  }

  private async getHeaders() {
    // For now, return placeholder headers
    // In production, this should get the API key from Supabase secrets
    return {
      'Authorization': `Bearer sk-placeholder`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v1'
    };
  }

  async createThread() {
    const headers = await this.getHeaders();
    const response = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to create thread');
    }

    const thread = await response.json();
    this.threadId = thread.id;
    return thread.id;
  }

  async sendMessage(content: string) {
    if (!this.threadId) {
      this.threadId = await this.createThread();
    }

    const headers = await this.getHeaders();
    const response = await fetch(`https://api.openai.com/v1/threads/${this.threadId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        role: "user",
        content,
        file_ids: []
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return this.runAssistant();
  }

  private async runAssistant() {
    const headers = await this.getHeaders();
    const assistantId = await this.getAssistantId();
    const response = await fetch(`https://api.openai.com/v1/threads/${this.threadId}/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        assistant_id: assistantId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to run assistant');
    }

    const run = await response.json();
    return this.waitForCompletion(run.id);
  }

  private async waitForCompletion(runId: string) {
    const headers = await this.getHeaders();
    let status = 'in_progress';

    while (status === 'in_progress' || status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(
        `https://api.openai.com/v1/threads/${this.threadId}/runs/${runId}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Failed to check run status');
      }

      const run = await response.json();
      status = run.status;

      if (status === 'completed') {
        return this.getLatestMessage();
      } else if (status === 'failed' || status === 'cancelled' || status === 'expired') {
        throw new Error(`Run failed with status: ${status}`);
      }
    }
  }

  private async getLatestMessage(): Promise<ThreadMessage> {
    const headers = await this.getHeaders();
    const response = await fetch(
      `https://api.openai.com/v1/threads/${this.threadId}/messages`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    const { data } = await response.json();
    return data[0];
  }
}

export const openAIService = new OpenAIService();

