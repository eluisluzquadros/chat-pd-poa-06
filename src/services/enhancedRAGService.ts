/**
 * Enhanced RAG Service with Admin Test Mode Support
 * Handles routing between global configuration and admin test overrides
 */

import { unifiedRAGService, RAGRequestOptions } from '@/lib/unifiedRAGService';
import { getRagEndpoint } from '@/config/rag-config';
import { platformSettingsService } from '@/services/platformSettingsService';

export interface EnhancedRAGOptions extends RAGRequestOptions {
  isAdminTestMode?: boolean;
  testRAGMode?: 'local' | 'dify';
  testModel?: string;
}

export class EnhancedRAGService {
  private static instance: EnhancedRAGService;
  
  static getInstance(): EnhancedRAGService {
    if (!EnhancedRAGService.instance) {
      EnhancedRAGService.instance = new EnhancedRAGService();
    }
    return EnhancedRAGService.instance;
  }

  /**
   * Get the effective RAG endpoint based on admin test mode or global config
   */
  private async getEffectiveEndpoint(isAdminTestMode?: boolean, testRAGMode?: 'local' | 'dify'): Promise<string> {
    if (isAdminTestMode && testRAGMode) {
      console.log(`🧪 [EnhancedRAGService] Using admin test mode: ${testRAGMode}`);
      return testRAGMode === 'dify' ? 'agentic-rag-dify' : 'agentic-rag';
    }
    
    // Use global configuration
    const endpoint = await getRagEndpoint();
    console.log(`🌐 [EnhancedRAGService] Using global configuration: ${endpoint}`);
    return endpoint;
  }

  /**
   * Call RAG with enhanced admin test mode support
   */
  async callRAG(options: EnhancedRAGOptions): Promise<any> {
    const requestId = `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🚀 [EnhancedRAGService] Starting enhanced RAG call - ID: ${requestId}`);
    console.log(`🔧 [EnhancedRAGService] Admin test mode:`, {
      isAdminTestMode: options.isAdminTestMode,
      testRAGMode: options.testRAGMode,
      testModel: options.testModel,
      userRole: options.userRole
    });

    // Get effective endpoint
    const effectiveEndpoint = await this.getEffectiveEndpoint(options.isAdminTestMode, options.testRAGMode);
    
    // Prepare options for unified RAG service
    const unifiedOptions: RAGRequestOptions = {
      message: options.message,
      model: options.isAdminTestMode && options.testModel ? options.testModel : options.model,
      sessionId: options.sessionId,
      userId: options.userId,
      userRole: options.userRole, // Preserve original userRole
      bypassCache: options.bypassCache
    };

    console.log(`📝 [EnhancedRAGService] Final options:`, {
      requestId,
      endpoint: effectiveEndpoint,
      model: unifiedOptions.model,
      userRole: unifiedOptions.userRole,
      isTestMode: options.isAdminTestMode
    });

    // Call unified RAG service
    const result = await unifiedRAGService.callRAG(unifiedOptions);
    
    // Add test mode metadata
    result.metadata = {
      ...result.metadata,
      isAdminTestMode: options.isAdminTestMode || false,
      testRAGMode: options.testRAGMode,
      testModel: options.testModel,
      requestId
    };

    console.log(`✅ [EnhancedRAGService] Enhanced RAG call completed:`, {
      requestId,
      hasResponse: !!result.response,
      confidence: result.confidence,
      isTestMode: options.isAdminTestMode
    });

    return result;
  }

  /**
   * Get system status including test mode information
   */
  async getSystemStatus(): Promise<{
    version: string;
    globalEndpoint: string;
    features: string[];
    testModeAvailable: boolean;
  }> {
    const baseStatus = await unifiedRAGService.getSystemStatus();
    const globalEndpoint = await getRagEndpoint();
    
    return {
      ...baseStatus,
      version: 'enhanced',
      globalEndpoint,
      testModeAvailable: true,
      features: [
        ...baseStatus.features,
        'Admin Test Mode',
        'Dynamic Endpoint Switching',
        'Preserved User Context'
      ]
    };
  }
}

// Export singleton instance
export const enhancedRAGService = EnhancedRAGService.getInstance();