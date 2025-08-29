#!/usr/bin/env node

/**
 * Normalização dos nomes dos 94 bairros e 16 zonas de Porto Alegre
 * Garante consistência nos dados para melhor busca
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Lista oficial dos 94 bairros de Porto Alegre
const BAIRROS_POA = [
  'ABERTA DOS MORROS', 'AGRONOMIA', 'ANCHIETA', 'ARQUIPÉLAGO', 'AUXILIADORA',
  'AZENHA', 'BELA VISTA', 'BELÉM NOVO', 'BELÉM VELHO', 'BOA VISTA',
  'BOA VISTA DO SUL', 'BOM FIM', 'BOM JESUS', 'CAMAQUÃ', 'CAMPO NOVO',
  'CASCATA', 'CAVALHADA', 'CEL. APARÍCIO BORGES', 'CENTRO HISTÓRICO',
  'CHÁCARA DAS PEDRAS', 'CHAPÉU DO SOL', 'CIDADE BAIXA', 'COSTA E SILVA',
  'CRISTAL', 'CRISTO REDENTOR', 'ESPÍRITO SANTO', 'EXTREMA', 'FARRAPOS',
  'FARROUPILHA', 'FLORESTA', 'GLÓRIA', 'GUARUJÁ', 'HIGIENÓPOLIS', 'HÍPICA',
  'HUMAITÁ', 'INDEPENDÊNCIA', 'IPANEMA', 'JARDIM BOTÂNICO', 'JARDIM CARVALHO',
  'JARDIM DO SALSO', 'JARDIM EUROPA', 'JARDIM FLORESTA', 'JARDIM ITU',
  'JARDIM LEOPOLDINA', 'JARDIM LINDÓIA', 'JARDIM SABARÁ', 'JARDIM SÃO PEDRO',
  'JARDIM VILA NOVA', 'LAGEADO', 'LAMI', 'LOMBA DO PINHEIRO', 'MARCÍLIO DIAS',
  'MÁRIO QUINTANA', 'MEDIANEIRA', 'MENINO DEUS', 'MOINHOS DE VENTO',
  'MONT SERRAT', 'NAVEGANTES', 'NONOAI', 'PARTENON', 'PASSO DA AREIA',
  'PASSO DAS PEDRAS', 'PEDRA REDONDA', 'PETRÓPOLIS', 'PONTA GROSSA',
  'PRAIA DE BELAS', 'PROTÁSIO ALVES', 'RESTINGA', 'RIO BRANCO', 'RUBEM BERTA',
  'SANTA CECÍLIA', 'SANTA MARIA GORETTI', 'SANTA TEREZA', 'SANTANA',
  'SANTO ANTÔNIO', 'SÃO GERALDO', 'SÃO JOÃO', 'SÃO JOSÉ', 'SÃO SEBASTIÃO',
  'SARANDI', 'SERRARIA', 'TERESÓPOLIS', 'TRÊS FIGUEIRAS', 'TRISTEZA',
  'VILA ASSUNÇÃO', 'VILA CONCEIÇÃO', 'VILA IPIRANGA', 'VILA JARDIM',
  'VILA JOÃO PESSOA', 'VILA NOVA', 'VILA NOVO HAMBURGO', 'VILA SERAFINA',
  'VILA SILVA', 'BARRO VERMELHO', 'BELA SEARA', 'BELÉM', 'CHAPÉU DO SOL',
  'CORONEL APARÍCIO BORGES', 'JARDIM COPACABANA', 'JARDIM PALERMO',
  'PARQUE DOS MAIAS', 'PASSO D\'AREIA', 'SANTA ROSA DE LIMA', 'TAMANDARÉ',
  'VILA FARROUPILHA', 'VILA FERNANDES', 'VILA NOSSA SENHORA DAS GRAÇAS'
];

// Zonas Oficiais de Porto Alegre (ZOT)
const ZONAS_POA = [
  'ZOT 01', 'ZOT 02', 'ZOT 03', 'ZOT 04', 'ZOT 05', 'ZOT 06',
  'ZOT 07', 'ZOT 08', 'ZOT 09', 'ZOT 10', 'ZOT 11', 'ZOT 12',
  'ZOT 13', 'ZOT 14', 'ZOT 15', 'ZOT 16'
];

/**
 * Normaliza nome do bairro para busca
 */
function normalizeBairroName(name) {
  if (!name) return '';
  
  return name
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    // Normalizar acentos mais comuns
    .replace(/[ÀÁÂÃÄ]/g, 'A')
    .replace(/[ÈÉÊË]/g, 'E')
    .replace(/[ÌÍÎÏ]/g, 'I')
    .replace(/[ÒÓÔÕÖ]/g, 'O')
    .replace(/[ÙÚÛÜ]/g, 'U')
    .replace(/Ç/g, 'C')
    .replace(/Ñ/g, 'N');
}

/**
 * Encontra bairro mais similar na lista oficial
 */
function findBestBairroMatch(inputName) {
  if (!inputName) return null;
  
  const normalized = normalizeBairroName(inputName);
  
  // Busca exata primeiro
  for (const bairro of BAIRROS_POA) {
    if (normalizeBairroName(bairro) === normalized) {
      return bairro;
    }
  }
  
  // Busca parcial
  for (const bairro of BAIRROS_POA) {
    const bairroNorm = normalizeBairroName(bairro);
    if (bairroNorm.includes(normalized) || normalized.includes(bairroNorm)) {
      return bairro;
    }
  }
  
  // Busca por palavras-chave
  const words = normalized.split(' ');
  for (const bairro of BAIRROS_POA) {
    const bairroWords = normalizeBairroName(bairro).split(' ');
    const matches = words.filter(w => bairroWords.some(bw => bw.includes(w) || w.includes(bw)));
    if (matches.length >= Math.min(words.length, bairroWords.length) * 0.6) {
      return bairro;
    }
  }
  
  return null;
}

/**
 * Normaliza zona (ZOT)
 */
function normalizeZonaName(name) {
  if (!name) return '';
  
  // Extrair número da zona
  const match = name.match(/(\d+)/);
  if (match) {
    const num = match[1].padStart(2, '0'); // 2 -> 02
    return `ZOT ${num}`;
  }
  
  return name.toUpperCase().trim();
}

/**
 * Atualizar keywords dos registros REGIME_FALLBACK
 */
async function normalizeRegimeFallback() {
  console.log(chalk.blue('🏗️ Normalizando dados de REGIME_FALLBACK...\n'));
  
  // Buscar todos os registros REGIME_FALLBACK
  const { data: regimeRecords, error } = await supabase
    .from('legal_articles')
    .select('id, keywords, full_content')
    .eq('document_type', 'REGIME_FALLBACK');
  
  if (error || !regimeRecords) {
    console.error(chalk.red('❌ Erro ao buscar registros REGIME_FALLBACK:', error?.message));
    return;
  }
  
  console.log(`📊 Encontrados ${regimeRecords.length} registros REGIME_FALLBACK`);
  
  let updated = 0;
  let errors = 0;
  
  for (const record of regimeRecords) {
    try {
      let needsUpdate = false;
      const newKeywords = [...(record.keywords || [])];
      
      // Extrair bairro do conteúdo
      let bairroFound = null;
      if (record.full_content) {
        // Buscar padrões como "# BAIRRO_NOME" ou "BAIRRO:"
        const bairroMatch = record.full_content.match(/(?:#\s*|BAIRRO[_:\s]+)([A-ZÁÊÔÓÍÚÇÃÕ\s\-]+)/i);
        if (bairroMatch) {
          const bairroName = bairroMatch[1].trim();
          const normalizedBairro = findBestBairroMatch(bairroName);
          
          if (normalizedBairro) {
            bairroFound = normalizedBairro;
            
            // Atualizar keyword do bairro
            const bairroKeyword = `BAIRRO_${normalizeBairroName(normalizedBairro).replace(/\s+/g, '_')}`;
            
            // Remover keywords antigas de bairro
            const filteredKeywords = newKeywords.filter(k => !k.startsWith('BAIRRO_'));
            
            // Adicionar nova keyword
            if (!filteredKeywords.includes(bairroKeyword)) {
              filteredKeywords.push(bairroKeyword);
              needsUpdate = true;
            }
            
            newKeywords.splice(0, newKeywords.length, ...filteredKeywords);
          }
        }
      }
      
      // Normalizar zonas nas keywords - corrigir inconsistências
      for (let i = 0; i < newKeywords.length; i++) {
        const keyword = newKeywords[i];
        let normalizedKeyword = keyword;
        
        // Corrigir zonas com duplicação de prefixo ZOT
        if (keyword.startsWith('ZONA_ZOT-')) {
          // ZONA_ZOT-01 → ZONA_01
          const match = keyword.match(/ZONA_ZOT-(\d+)/);
          if (match) {
            const zoneNum = match[1].padStart(2, '0');
            normalizedKeyword = `ZONA_${zoneNum}`;
          }
        }
        // Corrigir duplo prefixo ZONA
        else if (keyword === 'ZONA_ZONA-RURAL') {
          normalizedKeyword = 'ZONA_RURAL';
        }
        
        // Atualizar se necessário
        if (normalizedKeyword !== keyword) {
          newKeywords[i] = normalizedKeyword;
          needsUpdate = true;
        }
      }
      
      // Atualizar registro se necessário
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('legal_articles')
          .update({ keywords: newKeywords })
          .eq('id', record.id);
        
        if (updateError) {
          console.error(chalk.red(`❌ Erro atualizando registro ${record.id}:`, updateError.message));
          errors++;
        } else {
          updated++;
          if (bairroFound) {
            console.log(chalk.green(`✅ ${record.id}: Bairro normalizado para "${bairroFound}"`));
          }
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Erro processando registro ${record.id}:`, error.message));
      errors++;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log(chalk.cyan(`\n📊 Normalização REGIME_FALLBACK concluída:`));
  console.log(`  ✅ Atualizados: ${updated}`);
  console.log(`  ❌ Erros: ${errors}`);
}

/**
 * Verificar cobertura dos bairros
 */
async function verifyBairrosCobertura() {
  console.log(chalk.blue('\n🔍 Verificando cobertura dos bairros...\n'));
  
  const { data: regimeData } = await supabase
    .from('legal_articles')
    .select('keywords')
    .eq('document_type', 'REGIME_FALLBACK');
  
  const bairrosEncontrados = new Set();
  
  regimeData?.forEach(r => {
    r.keywords?.forEach(k => {
      if (k.startsWith('BAIRRO_')) {
        const bairroName = k.replace('BAIRRO_', '').replace(/_/g, ' ');
        bairrosEncontrados.add(bairroName);
      }
    });
  });
  
  console.log(`📊 Bairros encontrados no banco: ${bairrosEncontrados.size}`);
  console.log(`📋 Bairros oficiais POA: ${BAIRROS_POA.length}`);
  
  const cobertura = (bairrosEncontrados.size / BAIRROS_POA.length) * 100;
  console.log(`📈 Taxa de cobertura: ${cobertura.toFixed(1)}%`);
  
  // Listar bairros faltando
  const faltando = [];
  for (const bairro of BAIRROS_POA.slice(0, 20)) { // Primeiros 20 para teste
    const normalized = normalizeBairroName(bairro);
    let found = false;
    
    for (const found_bairro of bairrosEncontrados) {
      if (normalizeBairroName(found_bairro) === normalized) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      faltando.push(bairro);
    }
  }
  
  if (faltando.length > 0) {
    console.log(chalk.yellow(`\n⚠️ Bairros possivelmente faltando (${faltando.length}):`));
    faltando.slice(0, 10).forEach(b => console.log(`  - ${b}`));
  } else {
    console.log(chalk.green('\n✅ Todos os bairros principais estão cobertos!'));
  }
}

/**
 * Main execution
 */
async function normalizeBairrosZonas() {
  console.log(chalk.bold.cyan('\n🎯 NORMALIZAÇÃO DOS BAIRROS E ZONAS DE PORTO ALEGRE\n'));
  console.log(chalk.gray('Garantindo consistência dos dados para melhor busca...'));
  
  try {
    // Normalizar REGIME_FALLBACK
    await normalizeRegimeFallback();
    
    // Verificar cobertura
    await verifyBairrosCobertura();
    
    console.log(chalk.bold.green('\n✅ Normalização concluída com sucesso!'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Erro na normalização:', error));
  }
}

// Executar normalização
if (import.meta.url === `file://${process.argv[1]}`) {
  normalizeBairrosZonas().catch(console.error);
}

export { normalizeBairrosZonas, BAIRROS_POA, ZONAS_POA };