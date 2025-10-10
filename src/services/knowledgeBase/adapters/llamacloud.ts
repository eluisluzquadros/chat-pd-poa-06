import { KnowledgeBaseAdapter, RetrievalRequest, RetrievalResult } from './types';

interface LlamaCloudNode {
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

interface LlamaCloudResponse {
  nodes: LlamaCloudNode[];
}

export class LlamaCloudAdapter extends KnowledgeBaseAdapter {
  async retrieve(request: RetrievalRequest): Promise<RetrievalResult[]> {
    const { query, topK, scoreThreshold } = request;
    const indexId = this.config.index_id;

    if (!indexId) {
      throw new Error('LlamaCloud index_id not configured');
    }

    console.log('🔍 [LlamaCloudAdapter] Retrieving context...', {
      indexId,
      queryLength: query.length,
      topK: topK || this.retrievalSettings.top_k,
      scoreThreshold: scoreThreshold || this.retrievalSettings.score_threshold,
    });

    try {
      const response = await fetch(
        `https://api.cloud.llamaindex.ai/api/v1/pipelines/${indexId}/retrieve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            top_k: topK || this.retrievalSettings.top_k,
            similarity_cutoff: scoreThreshold || this.retrievalSettings.score_threshold,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [LlamaCloudAdapter] API Error:', response.status, errorText);
        throw new Error(`LlamaCloud API error: ${response.status}`);
      }

      const data: LlamaCloudResponse = await response.json();

      if (!data.nodes || data.nodes.length === 0) {
        console.log('⚠️ [LlamaCloudAdapter] No results found');
        return [];
      }

      console.log('✅ [LlamaCloudAdapter] Retrieved', data.nodes.length, 'results');

      return data.nodes.map(node => ({
        text: node.text,
        score: node.score,
        metadata: node.metadata,
      }));
    } catch (error) {
      console.error('🔥 [LlamaCloudAdapter] Error:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const testResult = await this.retrieve({
        query: 'test connection',
        topK: 1,
        scoreThreshold: 0.5,
      });
      return true;
    } catch (error) {
      console.error('❌ [LlamaCloudAdapter] Connection test failed:', error);
      return false;
    }
  }
}
