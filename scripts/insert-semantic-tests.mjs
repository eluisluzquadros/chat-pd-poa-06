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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(chalk.red('❌ Missing Supabase credentials in .env.local'));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log(chalk.blue.bold('\n📝 Inserindo casos de teste QA para variações semânticas\n'));

const testCases = [
  // Variações de zonas
  {
    test_id: 'semantic_zone_zot07_v1',
    query: 'Qual a altura máxima na ZOT 07?',
    expected_keywords: ['altura', 'máxima', 'ZOT 07', 'metros'],
    category: 'semantic_variation',
    complexity: 'medium',
    min_response_length: 100,
    expected_response: 'A altura máxima na ZOT 07 varia dependendo da subdivisão'
  },
  {
    test_id: 'semantic_zone_zot07_v2',
    query: 'Qual a altura máxima na ZOT7?',
    expected_keywords: ['altura', 'máxima', 'ZOT 07', 'metros'],
    category: 'semantic_variation',
    complexity: 'medium',
    min_response_length: 100,
    expected_response: 'A altura máxima na ZOT 07 varia dependendo da subdivisão'
  },
  {
    test_id: 'semantic_zone_zot07_v3',
    query: 'Qual a altura máxima na zona 7?',
    expected_keywords: ['altura', 'máxima', 'ZOT 07', 'metros'],
    category: 'semantic_variation',
    complexity: 'medium',
    min_response_length: 100,
    expected_response: 'A altura máxima na ZOT 07 varia dependendo da subdivisão'
  },
  
  // Variações de bairros
  {
    test_id: 'semantic_bairro_petropolis_v1',
    query: 'Qual a altura máxima no bairro Petrópolis?',
    expected_keywords: ['altura', 'máxima', 'Petrópolis', 'metros'],
    category: 'semantic_variation',
    complexity: 'medium',
    min_response_length: 150,
    expected_response: 'No bairro Petrópolis, a altura máxima varia conforme a zona'
  },
  {
    test_id: 'semantic_bairro_petropolis_v2',
    query: 'Qual a altura máxima no bairro PETROPOLIS?',
    expected_keywords: ['altura', 'máxima', 'Petrópolis', 'metros'],
    category: 'semantic_variation',
    complexity: 'medium',
    min_response_length: 150,
    expected_response: 'No bairro Petrópolis, a altura máxima varia conforme a zona'
  },
  {
    test_id: 'semantic_bairro_petropolis_v3',
    query: 'Petrópolis',
    expected_keywords: ['Petrópolis', 'zona', 'altura'],
    category: 'semantic_variation',
    complexity: 'simple',
    min_response_length: 150,
    expected_response: 'Petrópolis é um bairro de Porto Alegre com as seguintes zonas e parâmetros'
  },
  
  // Testes de riscos
  {
    test_id: 'risk_inundation_v1',
    query: 'Quais bairros têm risco de inundação?',
    expected_keywords: ['risco', 'inundação', 'bairros'],
    category: 'risk_assessment',
    complexity: 'medium',
    min_response_length: 200,
    expected_response: 'Os bairros com risco de inundação em Porto Alegre incluem'
  },
  {
    test_id: 'risk_specific_bairro_v1',
    query: 'Quais os riscos do bairro Centro Histórico?',
    expected_keywords: ['risco', 'Centro Histórico', 'inundação', 'alagamento'],
    category: 'risk_assessment',
    complexity: 'medium',
    min_response_length: 150,
    expected_response: 'O bairro Centro Histórico apresenta os seguintes riscos'
  },
  {
    test_id: 'risk_high_level_v1',
    query: 'Liste os bairros com alto risco de desastre',
    expected_keywords: ['alto', 'risco', 'desastre', 'bairros'],
    category: 'risk_assessment',
    complexity: 'high',
    min_response_length: 250,
    expected_response: 'Os bairros com alto risco de desastre em Porto Alegre são'
  }
];

async function insertTestCases() {
  let inserted = 0;
  let errors = 0;
  
  for (const testCase of testCases) {
    try {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('qa_test_cases')
        .select('test_id')
        .eq('test_id', testCase.test_id)
        .single();
      
      if (existing) {
        // Atualizar caso existente
        const { error } = await supabase
          .from('qa_test_cases')
          .update({
            ...testCase,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('test_id', testCase.test_id);
        
        if (error) throw error;
        console.log(chalk.yellow(`📝 Atualizado: ${testCase.test_id}`));
      } else {
        // Inserir novo
        const { error } = await supabase
          .from('qa_test_cases')
          .insert({
            ...testCase,
            is_active: true
          });
        
        if (error) throw error;
        console.log(chalk.green(`✅ Inserido: ${testCase.test_id}`));
      }
      
      inserted++;
    } catch (error) {
      console.log(chalk.red(`❌ Erro ao inserir ${testCase.test_id}:`), error.message);
      errors++;
    }
  }
  
  console.log(chalk.blue(`\n📊 Resumo:`));
  console.log(chalk.green(`✅ Sucesso: ${inserted} casos`));
  if (errors > 0) {
    console.log(chalk.red(`❌ Erros: ${errors} casos`));
  }
}

// Executar inserção
insertTestCases()
  .then(() => {
    console.log(chalk.green.bold('\n✨ Processo concluído!\n'));
  })
  .catch(console.error);