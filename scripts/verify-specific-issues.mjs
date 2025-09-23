#!/usr/bin/env node

/**
 * Verifica problemas específicos identificados no sistema
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

async function verifyArticleMappings() {
  console.log(chalk.cyan.bold('\n📚 VERIFICANDO MAPEAMENTO DE ARTIGOS\n'));
  
  // Buscar no banco qual é o artigo correto para EIV
  const eivQueries = [
    'EIV',
    'Estudo de Impacto de Vizinhança',
    'impacto vizinhança'
  ];
  
  for (const query of eivQueries) {
    console.log(`Buscando "${query}" nos documentos...`);
    
    const { data, error } = await supabase
      .from('document_sections')
      .select('content, metadata')
      .or(`content.ilike.%${query}%,metadata.ilike.%${query}%`)
      .limit(3);
    
    if (data && data.length > 0) {
      data.forEach((doc, idx) => {
        const content = doc.content.substring(0, 200);
        // Buscar menção de artigos
        const artMatch = content.match(/Art\.?\s*(\d+)/gi);
        if (artMatch) {
          console.log(`  ${idx + 1}. Encontrado: ${artMatch.join(', ')}`);
          console.log(`     Trecho: ${content}...`);
        }
      });
    }
  }
  
  // Verificar no qa_test_cases
  console.log('\n📋 Verificando resposta esperada no qa_test_cases:');
  const { data: qaCase } = await supabase
    .from('qa_test_cases')
    .select('question, expected_keywords, expected_answer')
    .or('question.ilike.%EIV%,question.ilike.%impacto%vizinhança%')
    .limit(5);
  
  if (qaCase) {
    qaCase.forEach(tc => {
      console.log(`  Pergunta: ${tc.question}`);
      console.log(`  Keywords esperadas: ${tc.expected_keywords || 'N/A'}`);
      console.log(`  Resposta esperada: ${tc.expected_answer || 'N/A'}`);
      console.log('');
    });
  }
}

async function verifyNeighborhoodData() {
  console.log(chalk.cyan.bold('\n🏘️ VERIFICANDO DADOS DE BAIRROS\n'));
  
  // Verificar Boa Vista vs Boa Vista do Sul
  console.log('1. Buscando bairros com "Boa Vista" no nome:');
  const { data: boaVistaBairros } = await supabase
    .from('regime_urbanistico_bairros')
    .select('bairro, altura_max, coef_basico, coef_maximo')
    .ilike('bairro', '%boa vista%');
  
  if (boaVistaBairros) {
    boaVistaBairros.forEach(b => {
      console.log(`  • ${b.bairro}:`);
      console.log(`    Altura: ${b.altura_max || '-'}`);
      console.log(`    Coef. Básico: ${b.coef_basico || '-'}`);
      console.log(`    Coef. Máximo: ${b.coef_maximo || '-'}`);
    });
  }
  
  // Verificar Jardim São Pedro
  console.log('\n2. Buscando "Jardim São Pedro":');
  const jardimQueries = [
    'Jardim São Pedro',
    'Jardim Sao Pedro',
    'jardim sao pedro'
  ];
  
  for (const query of jardimQueries) {
    const { data, error } = await supabase
      .from('regime_urbanistico_bairros')
      .select('*')
      .ilike('bairro', `%${query}%`)
      .single();
    
    if (data) {
      console.log(`  ✅ Encontrado com query "${query}":`);
      console.log(`     Bairro: ${data.bairro}`);
      console.log(`     Altura: ${data.altura_max}`);
      console.log(`     ZOT: ${data.zot}`);
    } else {
      console.log(`  ❌ Não encontrado com query "${query}"`);
    }
  }
  
  // Buscar o nome exato
  console.log('\n3. Listando todos os bairros com "Jardim":');
  const { data: jardimBairros } = await supabase
    .from('regime_urbanistico_bairros')
    .select('bairro')
    .ilike('bairro', '%jardim%')
    .order('bairro');
  
  if (jardimBairros) {
    jardimBairros.forEach(b => {
      console.log(`  • ${b.bairro}`);
    });
  }
}

async function verifyPermeabilityData() {
  console.log(chalk.cyan.bold('\n💧 VERIFICANDO DADOS DE PERMEABILIDADE\n'));
  
  // Buscar dados de permeabilidade
  console.log('1. Buscando taxas de permeabilidade no banco:');
  
  // Verificar na tabela de parâmetros
  const { data: permeabilidade } = await supabase
    .from('regime_urbanistico_parametros')
    .select('*')
    .or('parametro.ilike.%permeab%,descricao.ilike.%permeab%')
    .limit(5);
  
  if (permeabilidade && permeabilidade.length > 0) {
    console.log('  ✅ Encontrado em regime_urbanistico_parametros:');
    permeabilidade.forEach(p => {
      console.log(`     ${p.parametro}: ${p.valor || p.descricao}`);
    });
  } else {
    console.log('  ❌ Não encontrado em regime_urbanistico_parametros');
  }
  
  // Buscar em document_sections
  console.log('\n2. Buscando em documentos:');
  const { data: docs } = await supabase
    .from('document_sections')
    .select('content')
    .ilike('content', '%permeabilidade%1.500%')
    .limit(3);
  
  if (docs && docs.length > 0) {
    docs.forEach((d, idx) => {
      console.log(`  Doc ${idx + 1}: ${d.content.substring(0, 150)}...`);
    });
  } else {
    console.log('  ❌ Não encontrado nos documentos');
  }
}

async function testDirectQueries() {
  console.log(chalk.cyan.bold('\n🔍 TESTANDO QUERIES DIRETAS\n'));
  
  const testQueries = [
    {
      query: 'Qual artigo define o Estudo de Impacto de Vizinhança?',
      expected: 'Art. 89 ou 90'
    },
    {
      query: 'Qual a altura máxima em Boa Vista?',
      expected: 'Dados do bairro Boa Vista (não Sul)'
    },
    {
      query: 'Qual é a taxa de permeabilidade mínima para terrenos acima de 1.500 m²?',
      expected: 'Valor específico de permeabilidade'
    }
  ];
  
  for (const test of testQueries) {
    console.log(chalk.yellow(`\nTestando: "${test.query}"`));
    console.log(`Esperado: ${test.expected}`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: test.query,
          sessionId: 'debug-test',
          bypassCache: true
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        const responsePreview = result.response.substring(0, 200);
        console.log(`Resposta: ${responsePreview}...`);
        
        // Verificar problemas específicos
        if (test.query.includes('EIV') && result.response.includes('Art. 89')) {
          console.log(chalk.red('  ⚠️ Retornou Art. 89 - verificar se deveria ser 90'));
        }
        if (test.query.includes('Boa Vista') && result.response.includes('Boa Vista do Sul')) {
          console.log(chalk.red('  ⚠️ Confundiu com Boa Vista do Sul'));
        }
        if (result.response.includes('não encontrei') || result.response.includes('Desculpe')) {
          console.log(chalk.red('  ⚠️ Não encontrou informação'));
        }
      }
    } catch (error) {
      console.log(chalk.red(`Erro: ${error.message}`));
    }
  }
}

async function main() {
  console.log(chalk.cyan.bold('=' .repeat(60)));
  console.log(chalk.cyan.bold('   VERIFICAÇÃO DE PROBLEMAS ESPECÍFICOS'));
  console.log(chalk.cyan.bold('=' .repeat(60)));
  
  await verifyArticleMappings();
  await verifyNeighborhoodData();
  await verifyPermeabilityData();
  await testDirectQueries();
  
  console.log(chalk.cyan.bold('\n' + '=' .repeat(60)));
  console.log(chalk.green.bold('\n📊 RESUMO DOS PROBLEMAS:\n'));
  
  console.log('1. 📚 Artigos LUOS:');
  console.log('   - Verificar se EIV é Art. 89 ou 90 nos documentos originais');
  console.log('   - Atualizar response-synthesizer-simple se necessário\n');
  
  console.log('2. 🏘️ Diferenciação de Bairros:');
  console.log('   - Implementar busca EXATA para evitar confusão');
  console.log('   - "Boa Vista" ≠ "Boa Vista do Sul"\n');
  
  console.log('3. 🔤 Normalização de Nomes:');
  console.log('   - Padronizar busca (com/sem acentos, maiúsculas)');
  console.log('   - "Jardim São Pedro" vs "jardim sao pedro"\n');
  
  console.log('4. 💧 Dados Faltantes:');
  console.log('   - Verificar e popular dados de permeabilidade');
  console.log('   - Corrigir valores "-" nos coeficientes');
}

main().catch(error => {
  console.error(chalk.red('Erro:', error));
  process.exit(1);
});