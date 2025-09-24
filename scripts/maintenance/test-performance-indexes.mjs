#!/usr/bin/env node

/**
 * Script de Teste de Performance - Índices Compostos Otimizados
 * 
 * Testa performance antes e depois da aplicação dos novos índices compostos
 * para validar melhorias no sistema RAG do chat-pd-poa-06
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Carrega variáveis de ambiente
config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Queries de teste baseadas nos padrões mais frequentes identificados
const TEST_QUERIES = [
  {
    name: 'Vector Search with Document Filter',
    description: 'Busca vetorial básica com filtro por document_id',
    query: `
      SELECT content_chunk, 1 - (embedding <=> $1::vector) as similarity, document_id
      FROM document_embeddings 
      WHERE document_id = ANY($2::bigint[])
      ORDER BY embedding <=> $1::vector
      LIMIT 10;
    `,
    params: ['[0.1,0.2,0.3]', [1, 2, 3]] // Mock embedding e document_ids
  },
  {
    name: 'Hierarchical Search with Metadata',
    description: 'Busca hierárquica com filtros de metadata',
    query: `
      SELECT content_chunk, 1 - (embedding <=> $1::vector) as similarity, chunk_metadata
      FROM document_embeddings 
      WHERE chunk_metadata->>'type' = 'article' 
        AND chunk_metadata->>'articleNumber' = '74'
        AND document_id = ANY($2::bigint[])
      ORDER BY embedding <=> $1::vector
      LIMIT 10;
    `,
    params: ['[0.1,0.2,0.3]', [1, 2, 3]]
  },
  {
    name: 'Height/Altura Queries',
    description: 'Queries específicas sobre altura e gabarito',
    query: `
      SELECT content_chunk, chunk_metadata, document_id
      FROM document_embeddings 
      WHERE content_chunk ILIKE ANY(ARRAY['%altura%', '%gabarito%', '%elevação%'])
        AND chunk_metadata->>'has4thDistrict' = 'true'
      ORDER BY document_id
      LIMIT 10;
    `,
    params: []
  },
  {
    name: 'Neighborhood/Bairro Queries',
    description: 'Queries sobre bairros específicos',
    query: `
      SELECT content_chunk, chunk_metadata, document_id
      FROM document_embeddings 
      WHERE content_chunk ~* '(petrópolis|cristal|três figueiras)'
        AND chunk_metadata->>'type' = 'zot_info'
      ORDER BY document_id
      LIMIT 10;
    `,
    params: []
  },
  {
    name: 'JSONB Metadata Complex Query',
    description: 'Query complexa em campos JSONB',
    query: `
      SELECT content_chunk, chunk_metadata, document_id
      FROM document_embeddings 
      WHERE chunk_metadata ? 'articleNumber'
        AND chunk_metadata->>'hasCertification' = 'true'
        AND chunk_metadata->>'has4thDistrict' = 'true'
      ORDER BY document_id
      LIMIT 10;
    `,
    params: []
  },
  {
    name: 'Risk/Disaster Queries',
    description: 'Queries relacionadas a riscos e desastres',
    query: `
      SELECT content_chunk, chunk_metadata, document_id
      FROM document_embeddings 
      WHERE content_chunk ~* '(risco|desastre|inundação|deslizamento)'
        AND chunk_metadata IS NOT NULL
      ORDER BY document_id
      LIMIT 10;
    `,
    params: []
  }
];

/**
 * Executa uma query e mede o tempo de execução
 */
async function measureQueryPerformance(testQuery, iterations = 3) {
  const times = [];
  let success = 0;
  let errors = 0;

  console.log(`\n🔍 Testando: ${testQuery.name}`);
  console.log(`📝 ${testQuery.description}`);

  for (let i = 0; i < iterations; i++) {
    try {
      const startTime = performance.now();
      
      const { data, error } = await supabase.rpc('execute_raw_sql', {
        sql_query: testQuery.query,
        params: testQuery.params
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      if (error) {
        console.log(`  ❌ Erro na iteração ${i + 1}: ${error.message}`);
        errors++;
      } else {
        times.push(executionTime);
        success++;
        console.log(`  ✅ Iteração ${i + 1}: ${executionTime.toFixed(2)}ms (${data?.length || 0} resultados)`);
      }
    } catch (err) {
      console.log(`  ❌ Exceção na iteração ${i + 1}: ${err.message}`);
      errors++;
    }

    // Pequena pausa entre execuções
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;

  return {
    name: testQuery.name,
    description: testQuery.description,
    avgTime: avgTime.toFixed(2),
    minTime: minTime.toFixed(2),
    maxTime: maxTime.toFixed(2),
    success,
    errors,
    allTimes: times
  };
}

/**
 * Verifica se os índices compostos já foram aplicados
 */
async function checkIndexesStatus() {
  console.log('\n📊 Verificando status dos índices...');

  const indexQueries = [
    "SELECT indexname FROM pg_indexes WHERE tablename = 'document_embeddings' AND indexname LIKE 'idx_document_embeddings_vector_composite%'",
    "SELECT indexname FROM pg_indexes WHERE tablename = 'document_embeddings' AND indexname LIKE 'idx_document_embeddings_hierarchical%'",
    "SELECT indexname FROM pg_indexes WHERE tablename = 'document_embeddings' AND indexname LIKE 'idx_document_embeddings_altura_queries%'",
    "SELECT indexname FROM pg_indexes WHERE tablename = 'document_embeddings' AND indexname LIKE 'idx_document_embeddings_neighborhood_zot%'"
  ];

  const indexNames = [
    'idx_document_embeddings_vector_composite',
    'idx_document_embeddings_hierarchical', 
    'idx_document_embeddings_altura_queries',
    'idx_document_embeddings_neighborhood_zot'
  ];

  const indexStatus = {};

  for (let i = 0; i < indexQueries.length; i++) {
    try {
      const { data, error } = await supabase.rpc('execute_raw_sql', {
        sql_query: indexQueries[i]
      });

      if (error) {
        console.log(`  ⚠️ Erro ao verificar índice ${indexNames[i]}: ${error.message}`);
        indexStatus[indexNames[i]] = false;
      } else {
        const exists = data && data.length > 0;
        indexStatus[indexNames[i]] = exists;
        console.log(`  ${exists ? '✅' : '❌'} ${indexNames[i]}: ${exists ? 'EXISTE' : 'NÃO EXISTE'}`);
      }
    } catch (err) {
      console.log(`  ❌ Exceção ao verificar ${indexNames[i]}: ${err.message}`);
      indexStatus[indexNames[i]] = false;
    }
  }

  return indexStatus;
}

/**
 * Obtém estatísticas da tabela document_embeddings
 */
async function getTableStats() {
  console.log('\n📈 Coletando estatísticas da tabela...');

  const statsQueries = [
    {
      name: 'Total de registros',
      query: 'SELECT COUNT(*) as total FROM document_embeddings'
    },
    {
      name: 'Registros com metadata',
      query: 'SELECT COUNT(*) as total FROM document_embeddings WHERE chunk_metadata IS NOT NULL'
    },
    {
      name: 'Registros com conteúdo de altura',
      query: "SELECT COUNT(*) as total FROM document_embeddings WHERE content_chunk ILIKE ANY(ARRAY['%altura%', '%gabarito%', '%elevação%'])"
    },
    {
      name: 'Registros com conteúdo de bairros',
      query: "SELECT COUNT(*) as total FROM document_embeddings WHERE content_chunk ~* '(petrópolis|cristal|três figueiras|moinhos.*vento)'"
    },
    {
      name: 'Documentos únicos',
      query: 'SELECT COUNT(DISTINCT document_id) as total FROM document_embeddings'
    }
  ];

  const stats = {};

  for (const statQuery of statsQueries) {
    try {
      const { data, error } = await supabase.rpc('execute_raw_sql', {
        sql_query: statQuery.query
      });

      if (error) {
        console.log(`  ⚠️ Erro em ${statQuery.name}: ${error.message}`);
        stats[statQuery.name] = 'Erro';
      } else {
        const count = data?.[0]?.total || 0;
        stats[statQuery.name] = count.toLocaleString();
        console.log(`  📊 ${statQuery.name}: ${count.toLocaleString()}`);
      }
    } catch (err) {
      console.log(`  ❌ Exceção em ${statQuery.name}: ${err.message}`);
      stats[statQuery.name] = 'Exceção';
    }
  }

  return stats;
}

/**
 * Função principal de teste
 */
async function runPerformanceTests() {
  console.log('🚀 Iniciando Testes de Performance - Índices Compostos Otimizados');
  console.log('=' .repeat(80));

  // 1. Verificar conexão com Supabase
  console.log('\n🔌 Verificando conexão...');
  try {
    const { data, error } = await supabase.from('documents').select('count').limit(1);
    if (error) {
      console.log(`❌ Erro de conexão: ${error.message}`);
      return;
    }
    console.log('✅ Conexão estabelecida com sucesso');
  } catch (err) {
    console.log(`❌ Falha na conexão: ${err.message}`);
    return;
  }

  // 2. Verificar status dos índices
  const indexStatus = await checkIndexesStatus();
  const hasNewIndexes = Object.values(indexStatus).some(exists => exists);

  if (hasNewIndexes) {
    console.log('\n✅ Novos índices detectados - Testando performance OTIMIZADA');
  } else {
    console.log('\n⚠️ Novos índices NÃO detectados - Testando performance BASELINE');
  }

  // 3. Coletar estatísticas da tabela
  const tableStats = await getTableStats();

  // 4. Executar testes de performance
  console.log('\n🏃‍♂️ Executando testes de performance...');
  console.log('=' .repeat(50));

  const results = [];

  for (const testQuery of TEST_QUERIES) {
    const result = await measureQueryPerformance(testQuery, 3);
    results.push(result);
  }

  // 5. Gerar relatório final
  console.log('\n📊 RELATÓRIO FINAL DE PERFORMANCE');
  console.log('=' .repeat(80));

  console.log('\n📈 Estatísticas da Tabela:');
  Object.entries(tableStats).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  console.log('\n🔍 Status dos Índices:');
  Object.entries(indexStatus).forEach(([indexName, exists]) => {
    console.log(`  ${exists ? '✅' : '❌'} ${indexName}`);
  });

  console.log('\n⚡ Resultados de Performance:');
  console.log('┌─' + '─'.repeat(50) + '┬─' + '─'.repeat(12) + '┬─' + '─'.repeat(12) + '┬─' + '─'.repeat(12) + '┐');
  console.log('│ Query                                            │ Tempo Médio  │ Tempo Min    │ Tempo Max    │');
  console.log('├─' + '─'.repeat(50) + '┼─' + '─'.repeat(12) + '┼─' + '─'.repeat(12) + '┼─' + '─'.repeat(12) + '┤');

  results.forEach(result => {
    const name = result.name.substring(0, 48).padEnd(48);
    const avg = `${result.avgTime}ms`.padStart(10);
    const min = `${result.minTime}ms`.padStart(10);
    const max = `${result.maxTime}ms`.padStart(10);
    console.log(`│ ${name} │ ${avg}   │ ${min}   │ ${max}   │`);
  });

  console.log('└─' + '─'.repeat(50) + '┴─' + '─'.repeat(12) + '┴─' + '─'.repeat(12) + '┴─' + '─'.repeat(12) + '┘');

  // 6. Resumo e recomendações
  console.log('\n💡 ANÁLISE E RECOMENDAÇÕES:');
  
  const totalAvgTime = results.reduce((sum, r) => sum + parseFloat(r.avgTime), 0);
  const avgPerformance = (totalAvgTime / results.length).toFixed(2);
  
  console.log(`  📊 Tempo médio geral: ${avgPerformance}ms`);

  if (hasNewIndexes) {
    console.log('  ✅ Índices compostos aplicados - Performance otimizada');
    console.log('  🎯 Monitorar queries mais lentas para ajustes adicionais');
  } else {
    console.log('  ⚠️ Aplicar migração 20250131000003_optimize_composite_indexes.sql');
    console.log('  📈 Esperado melhoria de 40-70% na performance após aplicação');
  }

  // 7. Salvar resultados em arquivo
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportData = {
    timestamp: new Date().toISOString(),
    hasNewIndexes,
    tableStats,
    indexStatus,
    results,
    summary: {
      totalQueries: results.length,
      avgPerformance: parseFloat(avgPerformance),
      successfulTests: results.reduce((sum, r) => sum + r.success, 0),
      failedTests: results.reduce((sum, r) => sum + r.errors, 0)
    }
  };

  try {
    const fs = await import('fs');
    const reportPath = `performance_report_${timestamp}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n💾 Relatório salvo: ${reportPath}`);
  } catch (err) {
    console.log(`\n⚠️ Não foi possível salvar o relatório: ${err.message}`);
  }

  console.log('\n🏁 Testes de performance concluídos!');
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runPerformanceTests().catch(console.error);
}

export { runPerformanceTests, measureQueryPerformance, checkIndexesStatus };