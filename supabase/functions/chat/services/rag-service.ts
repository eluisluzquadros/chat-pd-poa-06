interface LlamaCloudNode {
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

interface LlamaCloudResponse {
  nodes: LlamaCloudNode[];
}

export async function retrieveContext(
  query: string,
  indexId: string,
  apiKey: string
): Promise<string> {
  console.log('🔍 [RAG] Retrieving context from LlamaCloud...', { 
    indexId,
    queryLength: query.length 
  });
  
  try {
    const response = await fetch(
      `https://api.cloud.llamaindex.ai/api/v1/pipelines/${indexId}/retrieve`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          top_k: 5,
          similarity_cutoff: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [RAG] LlamaCloud API Error:', response.status, errorText);
      throw new Error(`LlamaCloud API error: ${response.status}`);
    }

    const data: LlamaCloudResponse = await response.json();
    
    if (!data.nodes || data.nodes.length === 0) {
      console.log('⚠️ [RAG] No context nodes found');
      return '';
    }

    const context = data.nodes
      .map((node, i) => `[${i + 1}] ${node.text}`)
      .join('\n\n');
    
    const avgScore = data.nodes.reduce((sum, n) => sum + n.score, 0) / data.nodes.length;
    
    console.log('✅ [RAG] Context retrieved', { 
      nodesCount: data.nodes.length,
      contextLength: context.length,
      avgScore: avgScore.toFixed(3)
    });
    
    return context;
  } catch (error) {
    console.error('🔥 [RAG] Error retrieving context:', error);
    throw error;
  }
}
