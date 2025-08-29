#!/usr/bin/env node

/**
 * Script para importar dados de regime urbanístico usando Supabase CLI
 * 
 * Importa os dados processados diretamente para as tabelas do Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Carrega variáveis do .env.local
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function importRegimeUrbanistico() {
  console.log('🚀 Importando dados de Regime Urbanístico...\n');

  try {
    // Ler dados processados
    const regimeData = JSON.parse(
      await fs.readFile(path.join(__dirname, '..', 'processed-data', 'regime-urbanistico-processed.json'), 'utf8')
    );

    console.log(`📊 Total de registros de regime urbanístico: ${regimeData.length}`);

    // Limpar tabela existente
    console.log('🧹 Limpando dados existentes...');
    const { error: deleteError } = await supabase
      .from('regime_urbanistico')
      .delete()
      .gte('id', 0);

    if (deleteError) {
      console.log('⚠️  Erro ao limpar tabela:', deleteError.message);
    }

    // Importar em lotes
    const BATCH_SIZE = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < regimeData.length; i += BATCH_SIZE) {
      const batch = regimeData.slice(i, i + BATCH_SIZE);
      
      console.log(`\n📦 Importando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(regimeData.length/BATCH_SIZE)}...`);

      const { data, error } = await supabase
        .from('regime_urbanistico')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Erro no lote: ${error.message}`);
        errorCount += batch.length;
      } else {
        successCount += data.length;
        console.log(`✅ ${data.length} registros importados`);
      }

      // Pequena pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Resumo da importação de Regime Urbanístico:');
    console.log(`✅ Sucesso: ${successCount} registros`);
    console.log(`❌ Erros: ${errorCount} registros`);

  } catch (error) {
    console.error('❌ Erro ao importar regime urbanístico:', error.message);
  }
}

async function importZotsBairros() {
  console.log('\n\n🚀 Importando dados de ZOTs vs Bairros...\n');

  try {
    // Ler dados processados
    const zotsData = JSON.parse(
      await fs.readFile(path.join(__dirname, '..', 'processed-data', 'zots-bairros-processed.json'), 'utf8')
    );

    console.log(`📊 Total de registros de ZOTs vs Bairros: ${zotsData.length}`);

    // Limpar tabela existente
    console.log('🧹 Limpando dados existentes...');
    const { error: deleteError } = await supabase
      .from('zots_bairros')
      .delete()
      .gte('id', 0);

    if (deleteError) {
      console.log('⚠️  Erro ao limpar tabela:', deleteError.message);
    }

    // Importar em lotes
    const BATCH_SIZE = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < zotsData.length; i += BATCH_SIZE) {
      const batch = zotsData.slice(i, i + BATCH_SIZE);
      
      console.log(`\n📦 Importando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(zotsData.length/BATCH_SIZE)}...`);

      const { data, error } = await supabase
        .from('zots_bairros')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Erro no lote: ${error.message}`);
        errorCount += batch.length;
      } else {
        successCount += data.length;
        console.log(`✅ ${data.length} registros importados`);
      }

      // Pequena pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Resumo da importação de ZOTs vs Bairros:');
    console.log(`✅ Sucesso: ${successCount} registros`);
    console.log(`❌ Erros: ${errorCount} registros`);

  } catch (error) {
    console.error('❌ Erro ao importar ZOTs vs Bairros:', error.message);
  }
}

async function verifyImport() {
  console.log('\n\n🔍 Verificando importação...\n');

  try {
    // Verificar regime_urbanistico
    const { count: regimeCount } = await supabase
      .from('regime_urbanistico')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Regime Urbanístico: ${regimeCount || 0} registros (esperado: 387)`);

    // Verificar zots_bairros
    const { count: zotsCount } = await supabase
      .from('zots_bairros')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 ZOTs vs Bairros: ${zotsCount || 0} registros (esperado: 385)`);

    // Verificar alguns dados específicos
    console.log('\n📋 Verificando dados específicos...');

    // Teste 1: Buscar dados do Centro Histórico
    const { data: centro } = await supabase
      .from('regime_urbanistico')
      .select('bairro, zona, altura_max_m')
      .eq('bairro', 'CENTRO HISTÓRICO')
      .limit(3);

    if (centro && centro.length > 0) {
      console.log('\n✅ Dados do Centro Histórico:');
      centro.forEach(row => {
        console.log(`   ${row.bairro} - ${row.zona} - Altura: ${row.altura_max_m}m`);
      });
    }

    // Teste 2: Buscar ZOTs do bairro Petrópolis
    const { data: petropolis } = await supabase
      .from('zots_bairros')
      .select('bairro, zona')
      .eq('bairro', 'PETRÓPOLIS')
      .limit(3);

    if (petropolis && petropolis.length > 0) {
      console.log('\n✅ ZOTs em Petrópolis:');
      petropolis.forEach(row => {
        console.log(`   ${row.bairro} - ${row.zona}`);
      });
    }

    console.log('\n✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
  }
}

// Executar importação
async function main() {
  console.log('🏗️  Iniciando importação de dados de Regime Urbanístico\n');
  console.log('📍 Projeto:', SUPABASE_URL);
  console.log('🔑 Usando Service Role Key\n');

  await importRegimeUrbanistico();
  await importZotsBairros();
  await verifyImport();

  console.log('\n\n🎉 Processo concluído!');
}

main().catch(console.error);