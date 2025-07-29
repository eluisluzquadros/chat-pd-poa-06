#!/usr/bin/env node

/**
 * Script de Testes Automatizados para Cenários Críticos
 * Executa validações QA automaticamente e gera relatórios
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { format } from 'date-fns';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TestScenario {
  name: string;
  description: string;
  categories?: string[];
  expectedAccuracy: number;
  critical: boolean;
}

const CRITICAL_SCENARIOS: TestScenario[] = [
  {
    name: 'Consultas de Construção',
    description: 'Validar respostas sobre parâmetros de construção',
    categories: ['construction_queries'],
    expectedAccuracy: 0.90,
    critical: true
  },
  {
    name: 'Consultas de Endereço',
    description: 'Validar solicitação de bairro/ZOT para ruas',
    categories: ['address_queries'],
    expectedAccuracy: 0.95,
    critical: true
  },
  {
    name: 'Consultas Conceituais',
    description: 'Validar entendimento de conceitos do PDUS',
    categories: ['conceptual_queries'],
    expectedAccuracy: 0.85,
    critical: false
  }
];

async function runAutomatedTests() {
  console.log('🚀 Iniciando Testes Automatizados de Qualidade');
  console.log(`📅 Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`);
  console.log('-------------------------------------------\n');

  const results: any[] = [];
  let allPassed = true;

  for (const scenario of CRITICAL_SCENARIOS) {
    console.log(`\n📋 Testando: ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    
    try {
      // Executar validação QA para o cenário
      const { data, error } = await supabase.functions.invoke('qa-validator', {
        body: {
          model: 'agentic-rag',
          categories: scenario.categories,
          mode: 'category'
        }
      });

      if (error) throw error;

      // Aguardar conclusão (polling)
      const runId = data.validationRunId;
      let completed = false;
      let runData: any = null;
      
      console.log(`   ⏳ Aguardando conclusão...`);
      
      while (!completed) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5s
        
        const { data: run } = await supabase
          .from('qa_validation_runs')
          .select('*')
          .eq('id', runId)
          .single();
        
        if (run?.status === 'completed' || run?.status === 'failed') {
          completed = true;
          runData = run;
        }
      }

      // Analisar resultados
      const accuracy = runData?.overall_accuracy || 0;
      const passed = accuracy >= scenario.expectedAccuracy;
      
      if (!passed && scenario.critical) {
        allPassed = false;
      }

      results.push({
        scenario: scenario.name,
        accuracy,
        expected: scenario.expectedAccuracy,
        passed,
        critical: scenario.critical,
        totalTests: runData?.total_tests,
        passedTests: runData?.passed_tests,
        avgResponseTime: runData?.avg_response_time_ms
      });

      console.log(`   ✅ Concluído: ${(accuracy * 100).toFixed(1)}% de acurácia`);
      console.log(`   ${passed ? '✅ PASSOU' : '❌ FALHOU'} (esperado: ${(scenario.expectedAccuracy * 100).toFixed(0)}%)`);
      
    } catch (error) {
      console.error(`   ❌ Erro ao executar teste: ${error.message}`);
      results.push({
        scenario: scenario.name,
        error: error.message,
        passed: false
      });
      
      if (scenario.critical) {
        allPassed = false;
      }
    }
  }

  // Gerar relatório
  console.log('\n\n📊 RELATÓRIO FINAL');
  console.log('==================\n');
  
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.scenario}`);
    if (result.accuracy !== undefined) {
      console.log(`   Acurácia: ${(result.accuracy * 100).toFixed(1)}%`);
      console.log(`   Testes: ${result.passedTests}/${result.totalTests}`);
      console.log(`   Tempo médio: ${result.avgResponseTime}ms`);
    } else if (result.error) {
      console.log(`   Erro: ${result.error}`);
    }
    console.log('');
  });

  // Salvar relatório no banco
  const report = {
    run_date: new Date().toISOString(),
    scenarios_tested: results.length,
    all_passed: allPassed,
    results: results,
    critical_failures: results.filter(r => r.critical && !r.passed).length
  };

  await supabase
    .from('qa_automated_reports')
    .insert(report);

  console.log('\n📈 Resumo:');
  console.log(`   Total de cenários: ${results.length}`);
  console.log(`   Cenários aprovados: ${results.filter(r => r.passed).length}`);
  console.log(`   Falhas críticas: ${report.critical_failures}`);
  console.log(`   Status geral: ${allPassed ? '✅ SUCESSO' : '❌ FALHA'}`);

  // Retornar código de saída apropriado
  process.exit(allPassed ? 0 : 1);
}

// Executar testes
runAutomatedTests().catch(console.error);