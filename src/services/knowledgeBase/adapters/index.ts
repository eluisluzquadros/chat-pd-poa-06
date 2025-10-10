import { KnowledgeBaseAdapter, KnowledgeBaseConfig, RetrievalSettings } from './types';
import { LlamaCloudAdapter } from './llamacloud';

export function getKnowledgeBaseAdapter(
  provider: string,
  config: KnowledgeBaseConfig,
  retrievalSettings: RetrievalSettings,
  apiKey: string
): KnowledgeBaseAdapter {
  switch (provider.toLowerCase()) {
    case 'llamacloud':
      return new LlamaCloudAdapter(config, retrievalSettings, apiKey);
    
    case 'pinecone':
      // Future implementation
      throw new Error('Pinecone adapter not yet implemented');
    
    case 'weaviate':
      // Future implementation
      throw new Error('Weaviate adapter not yet implemented');
    
    case 'custom':
      throw new Error('Custom adapter requires implementation');
    
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export * from './types';
export { LlamaCloudAdapter };
