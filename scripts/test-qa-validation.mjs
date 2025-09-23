import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

// Casos de teste do Sistema de Validação QA
const testCases = [
  {
    id: 1,
    query: "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    expectedAnswer: "Art. 81 - III",
    category: "regulatory"
  },
  {
    id: 2,
    query: "Qual a regra para empreendimentos do 4º distrito?",
    expectedAnswer: "Art. 74",
    category: "regulatory"
  },
  {
    id: 3,
    query: "Quais bairros têm risco de inundação?",
    expectedAnswer: "Lista de bairros com risco",
    category: "risk"
  },
  {
    id: 4,
    query: "O que diz sobre altura de edificação?",
    expectedAnswer: "Art. 81 e Art. 23",
    category: "regulatory"
  },
  {
    id: 5,
    query: "Qual o risco do Centro Histórico?",
    expectedAnswer: "Risco Muito Alto - Inundação e Alagamento",
    category: "risk"
  }
];

async function searchDocuments(query) {
  try {
    // Gerar embedding para a query
    const { data: embData, error: embError } = await supabase.functions
      .invoke('generate-text-embedding', {
        body: { text: query }
      });
    
    if (embError || !embData?.embedding) {
      // Fallback: busca por palavras-chave
      return await searchByKeywords(query);
    }
    
    // Buscar documentos similares
    const { data: matches, error: matchError } = await supabase
      .rpc('match_hierarchical_documents', {
        query_embedding: embData.embedding,
        match_count: 5,
        document_ids: [],
        query_text: query
      });
    
    if (matchError || !matches) {
      return await searchByKeywords(query);
    }
    
    return matches;
  } catch (error) {
    console.error('Erro na busca:', error);
    return await searchByKeywords(query);
  }
}

async function searchByKeywords(query) {
  const keywords = query.toLowerCase().split(' ');
  const results = [];
  
  // Buscar chunks por palavras-chave
  const { data: chunks } = await supabase
    .from('document_embeddings')
    .select('content_chunk, chunk_metadata')
    .limit(10);
  
  if (chunks) {
    for (const chunk of chunks) {
      const content = chunk.content_chunk.toLowerCase();
      const score = keywords.filter(k => content.includes(k)).length;
      
      if (score > 0) {
        results.push({
          content_chunk: chunk.content_chunk,
          chunk_metadata: chunk.chunk_metadata,
          similarity: score / keywords.length,
          boosted_score: score / keywords.length
        });
      }
    }
  }
  
  return results.sort((a, b) => b.boosted_score - a.boosted_score).slice(0, 5);
}

async function searchRiskData(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('centro histórico')) {
    const { data } = await supabase
      .rpc('get_riscos_bairro', { nome_bairro: 'CENTRO HISTÓRICO' });
    return data;
  } else if (lowerQuery.includes('inundação') || lowerQuery.includes('enchente')) {
    const { data } = await supabase
      .from('bairros_risco_desastre')
      .select('bairro_nome, nivel_risco_geral, observacoes')
      .eq('risco_inundacao', true)
      .order('nivel_risco_geral', { ascending: false })
      .limit(10);
    return data;
  }
  
  return null;
}

async function runTests() {
  console.log('🧪 SISTEMA DE VALIDAÇÃO QA - CASOS DE TESTE\n');
  console.log('=' .repeat(60) + '\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📝 Teste ${testCase.id}: "${testCase.query}"`);
    console.log(`   Resposta esperada: ${testCase.expectedAnswer}`);
    console.log(`   Categoria: ${testCase.category}`);
    console.log('   ' + '-'.repeat(50));
    
    let result = null;
    let foundAnswer = '';
    
    if (testCase.category === 'risk') {
      // Buscar dados de risco
      const riskData = await searchRiskData(testCase.query);
      
      if (riskData && riskData.length > 0) {
        if (testCase.query.includes('Centro Histórico')) {
          const risk = riskData[0];
          foundAnswer = `${risk.descricao_riscos} - ${risk.riscos_ativos.join(' e ')}`;
          console.log(`   ✅ Encontrado: ${foundAnswer}`);
          result = foundAnswer.includes('Muito Alto') && foundAnswer.includes('Inundação');
        } else {
          console.log(`   ✅ Encontrados ${riskData.length} bairros com risco:`);
          riskData.slice(0, 5).forEach(b => {
            console.log(`      - ${b.bairro_nome}`);
          });
          result = riskData.length > 0;
        }
      }
    } else {
      // Buscar em documentos
      const matches = await searchDocuments(testCase.query);
      
      if (matches && matches.length > 0) {
        const topMatch = matches[0];
        foundAnswer = topMatch.content_chunk.substring(0, 150);
        
        console.log(`   📄 Melhor resultado:`);
        console.log(`      ${foundAnswer}...`);
        
        if (topMatch.chunk_metadata) {
          const meta = topMatch.chunk_metadata;
          console.log(`   📊 Metadados:`);
          console.log(`      - Artigo: ${meta.articleNumber || 'N/A'}`);
          console.log(`      - Tipo: ${meta.type || 'N/A'}`);
          
          if (meta.incisoNumber) {
            console.log(`      - Inciso: ${meta.incisoNumber}`);
          }
          if (meta.hasCertification) {
            console.log(`      - ✅ Tem certificação`);
          }
          if (meta.has4thDistrict) {
            console.log(`      - ✅ Tem 4º distrito`);
          }
        }
        
        // Verificar se a resposta está correta
        if (testCase.id === 1 && foundAnswer.includes('Art. 81') && foundAnswer.includes('III')) {
          result = true;
        } else if (testCase.id === 2 && foundAnswer.includes('Art. 74')) {
          result = true;
        } else if (testCase.id === 4 && foundAnswer.includes('Art. 81')) {
          result = true;
        }
      }
    }
    
    if (result) {
      console.log(`   ✅ PASSOU`);
      passed++;
    } else {
      console.log(`   ❌ FALHOU`);
      failed++;
    }
  }
  
  // Resumo final
  console.log('\n\n' + '=' .repeat(60));
  console.log('📊 RESUMO DOS TESTES:\n');
  console.log(`   Total de testes: ${testCases.length}`);
  console.log(`   ✅ Passaram: ${passed} (${Math.round(passed/testCases.length*100)}%)`);
  console.log(`   ❌ Falharam: ${failed} (${Math.round(failed/testCases.length*100)}%)`);
  
  // Status do sistema
  console.log('\n\n📋 STATUS DO SISTEMA:');
  
  const { count: totalChunks } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true });
  
  const { count: totalRisks } = await supabase
    .from('bairros_risco_desastre')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   - Chunks de documentos: ${totalChunks}`);
  console.log(`   - Registros de risco: ${totalRisks}`);
  
  if (passed >= 3) {
    console.log('\n✅ SISTEMA APROVADO - Funcionalidade básica operacional');
  } else {
    console.log('\n⚠️ SISTEMA PRECISA DE AJUSTES');
  }
}

runTests().catch(console.error);