#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '..', '.env.local');

dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log(chalk.blue.bold('\n🏢 Testando perguntas sobre bairros_risco_desastre\n'));

// Perguntas de teste sobre riscos
const testQueries = [
  {
    query: "Quais bairros têm risco de inundação?",
    description: "Busca bairros com risco de inundação"
  },
  {
    query: "Quais os riscos do bairro Centro Histórico?",
    description: "Busca riscos específicos de um bairro"
  },
  {
    query: "Liste os bairros com alto risco de desastre",
    description: "Busca bairros com nível de risco alto"
  },
  {
    query: "Quais áreas de Porto Alegre têm risco de deslizamento?",
    description: "Busca bairros com risco de deslizamento"
  },
  {
    query: "O bairro Petrópolis tem risco de alagamento?",
    description: "Verifica risco específico de um bairro"
  },
  {
    query: "Mostre os bairros com risco crítico",
    description: "Busca bairros com risco muito alto"
  },
  {
    query: "Quais zonas têm risco de granizo?",
    description: "Busca áreas com risco de granizo"
  },
  {
    query: "Liste as áreas críticas do bairro Cristal",
    description: "Busca informações detalhadas de risco"
  }
];

// Teste de variações semânticas
const semanticVariations = [
  {
    base: "Petrópolis",
    variations: ["PETRÓPOLIS", "PETROPOLIS", "Petropolis", "petropolis", "...no bairro Petrópolis", "...do bairro Petrópolis"],
    description: "Variações de acentuação e contexto"
  },
  {
    base: "ZOT 07",
    variations: ["ZOT 7", "ZOT07", "ZOT7", "zona 07", "zona 7", "ZONA07", "ZONA7"],
    description: "Variações de formatação de zona"
  },
  {
    base: "Centro Histórico",
    variations: ["CENTRO HISTÓRICO", "CENTRO HISTORICO", "centro histórico", "centro historico"],
    description: "Variações de case e acentuação"
  }
];

async function testQuery(query) {
  try {
    console.log(chalk.yellow(`\n📝 Testando: "${query.query}"`));
    console.log(chalk.gray(`   ${query.description}`));
    
    // Chamar a edge function agentic-rag
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: { 
        query: query.query,
        conversationId: `test-${Date.now()}`
      }
    });

    if (error) {
      console.log(chalk.red('❌ Erro:'), error.message);
      return;
    }

    if (data?.answer) {
      console.log(chalk.green('✅ Resposta recebida:'));
      console.log(chalk.white(data.answer.substring(0, 200) + '...'));
      
      // Verificar se a resposta menciona riscos
      const hasRiskInfo = data.answer.toLowerCase().includes('risco') || 
                         data.answer.toLowerCase().includes('inundação') ||
                         data.answer.toLowerCase().includes('deslizamento') ||
                         data.answer.toLowerCase().includes('alagamento');
      
      if (hasRiskInfo) {
        console.log(chalk.green('✓ Resposta contém informações sobre riscos'));
      } else {
        console.log(chalk.yellow('⚠ Resposta pode não conter informações sobre riscos'));
      }
    } else {
      console.log(chalk.red('❌ Resposta vazia ou formato inesperado'));
    }
  } catch (err) {
    console.log(chalk.red('❌ Erro na execução:'), err.message);
  }
}

async function testSemanticVariation(variation) {
  console.log(chalk.blue(`\n🔄 Testando variações semânticas para: ${variation.base}`));
  console.log(chalk.gray(`   ${variation.description}`));
  
  for (const variant of variation.variations) {
    const query = `Qual a altura máxima em ${variant}?`;
    
    try {
      console.log(chalk.cyan(`\n   Variação: "${variant}"`));
      
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: { 
          query: query,
          conversationId: `test-semantic-${Date.now()}`
        }
      });

      if (error) {
        console.log(chalk.red('   ❌ Erro:'), error.message);
        continue;
      }

      if (data?.answer) {
        // Verificar se encontrou informações
        const hasData = data.answer.includes('altura') || 
                       data.answer.includes('metros') ||
                       data.answer.includes('ZOT');
        
        if (hasData) {
          console.log(chalk.green('   ✅ Encontrou dados para a variação'));
        } else {
          console.log(chalk.red('   ❌ Não encontrou dados para a variação'));
        }
      }
    } catch (err) {
      console.log(chalk.red('   ❌ Erro:'), err.message);
    }
  }
}

async function runTests() {
  // Testar queries sobre riscos
  console.log(chalk.blue.bold('\n1️⃣ Testando queries sobre riscos de desastre:\n'));
  
  for (const query of testQueries) {
    await testQuery(query);
    // Aguardar um pouco entre as queries para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Testar variações semânticas
  console.log(chalk.blue.bold('\n2️⃣ Testando variações semânticas:\n'));
  
  for (const variation of semanticVariations) {
    await testSemanticVariation(variation);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(chalk.green.bold('\n✅ Testes concluídos!\n'));
}

// Executar testes
runTests().catch(console.error);