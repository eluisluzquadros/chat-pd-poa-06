#!/usr/bin/env node

/**
 * HELPER PARA QUERIES DE REGIME URBANÍSTICO
 * Melhora a extração de bairros e zonas das queries dos usuários
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

// Lista oficial dos 94 bairros
const BAIRROS_PORTO_ALEGRE = [
  'ABERTA DOS MORROS', 'AGRONOMIA', 'ANCHIETA', 'ARQUIPÉLAGO', 'AUXILIADORA',
  'AZENHA', 'BELA VISTA', 'BELÉM NOVO', 'BELÉM VELHO', 'BOA VISTA',
  'BOA VISTA DO SUL', 'BOM FIM', 'BOM JESUS', 'CAMAQUÃ', 'CAMPO NOVO',
  'CASCATA', 'CAVALHADA', 'CEL. APARICIO BORGES', 'CENTRO HISTÓRICO', 'CHAPÉU DO SOL',
  'CHÁCARA DAS PEDRAS', 'CIDADE BAIXA', 'COSTA E SILVA', 'CRISTAL', 'CRISTO REDENTOR',
  'ESPÍRITO SANTO', 'EXTREMA', 'FARRAPOS', 'FARROUPILHA', 'FLORESTA',
  'GLÓRIA', 'GUARUJÁ', 'HIGIENÓPOLIS', 'HÍPICA', 'HUMAITÁ',
  'INDEPENDÊNCIA', 'IPANEMA', 'JARDIM BOTÂNICO', 'JARDIM CARVALHO', 'JARDIM DO SALSO',
  'JARDIM EUROPA', 'JARDIM FLORESTA', 'JARDIM ITU', 'JARDIM LEOPOLDINA', 'JARDIM LINDÓIA',
  'JARDIM SABARÁ', 'JARDIM SÃO PEDRO', 'JARDIM VILA NOVA', 'LAGEADO', 'LAMI',
  'LOMBA DO PINHEIRO', 'MÁRIO QUINTANA', 'MEDIANEIRA', 'MENINO DEUS', 'MOINHOS DE VENTO',
  'MONT SERRAT', 'NAVEGANTES', 'NONOAI', 'PARQUE SANTA FÉ', 'PARTENON',
  'PASSO D\'AREIA', 'PASSO DAS PEDRAS', 'PEDRA REDONDA', 'PETRÓPOLIS', 'PONTA GROSSA',
  'PRAIA DE BELAS', 'RESTINGA', 'RIO BRANCO', 'RUBEM BERTA', 'SANTA CECÍLIA',
  'SANTA MARIA GORETTI', 'SANTA TEREZA', 'SANTANA', 'SANTO ANTÔNIO', 'SÃO GERALDO',
  'SÃO JOÃO', 'SÃO JOSÉ', 'SÃO SEBASTIÃO', 'SARANDI', 'SERRARIA',
  'TERESÓPOLIS', 'TRÊS FIGUEIRAS', 'TRISTEZA', 'VILA ASSUNÇÃO', 'VILA CONCEIÇÃO',
  'VILA IPIRANGA', 'VILA JARDIM', 'VILA JOÃO PESSOA', 'VILA NOVA', 'VILA SÃO JOSÉ'
];

/**
 * Normaliza string removendo acentos e convertendo para maiúsculas
 */
function normalizeString(str) {
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Encontra o melhor match de bairro na query
 */
function extractBairroFromQuery(query) {
  const queryNorm = normalizeString(query);
  const matches = [];
  
  // Tentar encontrar bairros mencionados na query
  for (const bairro of BAIRROS_PORTO_ALEGRE) {
    const bairroNorm = normalizeString(bairro);
    
    // Match exato
    if (queryNorm.includes(bairroNorm)) {
      matches.push({
        bairro,
        score: 1.0,
        type: 'exact'
      });
    }
    // Match parcial (pelo menos 80% do nome)
    else {
      const words = bairroNorm.split(/\s+/);
      const foundWords = words.filter(w => queryNorm.includes(w));
      const score = foundWords.length / words.length;
      
      if (score >= 0.8) {
        matches.push({
          bairro,
          score,
          type: 'partial'
        });
      }
    }
  }
  
  // Retornar o melhor match
  matches.sort((a, b) => b.score - a.score);
  return matches[0]?.bairro || null;
}

/**
 * Extrai ZOT da query
 */
function extractZOTFromQuery(query) {
  const zotPatterns = [
    /zot\s*(\d+)/i,
    /zona\s*(\d+)/i,
    /zot[\s-]*(\d+)/i
  ];
  
  for (const pattern of zotPatterns) {
    const match = query.match(pattern);
    if (match) {
      const num = match[1].padStart(2, '0');
      return `ZOT ${num}`;
    }
  }
  
  return null;
}

/**
 * Constrói condições de busca otimizadas
 */
function buildSearchConditions(query) {
  const conditions = [];
  
  // 1. Extrair bairro
  const bairro = extractBairroFromQuery(query);
  if (bairro) {
    conditions.push(`"Bairro".ilike.%${bairro}%`);
    console.log(chalk.green(`  ✅ Bairro detectado: ${bairro}`));
    
    // Adicionar variações sem acento
    const bairroNorm = normalizeString(bairro);
    if (bairroNorm !== bairro) {
      conditions.push(`"Bairro".ilike.%${bairroNorm}%`);
    }
  }
  
  // 2. Extrair ZOT
  const zot = extractZOTFromQuery(query);
  if (zot) {
    conditions.push(`"Zona".ilike.%${zot}%`);
    console.log(chalk.green(`  ✅ Zona detectada: ${zot}`));
  }
  
  // 3. Se não encontrou nada específico, buscar termos-chave
  if (conditions.length === 0) {
    const keywords = ['altura', 'coeficiente', 'aproveitamento', 'zona', 'zot'];
    for (const keyword of keywords) {
      if (query.toLowerCase().includes(keyword)) {
        // Busca mais genérica
        const terms = query.split(/\s+/).filter(t => t.length > 3);
        for (const term of terms) {
          if (!keywords.includes(term.toLowerCase())) {
            conditions.push(`"Bairro".ilike.%${term}%`);
          }
        }
        break;
      }
    }
  }
  
  return conditions;
}

/**
 * Executa query otimizada no regime urbanístico
 */
export async function queryRegimeUrbanistico(query, supabaseClient) {
  const supabase = supabaseClient || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  console.log(chalk.blue(`\n🔍 Processando query: "${query}"`));
  
  // Construir condições de busca
  const conditions = buildSearchConditions(query);
  
  if (conditions.length === 0) {
    console.log(chalk.yellow(`  ⚠️ Nenhum termo específico encontrado`));
    return { data: [], error: null };
  }
  
  console.log(chalk.gray(`  📋 Condições: ${conditions.length}`));
  
  // Executar query
  const { data, error } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*')
    .or(conditions.join(','))
    .limit(10);
  
  if (error) {
    console.log(chalk.red(`  ❌ Erro: ${error.message}`));
    return { data: null, error };
  }
  
  console.log(chalk.green(`  ✅ Encontrados: ${data?.length || 0} resultados`));
  
  // Se encontrou dados, formatar resposta
  if (data && data.length > 0) {
    const formatted = formatRegimeData(data);
    return { data, formatted, error: null };
  }
  
  // Se não encontrou, tentar fallback
  console.log(chalk.yellow(`  🔄 Tentando fallback em REGIME_FALLBACK...`));
  
  const bairro = extractBairroFromQuery(query);
  if (bairro) {
    const bairroKeyword = `BAIRRO_${normalizeString(bairro).replace(/\s+/g, '_')}`;
    
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('legal_articles')
      .select('keywords, full_content')
      .eq('document_type', 'REGIME_FALLBACK')
      .contains('keywords', [bairroKeyword])
      .limit(5);
    
    if (fallbackData && fallbackData.length > 0) {
      console.log(chalk.green(`  ✅ Fallback: ${fallbackData.length} resultados`));
      return { data: fallbackData, error: null, fallback: true };
    }
  }
  
  return { data: [], error: null };
}

/**
 * Formata dados do regime urbanístico para resposta
 */
function formatRegimeData(data) {
  if (!data || data.length === 0) return '';
  
  const byBairro = {};
  
  // Agrupar por bairro
  for (const record of data) {
    const bairro = record.Bairro;
    if (!byBairro[bairro]) {
      byBairro[bairro] = [];
    }
    byBairro[bairro].push(record);
  }
  
  // Formatar resposta
  let response = '';
  
  for (const [bairro, records] of Object.entries(byBairro)) {
    response += `\n**${bairro}**\n`;
    
    for (const record of records) {
      response += `- Zona ${record.Zona}:\n`;
      response += `  • Altura máxima: ${record.Altura_Maxima___Edificacao_Isolada || 'N/D'}m\n`;
      response += `  • Coef. Aproveitamento Básico: ${record.Coeficiente_de_Aproveitamento___Basico || 'N/D'}\n`;
      response += `  • Coef. Aproveitamento Máximo: ${record.Coeficiente_de_Aproveitamento___Maximo || 'N/D'}\n`;
    }
  }
  
  return response;
}

/**
 * Testa o helper com exemplos
 */
async function testHelper() {
  console.log(chalk.bold.cyan('\n🧪 TESTANDO HELPER DE REGIME URBANÍSTICO\n'));
  console.log(chalk.gray('=' .repeat(70)));
  
  const testQueries = [
    'qual a altura máxima em petrópolis',
    'coeficiente de aproveitamento no centro histórico',
    'qual é a altura máxima e coef. básico e máx do aberta dos morros para cada zot',
    'o que pode ser construído em belém novo',
    'altura máxima na zot 07',
    'conte-me sobre azenha'
  ];
  
  for (const query of testQueries) {
    const result = await queryRegimeUrbanistico(query);
    
    if (result.formatted) {
      console.log(chalk.cyan('\nResposta formatada:'));
      console.log(result.formatted);
    }
    
    console.log(chalk.gray('-'.repeat(70)));
  }
}

// Se executado diretamente, rodar testes
if (import.meta.url === `file://${process.argv[1]}`) {
  testHelper().catch(error => {
    console.error(chalk.red('❌ Erro:', error));
    process.exit(1);
  });
}

export { extractBairroFromQuery, extractZOTFromQuery, buildSearchConditions, formatRegimeData };