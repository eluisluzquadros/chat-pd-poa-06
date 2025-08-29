/**
 * Script de Validação das Otimizações (Modo Offline)
 * 
 * Valida se os arquivos e estruturas foram criados corretamente
 * sem necessidade de conexão com o banco de dados.
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Valida se os arquivos de migração foram criados
 */
function validateMigrationFiles() {
  console.log('📄 Validando arquivos de migração...\n');
  
  const files = [
    {
      path: 'supabase/migrations/20250131000004_optimize_match_hierarchical_documents.sql',
      name: 'Migração de Otimização',
      requiredContent: [
        'match_hierarchical_documents_optimized',
        'hierarchical_search_cache',
        'search_performance_log',
        'contextual_scoring',
        'performance_metrics'
      ]
    },
    {
      path: 'supabase/migrations/20250131000003_optimize_composite_indexes.sql',
      name: 'Índices Compostos',
      requiredContent: [
        'idx_document_embeddings_vector_composite',
        'idx_document_embeddings_hierarchical',
        'idx_document_embeddings_altura_queries'
      ]
    }
  ];
  
  let allValid = true;
  
  for (const file of files) {
    const fullPath = join(__dirname, file.path);
    
    if (!existsSync(fullPath)) {
      console.log(`❌ ${file.name}: Arquivo não encontrado - ${file.path}`);
      allValid = false;
      continue;
    }
    
    try {
      const content = readFileSync(fullPath, 'utf-8');
      
      let missingContent = [];
      for (const required of file.requiredContent) {
        if (!content.includes(required)) {
          missingContent.push(required);
        }
      }
      
      if (missingContent.length > 0) {
        console.log(`⚠️  ${file.name}: Conteúdo faltando - ${missingContent.join(', ')}`);
        allValid = false;
      } else {
        console.log(`✅ ${file.name}: OK (${Math.round(content.length / 1024)}KB)`);
      }
      
    } catch (error) {
      console.log(`❌ ${file.name}: Erro ao ler arquivo - ${error.message}`);
      allValid = false;
    }
  }
  
  return allValid;
}

/**
 * Valida scripts de teste e aplicação
 */
function validateScripts() {
  console.log('\n🧪 Validando scripts de teste e aplicação...\n');
  
  const scripts = [
    {
      path: 'test-performance-optimizations.mjs',
      name: 'Script de Teste de Performance',
      requiredFunctions: [
        'testPerformanceComparison',
        'testBatchPerformance',
        'testPerformanceModes',
        'checkCacheStatistics'
      ]
    },
    {
      path: 'apply-performance-optimizations.mjs',
      name: 'Script de Aplicação',
      requiredFunctions: [
        'applyOptimizationMigration',
        'verifyOptimizations',
        'testOptimizedFunction'
      ]
    }
  ];
  
  let allValid = true;
  
  for (const script of scripts) {
    const fullPath = join(__dirname, script.path);
    
    if (!existsSync(fullPath)) {
      console.log(`❌ ${script.name}: Arquivo não encontrado`);
      allValid = false;
      continue;
    }
    
    try {
      const content = readFileSync(fullPath, 'utf-8');
      
      let missingFunctions = [];
      for (const func of script.requiredFunctions) {
        if (!content.includes(`function ${func}`) && !content.includes(`const ${func}`)) {
          missingFunctions.push(func);
        }
      }
      
      if (missingFunctions.length > 0) {
        console.log(`⚠️  ${script.name}: Funções faltando - ${missingFunctions.join(', ')}`);
        allValid = false;
      } else {
        console.log(`✅ ${script.name}: OK (${Math.round(content.length / 1024)}KB)`);
      }
      
    } catch (error) {
      console.log(`❌ ${script.name}: Erro ao ler - ${error.message}`);
      allValid = false;
    }
  }
  
  return allValid;
}

/**
 * Valida atualizações na função enhanced-vector-search
 */
function validateEnhancedVectorSearch() {
  console.log('\n🔍 Validando atualizações no enhanced-vector-search...\n');
  
  const filePath = join(__dirname, 'supabase/functions/enhanced-vector-search/index.ts');
  
  if (!existsSync(filePath)) {
    console.log('❌ Arquivo enhanced-vector-search/index.ts não encontrado');
    return false;
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    const expectedUpdates = [
      {
        name: 'Chamada para função otimizada',
        pattern: 'match_hierarchical_documents_optimized',
        found: content.includes('match_hierarchical_documents_optimized')
      },
      {
        name: 'Parâmetros de performance',
        pattern: 'performance_mode',
        found: content.includes('performance_mode')
      },
      {
        name: 'Fallback para função padrão',
        pattern: 'falling back to standard',
        found: content.includes('falling back') || content.includes('fallback')
      },
      {
        name: 'Logs de performance',
        pattern: 'performance metrics',
        found: content.includes('performance_metrics') || content.includes('Performance:')
      }
    ];
    
    let allUpdated = true;
    
    for (const update of expectedUpdates) {
      if (update.found) {
        console.log(`✅ ${update.name}: Implementado`);
      } else {
        console.log(`❌ ${update.name}: Não encontrado`);
        allUpdated = false;
      }
    }
    
    return allUpdated;
    
  } catch (error) {
    console.log(`❌ Erro ao validar enhanced-vector-search: ${error.message}`);
    return false;
  }
}

/**
 * Analisa complexidade das otimizações
 */
function analyzeOptimizationComplexity() {
  console.log('\n📊 Analisando complexidade das otimizações...\n');
  
  try {
    const migrationPath = join(__dirname, 'supabase/migrations/20250131000004_optimize_match_hierarchical_documents.sql');
    const content = readFileSync(migrationPath, 'utf-8');
    
    const metrics = {
      totalLines: content.split('\n').length,
      functions: (content.match(/CREATE.*FUNCTION/gi) || []).length,
      tables: (content.match(/CREATE.*TABLE/gi) || []).length,
      indexes: (content.match(/CREATE.*INDEX/gi) || []).length,
      views: (content.match(/CREATE.*VIEW/gi) || []).length,
      ctes: (content.match(/WITH\s+\w+\s+AS/gi) || []).length,
      comments: (content.match(/--.*$/gm) || []).length
    };
    
    console.log('📈 Métricas da Migração:');
    console.log(`   📄 Total de linhas: ${metrics.totalLines}`);
    console.log(`   ⚙️  Funções criadas: ${metrics.functions}`);
    console.log(`   📊 Tabelas criadas: ${metrics.tables}`);
    console.log(`   🔍 Índices criados: ${metrics.indexes}`);
    console.log(`   👁️  Views criadas: ${metrics.views}`);
    console.log(`   🏗️  CTEs implementados: ${metrics.ctes}`);
    console.log(`   💬 Linhas de comentário: ${metrics.comments}`);
    
    // Análise de complexidade
    const complexityScore = (
      metrics.functions * 10 +
      metrics.tables * 5 +
      metrics.indexes * 3 +
      metrics.views * 4 +
      metrics.ctes * 2
    );
    
    console.log(`\n🎯 Score de Complexidade: ${complexityScore}`);
    
    if (complexityScore > 100) {
      console.log('   🔥 Otimização AVANÇADA - Múltiplas técnicas aplicadas');
    } else if (complexityScore > 50) {
      console.log('   ⚡ Otimização INTERMEDIÁRIA - Boas práticas aplicadas');
    } else {
      console.log('   📈 Otimização BÁSICA - Melhorias incrementais');
    }
    
    return true;
    
  } catch (error) {
    console.log(`❌ Erro na análise: ${error.message}`);
    return false;
  }
}

/**
 * Gera checklist de execução
 */
function generateExecutionChecklist() {
  console.log('\n📋 CHECKLIST DE EXECUÇÃO');
  console.log('========================\n');
  
  const steps = [
    {
      step: '1. Configurar Variáveis de Ambiente',
      commands: [
        'export SUPABASE_URL="https://seu-projeto.supabase.co"',
        'export SUPABASE_SERVICE_ROLE_KEY="sua-service-key"'
      ],
      description: 'Necessário para conectar com o banco'
    },
    {
      step: '2. Aplicar Otimizações',
      commands: [
        'node apply-performance-optimizations.mjs'
      ],
      description: 'Aplica todas as migrações e otimizações'
    },
    {
      step: '3. Executar Testes',
      commands: [
        'node test-performance-optimizations.mjs'
      ],
      description: 'Valida performance e funcionalidade'
    },
    {
      step: '4. Monitorar Performance',
      commands: [
        'SELECT * FROM hierarchical_search_performance;',
        'SELECT * FROM hierarchical_cache_status;'
      ],
      description: 'Acompanhar métricas de performance'
    }
  ];
  
  for (const step of steps) {
    console.log(`✅ ${step.step}`);
    console.log(`   📝 ${step.description}`);
    console.log('   💻 Comandos:');
    step.commands.forEach(cmd => {
      console.log(`      ${cmd}`);
    });
    console.log('');
  }
}

/**
 * Script principal
 */
function main() {
  console.log('🔍 VALIDAÇÃO DAS OTIMIZAÇÕES DE PERFORMANCE');
  console.log('=============================================\n');
  
  const results = {
    migrationFiles: false,
    scripts: false,
    enhancedVectorSearch: false,
    complexity: false
  };
  
  // Executar validações
  results.migrationFiles = validateMigrationFiles();
  results.scripts = validateScripts();
  results.enhancedVectorSearch = validateEnhancedVectorSearch();
  results.complexity = analyzeOptimizationComplexity();
  
  // Resumo final
  console.log('\n' + '='.repeat(50));
  console.log('📋 RESUMO DA VALIDAÇÃO');
  console.log('='.repeat(50) + '\n');
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(Boolean).length;
  const successRate = (passedChecks / totalChecks) * 100;
  
  console.log(`📊 Validações passaram: ${passedChecks}/${totalChecks} (${successRate.toFixed(1)}%)\n`);
  
  Object.entries(results).forEach(([check, passed]) => {
    const status = passed ? '✅' : '❌';
    const checkName = check.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${status} ${checkName}`);
  });
  
  if (successRate === 100) {
    console.log('\n🎉 Todas as validações passaram!');
    console.log('✨ As otimizações estão prontas para aplicação.');
  } else if (successRate >= 75) {
    console.log('\n⚠️  Maioria das validações passou.');
    console.log('🔧 Revise os itens com falha antes de aplicar.');
  } else {
    console.log('\n❌ Várias validações falharam.');
    console.log('🛠️  Corrija os problemas antes de prosseguir.');
  }
  
  // Gerar checklist independente do resultado
  generateExecutionChecklist();
  
  return successRate;
}

// Executar validação
if (import.meta.url === `file://${process.argv[1]}`) {
  const successRate = main();
  process.exit(successRate === 100 ? 0 : 1);
}

export { main, validateMigrationFiles, validateScripts, validateEnhancedVectorSearch };