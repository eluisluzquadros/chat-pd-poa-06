#!/usr/bin/env node
/**
 * TESTE DEFINITIVO: Agentic-RAG Corrigido
 * Verifica se o sistema agora responde corretamente sem response-synthesizer
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg'
);

console.log('🎯 TESTE FINAL: Sistema Agentic-RAG Corrigido');
console.log('=' * 60);

const CRITICAL_QUESTIONS = [
  {
    name: "PERGUNTA CRÍTICA - 346 Contribuições",
    query: "Quantas contribuições foram recebidas na audiência pública final?",
    expectedContent: "346"
  },
  {
    name: "Verificação - Altura Máxima",
    query: "Qual é a altura máxima no bairro Petrópolis?",
    expectedContent: ["altura", "máxima"]
  },
  {
    name: "Verificação - ZOT 2",
    query: "ZOT 2 altura máxima",
    expectedContent: ["zot", "altura"]
  }
];

async function testCriticalQuestions() {
  for (const [index, question] of CRITICAL_QUESTIONS.entries()) {
    console.log(`\n📝 TESTE ${index + 1}: ${question.name}`);
    console.log(`❓ Query: "${question.query}"`);
    console.log('-'.repeat(50));
    
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          query: question.query,
          bypassCache: true,
          sessionId: `test-fixed-${Date.now()}-${index}`
        }
      });
      
      const elapsed = Date.now() - startTime;
      
      if (error) {
        console.log(`❌ ERRO: ${error.message}`);
        continue;
      }
      
      console.log(`⏱️ Tempo: ${elapsed}ms`);
      console.log(`📊 Confidence: ${data.confidence || 'N/A'}`);
      console.log(`🔧 Direct Answer: ${data.directAnswer || false}`);
      
      if (data.response) {
        console.log(`\n📄 RESPOSTA (primeiros 300 chars):`);
        console.log(data.response.substring(0, 300) + '...');
        
        // Verificar se contém o conteúdo esperado
        const response = data.response.toLowerCase();
        let foundExpected = false;
        
        if (typeof question.expectedContent === 'string') {
          foundExpected = response.includes(question.expectedContent);
        } else if (Array.isArray(question.expectedContent)) {
          foundExpected = question.expectedContent.some(content => 
            response.includes(content.toLowerCase())
          );
        }
        
        if (foundExpected) {
          console.log(`✅ SUCESSO: Resposta contém conteúdo esperado!`);
          
          // Para a pergunta crítica, verificar especificamente por "346"
          if (question.expectedContent === "346" && response.includes('346')) {
            console.log(`🎯 PERFEITO: Encontrou "346 contribuições"!`);
          }
        } else {
          console.log(`❌ FALHA: Resposta não contém conteúdo esperado`);
        }
        
        // Verificar fontes
        if (data.sources) {
          console.log(`\n📚 FONTES:`);
          console.log(`- Knowledgebase: ${data.sources.knowledgebase || 0}`);
          console.log(`- Q&A: ${data.sources.qa_data || 0}`);
          console.log(`- Legal: ${data.sources.legal_articles || 0}`);
          console.log(`- Regime: ${data.sources.regime_urbanistico || 0}`);
        }
        
      } else {
        console.log(`❌ ERRO: Resposta vazia`);
      }
      
    } catch (err) {
      console.log(`❌ EXCEÇÃO: ${err.message}`);
    }
    
    // Pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function main() {
  await testCriticalQuestions();
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 TESTE CONCLUÍDO');
  console.log('✅ Se todos os testes passaram, o sistema está funcionando!');
  console.log('='.repeat(60));
}

main().catch(console.error);