#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import chalk from 'chalk';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '..', '.env.local');

dotenv.config({ path: envPath });

// Tentar com variáveis diferentes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(chalk.red('❌ Missing Supabase credentials'));
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log(chalk.blue.bold('\n🏘️ Extraindo todos os bairros do banco de dados\n'));

async function removeAccents(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/gi, 'C')
    .replace(/ñ/gi, 'N');
}

async function extractBairros() {
  const allBairros = new Set();
  
  try {
    // 1. Buscar da tabela regime_urbanistico
    console.log(chalk.yellow('📍 Buscando bairros da tabela regime_urbanistico...'));
    const { data: regimeBairros, error: regimeError } = await supabase
      .from('regime_urbanistico')
      .select('bairro')
      .not('bairro', 'is', null);
    
    if (!regimeError && regimeBairros) {
      regimeBairros.forEach(row => {
        if (row.bairro) allBairros.add(row.bairro.trim());
      });
      console.log(chalk.green(`✅ Encontrados ${regimeBairros.length} registros em regime_urbanistico`));
    }
    
    // 2. Buscar da tabela bairros_risco_desastre
    console.log(chalk.yellow('📍 Buscando bairros da tabela bairros_risco_desastre...'));
    const { data: riscoBairros, error: riscoError } = await supabase
      .from('bairros_risco_desastre')
      .select('bairro_nome')
      .not('bairro_nome', 'is', null);
    
    if (!riscoError && riscoBairros) {
      riscoBairros.forEach(row => {
        if (row.bairro_nome) allBairros.add(row.bairro_nome.trim());
      });
      console.log(chalk.green(`✅ Encontrados ${riscoBairros.length} registros em bairros_risco_desastre`));
    }
    
    // 3. Buscar da tabela zots_bairros (se existir)
    console.log(chalk.yellow('📍 Buscando bairros da tabela zots_bairros...'));
    const { data: zotsBairros, error: zotsError } = await supabase
      .from('zots_bairros')
      .select('bairro_nome')
      .not('bairro_nome', 'is', null);
    
    if (!zotsError && zotsBairros) {
      zotsBairros.forEach(row => {
        if (row.bairro_nome) allBairros.add(row.bairro_nome.trim());
      });
      console.log(chalk.green(`✅ Encontrados ${zotsBairros.length} registros em zots_bairros`));
    }
    
    // Converter Set para Array e ordenar
    const bairrosArray = Array.from(allBairros).sort();
    
    console.log(chalk.blue(`\n📊 Total de bairros únicos encontrados: ${bairrosArray.length}\n`));
    
    // Criar mapeamento de acentos
    const accentsMap = {};
    
    for (const bairro of bairrosArray) {
      const normalized = await removeAccents(bairro.toUpperCase());
      
      // Só adicionar ao map se o nome normalizado for diferente do original em maiúsculas
      if (normalized !== bairro.toUpperCase()) {
        accentsMap[normalized] = bairro.toUpperCase();
      }
    }
    
    // Adicionar casos especiais que podem não estar no banco
    const specialCases = {
      'PETROPOLIS': 'PETRÓPOLIS',
      'INDEPENDENCIA': 'INDEPENDÊNCIA',
      'MONT SERRAT': 'MONT\'SERRAT',
      'SAO GERALDO': 'SÃO GERALDO',
      'SAO JOAO': 'SÃO JOÃO',
      'SAO JOSE': 'SÃO JOSÉ',
      'SAO SEBASTIAO': 'SÃO SEBASTIÃO',
      'JARDIM BOTANICO': 'JARDIM BOTÂNICO',
      'TERESOPOLIS': 'TERESÓPOLIS',
      'CENTRO HISTORICO': 'CENTRO HISTÓRICO',
      'SANTA CECILIA': 'SANTA CECÍLIA',
      'VILA ASSUNCAO': 'VILA ASSUNÇÃO',
      'BELEM NOVO': 'BELÉM NOVO',
      'BELEM VELHO': 'BELÉM VELHO',
      'ESPIRITO SANTO': 'ESPÍRITO SANTO',
      'GUARUJA': 'GUARUJÁ',
      'IPANEMA': 'IPANEMA',
      'LOMBA DO PINHEIRO': 'LOMBA DO PINHEIRO',
      'MARIO QUINTANA': 'MÁRIO QUINTANA',
      'MEDIANEIRA': 'MEDIANEIRA',
      'NAVEGANTES': 'NAVEGANTES',
      'PARTENON': 'PARTENON',
      'PEDRA REDONDA': 'PEDRA REDONDA',
      'PONTA GROSSA': 'PONTA GROSSA',
      'RESTINGA': 'RESTINGA',
      'RUBEM BERTA': 'RUBEM BERTA',
      'SANTA MARIA GORETTI': 'SANTA MARIA GORETTI',
      'SANTA TEREZA': 'SANTA TEREZA',
      'SANTO ANTONIO': 'SANTO ANTÔNIO',
      'SARANDI': 'SARANDI',
      'TRES FIGUEIRAS': 'TRÊS FIGUEIRAS',
      'VILA CONCEICAO': 'VILA CONCEIÇÃO',
      'VILA JARDIM': 'VILA JARDIM',
      'VILA JOAO PESSOA': 'VILA JOÃO PESSOA',
      'VILA NOVA': 'VILA NOVA'
    };
    
    // Mesclar com casos especiais
    Object.assign(accentsMap, specialCases);
    
    // Gerar código TypeScript
    const tsCode = `/**
 * Restaura acentos comuns em nomes de bairros
 * Gerado automaticamente em ${new Date().toISOString()}
 * Total de bairros mapeados: ${Object.keys(accentsMap).length}
 */
function restoreCommonAccents(normalized: string): string {
  const accentsMap: { [key: string]: string } = ${JSON.stringify(accentsMap, null, 4).replace(/"([^"]+)":/g, '    \'$1\':')};
  
  return accentsMap[normalized] || normalized;
}`;
    
    // Salvar em arquivo
    const outputPath = resolve(__dirname, 'generated-accents-map.ts');
    await fs.writeFile(outputPath, tsCode);
    
    console.log(chalk.green(`\n✅ Mapeamento de acentos gerado com sucesso!`));
    console.log(chalk.blue(`📄 Arquivo salvo em: ${outputPath}`));
    console.log(chalk.yellow(`\n📊 Estatísticas:`));
    console.log(`   - Bairros únicos: ${bairrosArray.length}`);
    console.log(`   - Mapeamentos de acentos: ${Object.keys(accentsMap).length}`);
    
    // Mostrar alguns exemplos
    console.log(chalk.cyan(`\n📝 Exemplos de mapeamentos:`));
    const examples = Object.entries(accentsMap).slice(0, 10);
    examples.forEach(([key, value]) => {
      console.log(`   ${key} → ${value}`);
    });
    
    // Listar todos os bairros encontrados
    console.log(chalk.magenta(`\n📋 Lista completa de bairros:`));
    bairrosArray.forEach((bairro, index) => {
      console.log(`   ${index + 1}. ${bairro}`);
    });
    
  } catch (error) {
    console.error(chalk.red('❌ Erro ao extrair bairros:'), error);
  }
}

// Executar extração
extractBairros();