// Sistema de Chunking Hierárquico para Documentos Legais
// Otimizado para identificar artigos, incisos e parágrafos com precisão

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

// Interface para chunk hierárquico
export interface HierarchicalChunk {
  id: string;
  type: 'article' | 'inciso' | 'paragraph' | 'section';
  articleNumber?: string;
  incisoNumber?: string;
  paragraphNumber?: string;
  text: string;
  metadata: {
    keywords: string[];
    references: string[];
    hasCertification: boolean;
    has4thDistrict: boolean;
    hasImportantKeywords: boolean;
    parentArticle?: string;
    children?: string[];
  };
}

// Padrões regex para detecção de estruturas legais
export const LegalPatterns = {
  // Artigos - formato principal
  article: /Art\.\s*(\d+)\.?\s*(?:[-–—]\s*)?/gi,
  
  // Incisos - ordem de prioridade
  incisoWithDot: /\b([IVX]+)\.\s*--\s*([^;\n]+)/g, // Formato principal: III. --
  incisoWithDash: /\b([IVX]+)\s*[-–—]\s*([^;\n]+)/g, // Outros formatos
  
  // Parágrafos
  paragraph: /§\s*(\d+º?)\s*[-–—]?\s*([^§\n]+)/g,
  
  // Alíneas
  alinea: /\b([a-z])\)\s*([^;]+)/g,
  
  // Referências
  lawReference: /lei\s+(?:complementar\s+)?n[º°]\s*\d+/gi,
  zotReference: /zot\s*\d+(?:\.\d+)?/gi,
  annexReference: /anexo\s*\d+(?:\.\d+)?/gi,
};

// Keywords importantes para chunking adicional
const IMPORTANT_KEYWORDS = [
  'certificação em sustentabilidade ambiental',
  '4º distrito',
  'quarto distrito',
  'zot 8.2',
  'estudo de impacto de vizinhança',
  'regime urbanístico',
  'altura máxima',
  'coeficiente de aproveitamento',
  'taxa de ocupação',
  'recuo',
  'edificação',
  'empreendimento',
  'outorga onerosa',
];

// Função para detectar keywords importantes
function hasImportantKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return IMPORTANT_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

// Função para detectar certificação
function hasCertificationKeyword(text: string): boolean {
  const lowerText = text.toLowerCase();
  return lowerText.includes('certificação') && 
         (lowerText.includes('sustentabilidade') || lowerText.includes('ambiental'));
}

// Função para detectar 4º distrito
function has4thDistrictKeyword(text: string): boolean {
  const lowerText = text.toLowerCase();
  return lowerText.includes('4º distrito') || 
         lowerText.includes('quarto distrito') ||
         (lowerText.includes('zot 8.2') && lowerText.includes('distrito'));
}

// Função para extrair keywords
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Keywords compostas
  IMPORTANT_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword.toLowerCase())) {
      keywords.push(keyword);
    }
  });
  
  // Referências legais
  const lawRefs = text.match(LegalPatterns.lawReference) || [];
  const zotRefs = text.match(LegalPatterns.zotReference) || [];
  const annexRefs = text.match(LegalPatterns.annexReference) || [];
  
  keywords.push(...lawRefs, ...zotRefs, ...annexRefs);
  
  return [...new Set(keywords)]; // Remove duplicatas
}

// Função para extrair referências
function extractReferences(text: string): string[] {
  const references: string[] = [];
  
  // Referências a outros artigos
  const articleRefs = text.match(/Art\.\s*\d+/gi) || [];
  
  // Referências a leis
  const lawRefs = text.match(LegalPatterns.lawReference) || [];
  
  // Referências a anexos
  const annexRefs = text.match(LegalPatterns.annexReference) || [];
  
  references.push(...articleRefs, ...lawRefs, ...annexRefs);
  
  return [...new Set(references)];
}

// Função principal de chunking hierárquico
export async function createHierarchicalChunks(content: string): Promise<HierarchicalChunk[]> {
  const chunks: HierarchicalChunk[] = [];
  let chunkId = 0;
  
  // Divide o conteúdo por artigos
  const articleMatches = Array.from(content.matchAll(LegalPatterns.article));
  
  for (let i = 0; i < articleMatches.length; i++) {
    const currentMatch = articleMatches[i];
    const nextMatch = articleMatches[i + 1];
    
    const articleNumber = currentMatch[1];
    const startIndex = currentMatch.index!;
    const endIndex = nextMatch ? nextMatch.index! : content.length;
    
    // Extrai o texto completo do artigo
    const articleText = content.substring(startIndex, endIndex).trim();
    
    // Cria chunk principal do artigo
    const articleChunk: HierarchicalChunk = {
      id: `chunk-${++chunkId}`,
      type: 'article',
      articleNumber,
      text: articleText,
      metadata: {
        keywords: extractKeywords(articleText),
        references: extractReferences(articleText),
        hasCertification: hasCertificationKeyword(articleText),
        has4thDistrict: has4thDistrictKeyword(articleText),
        hasImportantKeywords: hasImportantKeywords(articleText),
        children: []
      }
    };
    
    chunks.push(articleChunk);
    
    // Processa incisos dentro do artigo
    const incisoMatches = [
      ...Array.from(articleText.matchAll(LegalPatterns.incisoWithDot)),
      ...Array.from(articleText.matchAll(LegalPatterns.incisoWithDash))
    ].sort((a, b) => (a.index || 0) - (b.index || 0));
    
    for (const incisoMatch of incisoMatches) {
      const incisoNumber = incisoMatch[1];
      const incisoText = incisoMatch[2].trim();
      
      // Cria chunk adicional para incisos com keywords importantes
      if (hasImportantKeywords(incisoText) || 
          hasCertificationKeyword(incisoText) || 
          has4thDistrictKeyword(incisoText)) {
        
        const incisoChunk: HierarchicalChunk = {
          id: `chunk-${++chunkId}`,
          type: 'inciso',
          articleNumber,
          incisoNumber,
          text: `Art. ${articleNumber} - ${incisoNumber}: ${incisoText}`,
          metadata: {
            keywords: extractKeywords(incisoText),
            references: extractReferences(incisoText),
            hasCertification: hasCertificationKeyword(incisoText),
            has4thDistrict: has4thDistrictKeyword(incisoText),
            hasImportantKeywords: true,
            parentArticle: articleChunk.id
          }
        };
        
        chunks.push(incisoChunk);
        articleChunk.metadata.children!.push(incisoChunk.id);
      }
    }
    
    // Processa parágrafos dentro do artigo
    const paragraphMatches = Array.from(articleText.matchAll(LegalPatterns.paragraph));
    
    for (const paragraphMatch of paragraphMatches) {
      const paragraphNumber = paragraphMatch[1];
      const paragraphText = paragraphMatch[2].trim();
      
      // Cria chunk para parágrafos importantes
      if (hasImportantKeywords(paragraphText)) {
        const paragraphChunk: HierarchicalChunk = {
          id: `chunk-${++chunkId}`,
          type: 'paragraph',
          articleNumber,
          paragraphNumber,
          text: `Art. ${articleNumber} - ${paragraphNumber}: ${paragraphText}`,
          metadata: {
            keywords: extractKeywords(paragraphText),
            references: extractReferences(paragraphText),
            hasCertification: hasCertificationKeyword(paragraphText),
            has4thDistrict: has4thDistrictKeyword(paragraphText),
            hasImportantKeywords: true,
            parentArticle: articleChunk.id
          }
        };
        
        chunks.push(paragraphChunk);
        articleChunk.metadata.children!.push(paragraphChunk.id);
      }
    }
  }
  
  console.log(`Created ${chunks.length} hierarchical chunks`);
  console.log(`Articles: ${chunks.filter(c => c.type === 'article').length}`);
  console.log(`Incisos: ${chunks.filter(c => c.type === 'inciso').length}`);
  console.log(`Paragraphs: ${chunks.filter(c => c.type === 'paragraph').length}`);
  
  return chunks;
}

// Função para integração com o sistema existente
export async function processDocumentWithHierarchicalChunking(
  content: string,
  documentId: string,
  supabase: ReturnType<typeof createClient>
): Promise<number> {
  
  // Cria chunks hierárquicos
  const hierarchicalChunks = await createHierarchicalChunks(content);
  
  // Insere chunks na base de dados com metadados enriquecidos
  for (const chunk of hierarchicalChunks) {
    const { error } = await supabase
      .from('document_embeddings')
      .insert({
        document_id: documentId,
        content_chunk: chunk.text,
        chunk_metadata: {
          type: chunk.type,
          articleNumber: chunk.articleNumber,
          incisoNumber: chunk.incisoNumber,
          paragraphNumber: chunk.paragraphNumber,
          keywords: chunk.metadata.keywords,
          references: chunk.metadata.references,
          hasCertification: chunk.metadata.hasCertification,
          has4thDistrict: chunk.metadata.has4thDistrict,
          hasImportantKeywords: chunk.metadata.hasImportantKeywords,
          parentArticle: chunk.metadata.parentArticle,
          children: chunk.metadata.children
        }
      });
      
    if (error) {
      console.error('Error inserting hierarchical chunk:', error);
      throw error;
    }
  }
  
  console.log(`Successfully processed ${hierarchicalChunks.length} hierarchical chunks`);
  return hierarchicalChunks.length;
}

// Função para busca otimizada com chunks hierárquicos
export function scoreHierarchicalChunk(
  chunk: HierarchicalChunk,
  query: string,
  baseScore: number
): number {
  let score = baseScore;
  const lowerQuery = query.toLowerCase();
  
  // Boost para match exato de artigo
  if (chunk.articleNumber && lowerQuery.includes(`art. ${chunk.articleNumber}`) || 
      lowerQuery.includes(`artigo ${chunk.articleNumber}`)) {
    score *= 1.5;
  }
  
  // Boost para match de inciso específico
  if (chunk.incisoNumber && lowerQuery.includes(chunk.incisoNumber.toLowerCase())) {
    score *= 1.3;
  }
  
  // Boost especial para certificação sustentável
  if (chunk.metadata.hasCertification && 
      (lowerQuery.includes('certificação') || lowerQuery.includes('sustentabilidade'))) {
    score *= 1.8;
  }
  
  // Boost máximo para 4º distrito + Art. 74
  if (chunk.metadata.has4thDistrict && chunk.articleNumber === '74') {
    score *= 2.0;
  }
  
  // Boost para keywords importantes
  if (chunk.metadata.hasImportantKeywords) {
    score *= 1.2;
  }
  
  // Penalização para chunks genéricos
  if (!chunk.metadata.hasImportantKeywords && chunk.type === 'article' && 
      chunk.metadata.keywords.length < 3) {
    score *= 0.7;
  }
  
  return Math.min(score, 1.0); // Cap at 1.0
}

// Export para debug
export function debugChunk(chunk: HierarchicalChunk): void {
  console.log('=== CHUNK DEBUG ===');
  console.log('ID:', chunk.id);
  console.log('Type:', chunk.type);
  console.log('Article:', chunk.articleNumber);
  console.log('Inciso:', chunk.incisoNumber);
  console.log('Keywords:', chunk.metadata.keywords);
  console.log('Has Certification:', chunk.metadata.hasCertification);
  console.log('Has 4th District:', chunk.metadata.has4thDistrict);
  console.log('Text preview:', chunk.text.substring(0, 100) + '...');
  console.log('==================');
}