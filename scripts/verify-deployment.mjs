#!/usr/bin/env node

/**
 * 🔍 Script de Verificação Pós-Deployment
 * 
 * Verifica se todos os componentes foram deployados corretamente:
 * - Tabelas SQL criadas
 * - Edge Functions ativas
 * - Dados importados
 * - API Keys configuradas
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import chalk from 'chalk';

// Carrega variáveis de ambiente
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(chalk.red('❌ Credenciais do Supabase não encontradas!'));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

class DeploymentVerifier {
  constructor() {
    this.results = {
      tables: { total: 12, found: 0, missing: [] },
      indices: { total: 13, found: 0, missing: [] },
      functions: { total: 4, active: 0, missing: [] },
      data: { regime: 0, zots: 0, expected: { regime: 387, zots: 385 } },
      apiKeys: { configured: [], missing: [] },
      overall: { success: true, issues: [] }
    };
  }

  async verifyAll() {
    console.log(chalk.blue.bold('🔍 Verificação de Deployment - Chat PD POA\n'));
    console.log('='.repeat(60));

    await this.verifyTables();
    await this.verifyIndices();
    await this.verifyFunctions();
    await this.verifyData();
    await this.verifyApiKeys();
    
    this.printSummary();
  }

  async verifyTables() {
    console.log(chalk.yellow('\n📊 Verificando Tabelas...'));
    
    const expectedTables = [
      'query_cache',
      'match_hierarchical_cache',
      'feedback_alerts',
      'session_quality_metrics',
      'model_performance_metrics',
      'knowledge_gaps',
      'knowledge_gap_content',
      'knowledge_gap_resolutions',
      'llm_metrics',
      'llm_model_registry',
      'regime_urbanistico',
      'zots_bairros'
    ];

    try {
      const { data, error } = await supabase
        .rpc('get_tables', {
          schema_name: 'public',
          table_names: expectedTables
        })
        .catch(() => ({ 
          data: null, 
          error: 'RPC not found, using direct query' 
        }));

      // Fallback para query direta
      const query = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ANY($1)
      `;

      const { data: tables } = await supabase
        .rpc('sql', { query, params: [expectedTables] })
        .catch(() => ({ data: [] }));

      const foundTables = tables?.map(t => t.table_name) || [];
      
      this.results.tables.found = foundTables.length;
      this.results.tables.missing = expectedTables.filter(t => !foundTables.includes(t));

      foundTables.forEach(table => {
        console.log(chalk.green(`  ✅ ${table}`));
      });

      this.results.tables.missing.forEach(table => {
        console.log(chalk.red(`  ❌ ${table} - MISSING`));
        this.results.overall.issues.push(`Tabela ${table} não encontrada`);
      });

    } catch (error) {
      console.log(chalk.red(`  ❌ Erro ao verificar tabelas: ${error.message}`));
      this.results.overall.success = false;
    }
  }

  async verifyIndices() {
    console.log(chalk.yellow('\n🔍 Verificando Índices...'));
    
    const expectedIndices = [
      'idx_query_cache_query_pattern',
      'idx_query_cache_expires',
      'idx_document_embeddings_vector_composite',
      'idx_document_embeddings_altura_queries',
      'idx_document_embeddings_bairros_cristal',
      'idx_document_embeddings_bairros_petropolis',
      'idx_llm_metrics_model',
      'idx_regime_bairro',
      'idx_regime_zona',
      'idx_zots_bairro',
      'idx_feedback_alerts_session',
      'idx_knowledge_gaps_status',
      'idx_session_metrics_satisfaction'
    ];

    try {
      const query = `
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname = ANY($1)
      `;

      const { data: indices } = await supabase
        .rpc('sql', { query, params: [expectedIndices] })
        .catch(() => ({ data: [] }));

      const foundIndices = indices?.map(i => i.indexname) || [];
      
      this.results.indices.found = foundIndices.length;
      this.results.indices.missing = expectedIndices.filter(i => !foundIndices.includes(i));

      console.log(chalk.green(`  ✅ ${this.results.indices.found}/${this.results.indices.total} índices encontrados`));

      if (this.results.indices.missing.length > 0) {
        console.log(chalk.yellow(`  ⚠️  ${this.results.indices.missing.length} índices faltando`));
      }

    } catch (error) {
      console.log(chalk.yellow(`  ⚠️  Não foi possível verificar índices diretamente`));
    }
  }

  async verifyFunctions() {
    console.log(chalk.yellow('\n⚡ Verificando Edge Functions...'));
    
    const expectedFunctions = [
      'enhanced-vector-search',
      'agent-rag',
      'response-synthesizer',
      'contextual-scoring'
    ];

    for (const funcName of expectedFunctions) {
      try {
        const { data, error } = await supabase.functions.invoke(funcName, {
          body: { test: true, message: 'deployment verification' }
        });

        if (!error) {
          console.log(chalk.green(`  ✅ ${funcName} - ACTIVE`));
          this.results.functions.active++;
        } else {
          console.log(chalk.red(`  ❌ ${funcName} - ERROR: ${error.message}`));
          this.results.functions.missing.push(funcName);
          this.results.overall.issues.push(`Function ${funcName} não está respondendo`);
        }
      } catch (error) {
        console.log(chalk.red(`  ❌ ${funcName} - NOT DEPLOYED`));
        this.results.functions.missing.push(funcName);
      }
    }
  }

  async verifyData() {
    console.log(chalk.yellow('\n📈 Verificando Dados Importados...'));
    
    try {
      // Verificar regime urbanístico
      const { count: regimeCount } = await supabase
        .from('regime_urbanistico')
        .select('*', { count: 'exact', head: true });
      
      this.results.data.regime = regimeCount || 0;

      // Verificar ZOTs
      const { count: zotsCount } = await supabase
        .from('zots_bairros')
        .select('*', { count: 'exact', head: true });
      
      this.results.data.zots = zotsCount || 0;

      // Verificar se os números batem
      const regimeOk = this.results.data.regime === this.results.data.expected.regime;
      const zotsOk = this.results.data.zots === this.results.data.expected.zots;

      console.log(chalk[regimeOk ? 'green' : 'red'](
        `  ${regimeOk ? '✅' : '❌'} Regime Urbanístico: ${this.results.data.regime}/${this.results.data.expected.regime}`
      ));
      
      console.log(chalk[zotsOk ? 'green' : 'red'](
        `  ${zotsOk ? '✅' : '❌'} ZOTs vs Bairros: ${this.results.data.zots}/${this.results.data.expected.zots}`
      ));

      if (!regimeOk || !zotsOk) {
        this.results.overall.issues.push('Dados de regime urbanístico incompletos');
      }

    } catch (error) {
      console.log(chalk.red(`  ❌ Erro ao verificar dados: ${error.message}`));
      this.results.overall.issues.push('Não foi possível verificar dados importados');
    }
  }

  async verifyApiKeys() {
    console.log(chalk.yellow('\n🔐 Verificando API Keys...'));
    
    const requiredKeys = ['OPENAI_API_KEY'];
    const optionalKeys = ['CLAUDE_API_KEY', 'GEMINI_API_KEY', 'GROQ_API_KEY', 'DEEPSEEK_API_KEY'];

    // Verificar keys locais
    requiredKeys.forEach(key => {
      if (process.env[key]) {
        console.log(chalk.green(`  ✅ ${key} - Configurada localmente`));
        this.results.apiKeys.configured.push(key);
      } else {
        console.log(chalk.red(`  ❌ ${key} - NÃO CONFIGURADA (obrigatória)`));
        this.results.apiKeys.missing.push(key);
        this.results.overall.issues.push(`API Key obrigatória não configurada: ${key}`);
      }
    });

    optionalKeys.forEach(key => {
      if (process.env[key]) {
        console.log(chalk.green(`  ✅ ${key} - Configurada (opcional)`));
        this.results.apiKeys.configured.push(key);
      } else {
        console.log(chalk.yellow(`  ⚠️  ${key} - Não configurada (opcional)`));
      }
    });
  }

  printSummary() {
    console.log(chalk.blue.bold('\n\n📊 RESUMO DA VERIFICAÇÃO'));
    console.log('='.repeat(60));

    const allTablesOk = this.results.tables.missing.length === 0;
    const allFunctionsOk = this.results.functions.missing.length === 0;
    const dataOk = this.results.data.regime === this.results.data.expected.regime && 
                   this.results.data.zots === this.results.data.expected.zots;
    const apiKeysOk = this.results.apiKeys.missing.length === 0;

    console.log(chalk[allTablesOk ? 'green' : 'red'](
      `${allTablesOk ? '✅' : '❌'} Tabelas: ${this.results.tables.found}/${this.results.tables.total}`
    ));
    
    console.log(chalk[this.results.indices.found > 10 ? 'green' : 'yellow'](
      `${this.results.indices.found > 10 ? '✅' : '⚠️ '} Índices: ${this.results.indices.found}/${this.results.indices.total}`
    ));
    
    console.log(chalk[allFunctionsOk ? 'green' : 'red'](
      `${allFunctionsOk ? '✅' : '❌'} Functions: ${this.results.functions.active}/${this.results.functions.total}`
    ));
    
    console.log(chalk[dataOk ? 'green' : 'red'](
      `${dataOk ? '✅' : '❌'} Dados: ${this.results.data.regime + this.results.data.zots}/772 registros`
    ));
    
    console.log(chalk[apiKeysOk ? 'green' : 'red'](
      `${apiKeysOk ? '✅' : '❌'} API Keys: ${this.results.apiKeys.configured.length} configuradas`
    ));

    console.log('\n' + '='.repeat(60));

    if (this.results.overall.issues.length === 0) {
      console.log(chalk.green.bold('\n🎉 DEPLOYMENT VERIFICADO COM SUCESSO!\n'));
      console.log(chalk.green('Todos os componentes estão funcionando corretamente.'));
    } else {
      console.log(chalk.red.bold('\n⚠️  PROBLEMAS ENCONTRADOS:\n'));
      this.results.overall.issues.forEach((issue, index) => {
        console.log(chalk.red(`${index + 1}. ${issue}`));
      });

      console.log(chalk.yellow.bold('\n💡 AÇÕES RECOMENDADAS:\n'));
      
      if (this.results.tables.missing.length > 0) {
        console.log(chalk.yellow('1. Execute as migrações SQL:'));
        console.log(chalk.gray('   - Copie o conteúdo de TODAS_MIGRACOES_SQL_CONSOLIDADAS.sql'));
        console.log(chalk.gray('   - Cole no SQL Editor do Supabase e execute'));
      }

      if (this.results.functions.missing.length > 0) {
        console.log(chalk.yellow('\n2. Deploy as Edge Functions faltantes:'));
        console.log(chalk.gray('   npm run deploy-functions'));
      }

      if (!dataOk) {
        console.log(chalk.yellow('\n3. Importe os dados de regime urbanístico:'));
        console.log(chalk.gray('   npm run regime:full-setup'));
      }

      if (this.results.apiKeys.missing.length > 0) {
        console.log(chalk.yellow('\n4. Configure as API Keys obrigatórias:'));
        console.log(chalk.gray('   npm run deploy-env'));
      }
    }

    console.log('\n');
  }
}

// Executar verificação
async function main() {
  const verifier = new DeploymentVerifier();
  await verifier.verifyAll();
}

main().catch(error => {
  console.error(chalk.red('❌ Erro na verificação:', error.message));
  process.exit(1);
});