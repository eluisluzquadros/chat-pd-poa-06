#!/usr/bin/env node

/**
 * Script para testar o pipeline RAG completo
 * - Cache
 * - Formatação de tabelas
 * - Q&A processing
 * - Regime urbanístico
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

class PipelineTester {
  constructor() {
    this.results = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      cached: 0,
      avgTime: 0
    };
  }

  async testQuery(query, description, expectCached = false) {
    console.log(`\n🧪 ${description}`);
    console.log(`   Query: "${query}"`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query,
          sessionId: 'test-session',
          bypassCache: false
        })
      });

      const result = await response.json();
      const executionTime = Date.now() - startTime;
      
      this.stats.total++;
      
      if (response.ok && result.response) {
        this.stats.passed++;
        
        // Verificar se veio do cache
        const fromCache = result.sources?.cached === true || 
                         result.agentTrace?.some(t => t.step === 'cache_hit');
        
        if (fromCache) {
          this.stats.cached++;
          console.log(`   ✅ SUCCESS (CACHED) - ${executionTime}ms`);
        } else {
          console.log(`   ✅ SUCCESS - ${executionTime}ms`);
        }
        
        // Verificar formatação de tabela
        const hasTable = result.response.includes('|');
        if (hasTable) {
          console.log(`   📊 Response includes formatted table`);
        }
        
        // Preview da resposta
        const preview = result.response.substring(0, 150).replace(/\n/g, ' ');
        console.log(`   📝 Preview: ${preview}...`);
        
        this.results.push({
          query,
          success: true,
          cached: fromCache,
          hasTable,
          time: executionTime,
          confidence: result.confidence
        });
        
      } else {
        this.stats.failed++;
        console.log(`   ❌ FAILED: ${result.error || 'Unknown error'}`);
        
        this.results.push({
          query,
          success: false,
          error: result.error,
          time: executionTime
        });
      }
      
    } catch (error) {
      this.stats.failed++;
      console.log(`   ❌ ERROR: ${error.message}`);
      
      this.results.push({
        query,
        success: false,
        error: error.message,
        time: Date.now() - startTime
      });
    }
  }

  async runTests() {
    console.log('🚀 === TESTE COMPLETO DO PIPELINE RAG ===');
    console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);
    
    // Teste 1: Queries de regime urbanístico (devem retornar tabelas)
    await this.testQuery(
      'qual o regime urbanístico do centro histórico',
      'Teste 1: Regime urbanístico com formatação de tabela'
    );
    
    // Teste 2: Mesma query (deve vir do cache)
    await this.testQuery(
      'qual o regime urbanístico do centro histórico',
      'Teste 2: Cache hit esperado',
      true
    );
    
    // Teste 3: Q&A sobre ZEIS
    await this.testQuery(
      'o que são ZEIS',
      'Teste 3: Q&A sobre ZEIS (deve estar no cache pré-aquecido)',
      true
    );
    
    // Teste 4: Coeficiente de aproveitamento
    await this.testQuery(
      'o que é coeficiente de aproveitamento',
      'Teste 4: Q&A sobre coeficiente (cache)',
      true
    );
    
    // Teste 5: Query específica de bairro
    await this.testQuery(
      'altura máxima em moinhos de vento',
      'Teste 5: Altura específica de bairro'
    );
    
    // Teste 6: Query complexa
    await this.testQuery(
      'compare o regime urbanístico do centro com moinhos de vento',
      'Teste 6: Comparação entre bairros'
    );
    
    // Teste 7: Outorga onerosa
    await this.testQuery(
      'como funciona a outorga onerosa',
      'Teste 7: Q&A sobre outorga (cache)',
      true
    );
    
    // Teste 8: Query nova que não está no cache
    await this.testQuery(
      'quais são as regras para construir em áreas de risco',
      'Teste 8: Query nova (sem cache)'
    );
    
    // Teste 9: Repetir query do teste 8 (deve estar em cache agora)
    await this.testQuery(
      'quais são as regras para construir em áreas de risco',
      'Teste 9: Cache da query anterior',
      true
    );
    
    // Teste 10: Taxa de ocupação
    await this.testQuery(
      'o que é taxa de ocupação',
      'Teste 10: Q&A sobre taxa de ocupação (cache)',
      true
    );
    
    // Calcular estatísticas
    const avgTime = this.results.reduce((sum, r) => sum + r.time, 0) / this.results.length;
    const cacheHitRate = (this.stats.cached / this.stats.total) * 100;
    const successRate = (this.stats.passed / this.stats.total) * 100;
    
    // Relatório final
    console.log('\n📈 === RELATÓRIO FINAL ===\n');
    console.log(`📊 Total de testes: ${this.stats.total}`);
    console.log(`✅ Sucessos: ${this.stats.passed} (${successRate.toFixed(1)}%)`);
    console.log(`❌ Falhas: ${this.stats.failed}`);
    console.log(`💾 Cache hits: ${this.stats.cached} (${cacheHitRate.toFixed(1)}%)`);
    console.log(`⏱️ Tempo médio: ${avgTime.toFixed(0)}ms`);
    
    // Análise de performance
    const cachedQueries = this.results.filter(r => r.cached);
    const uncachedQueries = this.results.filter(r => !r.cached && r.success);
    
    if (cachedQueries.length > 0) {
      const avgCachedTime = cachedQueries.reduce((sum, r) => sum + r.time, 0) / cachedQueries.length;
      console.log(`⚡ Tempo médio (cache): ${avgCachedTime.toFixed(0)}ms`);
    }
    
    if (uncachedQueries.length > 0) {
      const avgUncachedTime = uncachedQueries.reduce((sum, r) => sum + r.time, 0) / uncachedQueries.length;
      console.log(`🔄 Tempo médio (sem cache): ${avgUncachedTime.toFixed(0)}ms`);
    }
    
    // Verificar formatação de tabelas
    const queriesWithTables = this.results.filter(r => r.hasTable).length;
    console.log(`📊 Respostas com tabelas: ${queriesWithTables}`);
    
    // Status final
    console.log('\n🎯 === STATUS DO PIPELINE ===\n');
    
    if (successRate === 100) {
      console.log('✅ TODOS OS TESTES PASSARAM!');
    } else if (successRate >= 80) {
      console.log('🟡 PIPELINE FUNCIONAL COM PEQUENOS PROBLEMAS');
    } else {
      console.log('❌ PIPELINE COM PROBLEMAS CRÍTICOS');
    }
    
    if (cacheHitRate >= 50) {
      console.log('✅ CACHE FUNCIONANDO CORRETAMENTE');
    } else {
      console.log('⚠️ CACHE COM BAIXA TAXA DE HIT');
    }
    
    if (avgTime < 2000) {
      console.log('✅ PERFORMANCE EXCELENTE');
    } else if (avgTime < 5000) {
      console.log('🟡 PERFORMANCE ACEITÁVEL');
    } else {
      console.log('❌ PERFORMANCE PRECISA MELHORAR');
    }
  }
}

// Executar testes
const tester = new PipelineTester();
tester.runTests().catch(console.error);