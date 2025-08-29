import { WEBHOOK_CONFIG, WEBHOOK_HEADERS } from "@/config/webhook";
import type { WebhookRequest, WebhookResponse } from "@/types/chat";

export class WebhookService {
  private async makeRequest(data: WebhookRequest): Promise<WebhookResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_CONFIG.TIMEOUT_MS);

    console.log('Sending webhook request:', data);
    console.log('Webhook URL:', WEBHOOK_CONFIG.N8N_WEBHOOK_URL);

    try {
      const response = await fetch(WEBHOOK_CONFIG.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: WEBHOOK_HEADERS,
        body: JSON.stringify(data),
        signal: controller.signal,
        mode: 'cors', // Explicitly set CORS mode
      });

      clearTimeout(timeoutId);
      console.log('Webhook response status:', response.status);
      console.log('Webhook response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Webhook error response:', errorText);
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // First, let's see the raw response text
      const responseText = await response.text();
      console.log('Raw webhook response:', responseText);

      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('Parsed webhook response:', result);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        // If it's not JSON, treat the raw text as the response
        result = { response: responseText };
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Webhook request error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Webhook request timed out');
      }
      
      throw error;
    }
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= WEBHOOK_CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < WEBHOOK_CONFIG.RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, WEBHOOK_CONFIG.RETRY_DELAY_MS));
        }
      }
    }
    
    throw lastError;
  }

  async sendMessage(message: string, sessionId: string, userRole: string): Promise<string> {
    const webhookRequest: WebhookRequest = {
      message,
      sessionId,
      userRole,
      timestamp: new Date().toISOString(),
    };

    console.log('WebhookService.sendMessage called with:', { message, sessionId, userRole });

    try {
      const response = await this.withRetry(() => this.makeRequest(webhookRequest));
      
      console.log('Webhook response received:', response);
      
      console.log('Checking response structure:', response);
      console.log('Available fields:', Object.keys(response || {}));
      
      // Check for various possible response formats
      const responseText = response?.response || 
                          response?.message || 
                          response?.content || 
                          response?.reply || 
                          response?.text || 
                          response?.output ||
                          (typeof response === 'string' ? response : null);

      if (!responseText) {
        console.error('No valid response text found in webhook response:', response);
        console.error('Available fields:', Object.keys(response || {}));
        throw new Error(`Invalid webhook response: no response text found. Available fields: ${Object.keys(response || {}).join(', ')}`);
      }

      console.log('Extracted response text:', responseText);
      return responseText;
    } catch (error) {
      console.error('Webhook service error:', error);
      
      // Provide more specific error messages based on error type
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Erro de conectividade: Verifique se o webhook N8N está acessível e configurado para CORS');
      }
      
      throw new Error(
        error instanceof Error 
          ? `Falha na comunicação com o assistente: ${error.message}`
          : 'Falha na comunicação com o assistente'
      );
    }
  }
}

export const webhookService = new WebhookService();