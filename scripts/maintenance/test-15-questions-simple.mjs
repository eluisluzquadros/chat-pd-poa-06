#!/usr/bin/env node

/**
 * Teste simples das 15 perguntas específicas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const questions = [
  "escreva um resumo de até 25 palavras sobre a lei do plano diretor de porto alegre",
  "qual é a altura máxima e coef. básico e máx do aberta dos morros para cada zot",
  "artigo 1º da luos",
  "quais são os títulos da luos",
  "artigo 5 da luos", 
  "artigo 5 do pdus",
  "conte-me sobre petrópolis",
  "qual a altura máxima em petrópolis",
  "o que pode ser construído em petrópolis",
  "onde posso abrir um restaurante em porto alegre",
  "capítulo 1 da luos",
  "artigo sobre estacionamento",
  "normas sobre área de preservação",
  "coeficiente de aproveitamento máximo no centro histórico",
  "quais os instrumentos do plano diretor"
];

async function testQuestion(question, index) {
  console.log(`\n📝 Teste ${index + 1}/15: "${question}"`);
  
  try {
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: question,
        conversation_id: `test_${Date.now()}_${index}`,
        user_id: 'validation_user'
      }
    });

    if (error) {
      console.log(`❌ Erro: ${error.message}`);
      return { success: false, error: error.message };
    }

    const response = data?.response || 'Resposta vazia';
    const isGoodResponse = response.length > 50 && !response.toLowerCase().includes('erro');
    
    console.log(`${isGoodResponse ? '✅' : '❌'} Status: ${isGoodResponse ? 'SUCESSO' : 'FALHA'}`);
    console.log(`📄 Resposta (${response.length} caracteres): ${response.substring(0, 150)}...`);
    
    return {
      success: isGoodResponse,
      response: response,
      question: question
    };
    
  } catch (error) {
    console.log(`❌ Erro de conexão: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 TESTE DAS 15 PERGUNTAS ESPECÍFICAS\n');
  console.log('Sistema: agentic-rag via endpoint /chat');
  console.log('=' .repeat(60));

  const results = [];
  let successCount = 0;

  for (let i = 0; i < questions.length; i++) {
    const result = await testQuestion(questions[i], i);
    results.push(result);
    
    if (result.success) successCount++;
    
    // Pausa entre testes
    if (i < questions.length - 1) {
      console.log('⏳ Aguardando 3 segundos...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Relatório final
  const successRate = (successCount / questions.length) * 100;
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RELATÓRIO FINAL');
  console.log('=' .repeat(60));
  console.log(`✅ Sucessos: ${successCount}/${questions.length}`);
  console.log(`❌ Falhas: ${questions.length - successCount}/${questions.length}`);
  console.log(`📈 Taxa de sucesso: ${successRate.toFixed(1)}%`);
  
  if (successRate >= 80) {
    console.log('🎉 EXCELENTE! Sistema funcionando muito bem.');
  } else if (successRate >= 60) {
    console.log('✅ BOM! Sistema funcional com pequenos ajustes necessários.');
  } else {
    console.log('⚠️ ATENÇÃO! Sistema precisa de melhorias significativas.');
  }
  
  // Listar falhas
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('\n❌ TESTES QUE FALHARAM:');
    failures.forEach((f, i) => {
      console.log(`${i + 1}. "${f.question}"`);
      if (f.error) console.log(`   Erro: ${f.error}`);
    });
  }
  
  console.log('\n✅ TESTE CONCLUÍDO!');
  
  return {
    success_rate: successRate,
    successful_tests: successCount,
    total_tests: questions.length,
    results: results
  };
}

// Executar
runTests().catch(console.error);