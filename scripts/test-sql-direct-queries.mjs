#!/usr/bin/env node

/**
 * TESTE DIRETO DE QUERIES SQL
 * Verifica se os dados podem ser acessados com as queries corretas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Testes de queries diretas
 */
async function testDirectQueries() {
  console.log(chalk.bold.cyan('\n🔍 TESTE DE QUERIES SQL DIRETAS\n'));
  console.log(chalk.gray('=' .repeat(70)));
  
  const tests = [
    {
      name: 'Query com nome correto da coluna (maiúscula)',
      query: async () => {
        const { data, error } = await supabase
          .from('regime_urbanistico_consolidado')
          .select('*')
          .ilike('"Bairro"', '%PETRÓPOLIS%')
          .limit(5);
        return { data, error };
      }
    },
    {
      name: 'Query com nome incorreto (minúscula)',
      query: async () => {
        const { data, error } = await supabase
          .from('regime_urbanistico_consolidado')
          .select('*')
          .ilike('bairro', '%PETRÓPOLIS%')
          .limit(5);
        return { data, error };
      }
    },
    {
      name: 'Query com extração correta do bairro',
      query: async () => {
        const fullQuery = 'qual a altura máxima em petrópolis';
        // Extrair apenas "petrópolis"
        const bairroMatch = fullQuery.match(/(?:em|no|na|do|da)\s+([a-záêôóíúçãõ\s]+)$/i);
        const bairro = bairroMatch ? bairroMatch[1].trim().toUpperCase() : fullQuery.toUpperCase();
        
        console.log(chalk.gray(`  Extracted: "${bairro}"`));
        
        const { data, error } = await supabase
          .from('regime_urbanistico_consolidado')
          .select('*')
          .ilike('"Bairro"', `%${bairro}%`)
          .limit(5);
        return { data, error };
      }
    },
    {
      name: 'Query com múltiplos bairros problemáticos',
      query: async () => {
        const bairros = ['ABERTA DOS MORROS', 'CENTRO HISTÓRICO', 'BELÉM NOVO'];
        const results = [];
        
        for (const bairro of bairros) {
          const { data, error } = await supabase
            .from('regime_urbanistico_consolidado')
            .select('"Bairro", "Zona", "Altura_Maxima___Edificacao_Isolada"')
            .ilike('"Bairro"', `%${bairro}%`)
            .limit(2);
          
          results.push({
            bairro,
            found: data?.length || 0,
            error: error?.message
          });
        }
        return { data: results, error: null };
      }
    },
    {
      name: 'Query usando .or() como no agentic-rag',
      query: async () => {
        const conditions = [
          '"Bairro".ilike.%PETRÓPOLIS%',
          '"Zona".ilike.%ZOT 07%'
        ];
        
        const { data, error } = await supabase
          .from('regime_urbanistico_consolidado')
          .select('*')
          .or(conditions.join(','))
          .limit(5);
        return { data, error };
      }
    },
    {
      name: 'Query FALLBACK em legal_articles',
      query: async () => {
        const { data, error } = await supabase
          .from('legal_articles')
          .select('id, keywords, full_content')
          .eq('document_type', 'REGIME_FALLBACK')
          .contains('keywords', ['BAIRRO_PETROPOLIS'])
          .limit(3);
        return { data, error };
      }
    }
  ];
  
  // Executar cada teste
  for (const test of tests) {
    console.log(chalk.bold.blue(`\n📝 ${test.name}`));
    
    try {
      const { data, error } = await test.query();
      
      if (error) {
        console.log(chalk.red(`  ❌ ERRO: ${error.message}`));
      } else if (!data || (Array.isArray(data) && data.length === 0)) {
        console.log(chalk.yellow(`  ⚠️ Nenhum resultado encontrado`));
      } else {
        console.log(chalk.green(`  ✅ SUCESSO: ${Array.isArray(data) ? data.length : 'OK'} resultados`));
        
        // Mostrar amostra dos dados
        if (Array.isArray(data) && data[0]) {
          const sample = data[0];
          if (sample.Bairro) {
            console.log(chalk.gray(`     Bairro: ${sample.Bairro}`));
            console.log(chalk.gray(`     Zona: ${sample.Zona}`));
            if (sample.Altura_Maxima___Edificacao_Isolada) {
              console.log(chalk.gray(`     Altura: ${sample.Altura_Maxima___Edificacao_Isolada}m`));
            }
          } else if (sample.bairro && sample.found !== undefined) {
            // Resultado do teste múltiplos bairros
            data.forEach(r => {
              const status = r.found > 0 ? '✅' : '❌';
              console.log(chalk.gray(`     ${status} ${r.bairro}: ${r.found} registros`));
            });
          }
        }
      }
    } catch (error) {
      console.log(chalk.red(`  ❌ EXCEÇÃO: ${error.message}`));
    }
  }
  
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('CONCLUSÕES'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.yellow(`
⚠️ DESCOBERTAS IMPORTANTES:

1. As colunas DEVEM usar maiúsculas com aspas duplas: "Bairro", "Zona"
2. A Edge Function está usando os nomes corretos
3. O problema é que busca pela query INTEIRA ao invés de extrair o bairro
4. Exemplo: busca "qual a altura máxima em petrópolis" ao invés de "PETRÓPOLIS"
5. Dados de fallback existem mas precisam de keywords normalizadas
  `));
}

// Executar
testDirectQueries().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});