#!/usr/bin/env node

/**
 * POPULAR KEYWORDS - Adiciona palavras-chave esperadas aos casos de teste
 * Baseado na análise das respostas esperadas
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Mapeamento de keywords por categoria e padrões de pergunta
const keywordMappings = {
  // Altura máxima
  'altura máxima': ['metros', 'altura', 'máxima'],
  'altura máxima permitida': ['metros', 'altura', 'permitida'],
  'altura máxima mais alta': ['130', 'metros', 'Centro Histórico'],
  
  // Bairros específicos
  'três figueiras': ['Três Figueiras', 'ZOT', 'altura', 'coeficiente'],
  'boa vista': ['Boa Vista', 'ZOT', '90m', '60m', '18m'],
  'centro histórico': ['Centro Histórico', 'ZOT 08.1', '130m', '100m'],
  'mário quintana': ['Mário Quintana', 'risco', 'inundação'],
  'petrópolis': ['Petrópolis', 'ZOT', 'regime urbanístico'],
  'auxiliadora': ['Auxiliadora', 'ZOT'],
  'azenha': ['Azenha', 'ZOT'],
  
  // Conceitos
  'ZEIS': ['ZEIS', 'Art. 92', 'PDUS', 'Interesse Social'],
  'EIV': ['EIV', 'Art. 90', 'LUOS', 'Estudo', 'Impacto', 'Vizinhança'],
  'outorga onerosa': ['outorga', 'onerosa', 'Art. 86', 'LUOS'],
  'certificação': ['certificação', 'sustentabilidade', 'Art. 81', 'LUOS'],
  '4º distrito': ['4º Distrito', 'Art. 74', 'LUOS'],
  'CMDUA': ['CMDUA', 'Conselho', 'Municipal', 'Desenvolvimento'],
  'gentrificação': ['gentrificação', 'valorização', 'imobiliária'],
  
  // Coeficientes
  'coeficiente': ['coeficiente', 'aproveitamento', 'básico', 'máximo'],
  'coef_aproveitamento': ['CA', 'básico', 'máximo', 'aproveitamento'],
  
  // Regime urbanístico
  'regime urbanístico': ['altura', 'coeficiente', 'taxa', 'recuo'],
  'índices': ['altura', 'aproveitamento', 'permeabilidade'],
  
  // Taxa de permeabilidade
  'taxa de permeabilidade': ['permeabilidade', '%', 'mínima'],
  'taxa de ocupação': ['ocupação', '%', 'construída'],
  
  // Zoneamento
  'ZOT': ['ZOT', 'Zona', 'Ordenamento', 'Territorial'],
  'zoneamento': ['16', 'ZOTs', 'morfológicas', 'ambientais'],
  'zona rural': ['rural', 'ZOT 14', 'ZOT 15', 'ZOT 16'],
  
  // Recuos
  'recuo': ['recuo', 'jardim', 'frontal', 'lateral'],
  'afastamento': ['afastamento', 'lateral', 'fundos'],
  
  // Sistemas
  'sistema ecológico': ['ecológico', 'ambiental', 'preservação'],
  'sistema socioeconômico': ['socioeconômico', 'desenvolvimento'],
  'espaços abertos': ['espaços', 'abertos', 'públicos'],
  
  // Áreas
  'áreas de risco': ['risco', 'inundação', 'alagamento', 'enchente'],
  'preservação permanente': ['APP', 'preservação', 'permanente', 'Art. 95', 'PDUS'],
  
  // Outros
  'audiência pública': ['audiência', 'pública', 'participação'],
  'habitação': ['HIS', 'habitação', 'interesse social', 'déficit'],
  'mobilidade': ['mobilidade', 'transporte', 'deslocamento'],
  'enchentes 2024': ['enchentes', '2024', 'inundação', 'resposta']
};

async function extractKeywordsFromQuestion(question, category) {
  const keywords = [];
  const questionLower = question.toLowerCase();
  
  // Verificar cada padrão de mapeamento
  for (const [pattern, kws] of Object.entries(keywordMappings)) {
    if (questionLower.includes(pattern)) {
      keywords.push(...kws);
    }
  }
  
  // Adicionar keywords específicas por categoria
  switch (category) {
    case 'altura_maxima':
      if (!keywords.includes('metros')) keywords.push('metros');
      if (!keywords.includes('altura')) keywords.push('altura');
      break;
      
    case 'legal_articles':
    case 'uso-solo':
      // Verificar menções a artigos
      if (questionLower.includes('artigo') || questionLower.includes('art.')) {
        if (questionLower.includes('eiv')) {
          keywords.push('Art. 90', 'LUOS');
        }
        if (questionLower.includes('zeis')) {
          keywords.push('Art. 92', 'PDUS');
        }
        if (questionLower.includes('certificação')) {
          keywords.push('Art. 81', 'LUOS');
        }
        if (questionLower.includes('outorga')) {
          keywords.push('Art. 86', 'LUOS');
        }
        if (questionLower.includes('coeficiente')) {
          keywords.push('Art. 82', 'LUOS');
        }
        if (questionLower.includes('recuo')) {
          keywords.push('Art. 83', 'LUOS');
        }
        if (questionLower.includes('permeabilidade')) {
          keywords.push('Art. 84', 'LUOS');
        }
      }
      break;
      
    case 'bairros':
      // Extrair nome do bairro mencionado
      const bairros = [
        'Três Figueiras', 'Boa Vista', 'Centro Histórico', 
        'Mário Quintana', 'Petrópolis', 'Auxiliadora', 'Azenha'
      ];
      bairros.forEach(bairro => {
        if (questionLower.includes(bairro.toLowerCase())) {
          keywords.push(bairro);
        }
      });
      break;
      
    case 'zoneamento':
    case 'zonas':
      keywords.push('ZOT');
      if (questionLower.includes('quantas')) {
        keywords.push('16');
      }
      break;
  }
  
  // Remover duplicatas e retornar
  return [...new Set(keywords)];
}

async function main() {
  console.log(chalk.cyan.bold('\n🔧 POPULANDO KEYWORDS NOS CASOS DE TESTE\n'));
  
  // Buscar todos os casos de teste
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .order('id');
  
  if (error || !testCases) {
    console.error(chalk.red('❌ Erro ao buscar casos:'), error);
    process.exit(1);
  }
  
  console.log(chalk.green(`✅ ${testCases.length} casos encontrados\n`));
  
  let updated = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const keywords = await extractKeywordsFromQuestion(testCase.question, testCase.category);
    
    if (keywords.length > 0) {
      const { error: updateError } = await supabase
        .from('qa_test_cases')
        .update({ keywords })
        .eq('id', testCase.id);
      
      if (updateError) {
        console.log(chalk.red(`❌ Erro ao atualizar caso ${testCase.id}:`), updateError.message);
        failed++;
      } else {
        console.log(chalk.green(`✅ Caso ${testCase.id}: ${keywords.length} keywords adicionadas`));
        updated++;
      }
    } else {
      console.log(chalk.yellow(`⚠️ Caso ${testCase.id}: Nenhuma keyword identificada`));
    }
  }
  
  console.log(chalk.cyan.bold('\n' + '═'.repeat(60)));
  console.log(chalk.cyan.bold('📊 RESUMO'));
  console.log(chalk.cyan.bold('═'.repeat(60) + '\n'));
  
  console.log(`Total de casos: ${testCases.length}`);
  console.log(`${chalk.green('✅ Atualizados:')} ${updated}`);
  console.log(`${chalk.red('❌ Falhas:')} ${failed}`);
  console.log(`${chalk.yellow('⚠️ Sem keywords:')} ${testCases.length - updated - failed}`);
  
  if (updated > 0) {
    console.log(chalk.green.bold('\n✨ Keywords populadas com sucesso!'));
    console.log('Execute o teste novamente para validar a precisão.');
  }
}

main().catch(error => {
  console.error(chalk.red('\n❌ ERRO:'), error);
  process.exit(1);
});