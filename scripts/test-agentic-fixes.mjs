#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, supabaseKey);

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testAgenticRAG(query, expectedKeywords = []) {
  console.log(`\n${colors.cyan}🔍 Testando: "${query}"${colors.reset}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: { 
        query,
        conversationHistory: []
      }
    });

    if (error) {
      console.log(`${colors.red}❌ Erro: ${error.message}${colors.reset}`);
      return false;
    }

    const response = data?.response || '';
    console.log(`${colors.blue}📝 Resposta (preview): ${response.substring(0, 200)}...${colors.reset}`);
    
    // Verificar se contém palavras-chave esperadas
    let passed = true;
    if (expectedKeywords.length > 0) {
      const foundKeywords = expectedKeywords.filter(kw => 
        response.toLowerCase().includes(kw.toLowerCase())
      );
      
      if (foundKeywords.length === expectedKeywords.length) {
        console.log(`${colors.green}✅ Encontrou todas as palavras-chave: ${foundKeywords.join(', ')}${colors.reset}`);
      } else {
        const missing = expectedKeywords.filter(kw => 
          !response.toLowerCase().includes(kw.toLowerCase())
        );
        console.log(`${colors.yellow}⚠️ Palavras-chave faltantes: ${missing.join(', ')}${colors.reset}`);
        passed = false;
      }
    }
    
    // Verificar sources
    const sources = data?.sources || {};
    console.log(`${colors.cyan}📊 Fontes: Legal=${sources.legal_articles || 0}, Regime=${sources.regime_urbanistico || 0}${colors.reset}`);
    
    return passed;
  } catch (err) {
    console.log(`${colors.red}❌ Erro na execução: ${err.message}${colors.reset}`);
    return false;
  }
}

async function runAllTests() {
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}🧪 TESTE DE VALIDAÇÃO - CORREÇÕES AGENTIC-RAG${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  
  const tests = [
    {
      query: "O que posso construir em Petrópolis?",
      keywords: ["Petrópolis", "altura", "coeficiente"]
    },
    {
      query: "Qual a altura máxima mais alta em Porto Alegre?",
      keywords: ["130", "metros", "Boa Vista"]
    },
    {
      query: "O que é EVU?",
      keywords: ["Estudo", "Viabilidade", "Urbana"]
    },
    {
      query: "Regime urbanístico do Centro Histórico",
      keywords: ["Centro", "ZOT", "altura"]
    },
    {
      query: "Certificação em sustentabilidade ambiental",
      keywords: ["sustentabilidade", "ambiental"]
    },
    {
      query: "Zonas de ocupação em Três Figueiras",
      keywords: ["Três Figueiras", "ZOT"]
    },
    {
      query: "Artigo 75 da LUOS",
      keywords: ["Art", "75"]
    },
    {
      query: "Parâmetros de construção para Bela Vista",
      keywords: ["Bela Vista", "altura", "ocupação"]
    }
  ];
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const test of tests) {
    const passed = await testAgenticRAG(test.query, test.keywords);
    if (passed) {
      passedTests++;
    } else {
      failedTests++;
    }
    
    // Pequena pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Resumo final
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}📊 RESUMO DOS TESTES${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  
  const totalTests = tests.length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log(`${colors.green}✅ Testes aprovados: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}❌ Testes falhados: ${failedTests}${colors.reset}`);
  console.log(`${colors.blue}📈 Taxa de sucesso: ${successRate}%${colors.reset}`);
  
  if (successRate >= 95) {
    console.log(`\n${colors.green}🎉 SUCESSO! Sistema atingiu a meta de >95% de acurácia!${colors.reset}`);
  } else if (successRate >= 85) {
    console.log(`\n${colors.yellow}⚠️ Sistema melhorou mas ainda não atingiu a meta de 95%${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ Sistema precisa de mais ajustes${colors.reset}`);
  }
}

// Executar testes
runAllTests().catch(console.error);