// Enhanced functions for the knowledge-updater edge function

export function parseAnalysisResponse(analysis: string) {
  const sections = {
    diagnosis: extractSection(analysis, 'DIAGNÓSTICO', 'CONTEÚDO'),
    content: {
      text: extractSection(analysis, 'CONTEÚDO SUGERIDO', 'LOCALIZAÇÃO'),
      metadata: {}
    },
    location: {
      file: extractSection(analysis, 'LOCALIZAÇÃO', 'REFERÊNCIAS') || 'knowledge_base/plano_diretor.md',
      section: 'Seção apropriada',
      position: 'Após conteúdo relacionado'
    },
    references: [],
    metadata: extractMetadata(analysis)
  };

  return sections;
}

function extractSection(text: string, startMarker: string, endMarker?: string): string {
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) return '';
  
  const contentStart = startIndex + startMarker.length;
  let contentEnd = text.length;
  
  if (endMarker) {
    const endIndex = text.indexOf(endMarker, contentStart);
    if (endIndex !== -1) {
      contentEnd = endIndex;
    }
  }
  
  return text.substring(contentStart, contentEnd).trim();
}

function extractMetadata(analysis: string): Record<string, any> {
  const metadata: Record<string, any> = {};
  
  // Extract common metadata patterns
  if (analysis.includes('coeficiente')) metadata.coeficientes = true;
  if (analysis.includes('altura')) metadata.alturas = true;
  if (analysis.includes('bairro')) metadata.bairros = true;
  if (analysis.includes('zoneamento')) metadata.zoneamento = true;
  
  return metadata;
}

export function calculateContentPriority(gap: any, existingDocCount: number): number {
  let priority = 1;
  
  // Severity impact
  switch (gap.severity) {
    case 'critical': priority += 4; break;
    case 'high': priority += 3; break;
    case 'medium': priority += 2; break;
    case 'low': priority += 1; break;
  }
  
  // Confidence impact
  if (gap.confidence_score && gap.confidence_score < 0.3) priority += 2;
  
  // Existing content impact (less existing = higher priority)
  if (existingDocCount === 0) priority += 2;
  else if (existingDocCount < 3) priority += 1;
  
  return Math.min(priority, 10);
}

export async function approveAndIntegrateContent(contentId: string, supabase: any) {
  // Get the content to approve
  const { data: content, error } = await supabase
    .from('knowledge_gap_content')
    .select('*')
    .eq('id', contentId)
    .single();

  if (error) throw new Error(`Content not found: ${error.message}`);

  // Update content status to approved
  await supabase
    .from('knowledge_gap_content')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'system' // In real implementation, use actual user ID
    })
    .eq('id', contentId);

  // Create embedding for the content
  const embedding = await createEmbedding(content.content);

  // Add to documents table
  const { data: newDoc } = await supabase
    .from('documents')
    .insert({
      title: content.title,
      content: content.content,
      metadata: {
        ...content.metadata,
        source: 'knowledge_gap_resolution',
        gap_id: content.gap_id,
        generated_by: content.generated_by,
        category: content.metadata?.category || 'plano_diretor'
      },
      embedding
    })
    .select()
    .single();

  // Create chunks for better retrieval
  const chunks = chunkContent(content.content, content.title);
  const chunkInserts = await Promise.all(
    chunks.map(async (chunk, index) => {
      const chunkEmbedding = await createEmbedding(chunk.content);
      return {
        document_id: newDoc.id,
        content: chunk.content,
        metadata: {
          ...chunk.metadata,
          chunk_index: index,
          source: 'knowledge_gap_resolution'
        },
        embedding: chunkEmbedding
      };
    })
  );

  await supabase
    .from('document_chunks')
    .insert(chunkInserts);

  // Mark the gap as resolved
  await supabase
    .from('knowledge_gaps')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: 'system',
      resolution_notes: `Content approved and integrated. Document ID: ${newDoc.id}`
    })
    .eq('id', content.gap_id);

  // Create resolution record
  await supabase
    .from('knowledge_gap_resolutions')
    .insert({
      gap_id: content.gap_id,
      content_id: contentId,
      resolution_type: 'new_content',
      integrated_into_documents: [newDoc.id],
      embeddings_updated: true,
      resolved_by: 'system',
      notes: 'Automatically integrated approved content'
    });

  return {
    success: true,
    documentId: newDoc.id,
    chunksCreated: chunks.length,
    message: 'Content successfully approved and integrated into knowledge base'
  };
}

export async function rejectContent(contentId: string, reason: string, supabase: any) {
  await supabase
    .from('knowledge_gap_content')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'system',
      review_notes: reason
    })
    .eq('id', contentId);

  return {
    success: true,
    message: 'Content rejected. Reason recorded for future improvement.'
  };
}

export async function autoResolveGap(gapId: string, supabase: any) {
  // Check if there's approved content for this gap
  const { data: approvedContent } = await supabase
    .from('knowledge_gap_content')
    .select('*')
    .eq('gap_id', gapId)
    .eq('status', 'approved')
    .limit(1);

  if (approvedContent && approvedContent.length > 0) {
    // Integrate the approved content
    return await approveAndIntegrateContent(approvedContent[0].id, supabase);
  }

  return {
    success: false,
    message: 'No approved content available for auto-resolution'
  };
}

// Helper function to create embeddings
async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}

// Helper function to chunk content for better retrieval
function chunkContent(content: string, title: string) {
  const maxChunkSize = 1000;
  const chunks = [];
  
  // Split by paragraphs first
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          title: `${title} - Parte ${chunkIndex + 1}`,
          chunk_type: 'paragraph',
          chunk_index: chunkIndex
        }
      });
      currentChunk = paragraph;
      chunkIndex++;
    } else {
      currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
    }
  }
  
  // Add the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: {
        title: `${title} - Parte ${chunkIndex + 1}`,
        chunk_type: 'paragraph',
        chunk_index: chunkIndex
      }
    });
  }
  
  return chunks;
}