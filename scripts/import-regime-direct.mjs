#!/usr/bin/env node

/**
 * Script de importação direta de dados de regime urbanístico
 * 
 * Versão simplificada que executa SQL diretamente sem depender
 * de funções customizadas do Supabase.
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

// Configuração do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY não encontrada nas variáveis de ambiente');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BATCH_SIZE = 25; // Lotes menores para melhor estabilidade
const PROCESSED_DATA_DIR = path.join(__dirname, '..', 'processed-data');

async function createTablesDirectly() {
  console.log('🏗️  Criando tabelas diretamente...');
  
  // SQL para criar as tabelas (versão simplificada)
  const createRegimeTable = `
    DROP TABLE IF EXISTS regime_urbanistico CASCADE;
    
    CREATE TABLE regime_urbanistico (
      id SERIAL PRIMARY KEY,
      bairro TEXT NOT NULL,
      zona TEXT NOT NULL,
      altura_maxima_edificacao_isolada TEXT,
      coeficiente_aproveitamento_basico TEXT,
      coeficiente_aproveitamento_maximo TEXT,
      area_minima_lote TEXT,
      testada_minima_lote TEXT,
      modulo_fracionamento TEXT,
      face_maxima_quarteirao TEXT,
      area_maxima_quarteirao TEXT,
      area_minima_quarteirao TEXT,
      enquadramento_fracionamento TEXT,
      area_destinacao_publica_malha_viaria_fracionamento TEXT,
      area_destinacao_publica_equipamentos_fracionamento TEXT,
      enquadramento_desmembramento_tipo_1 TEXT,
      area_publica_malha_viaria_desmembramento_tipo_1 TEXT,
      area_publica_equipamentos_desmembramento_tipo_1 TEXT,
      enquadramento_desmembramento_tipo_2 TEXT,
      area_publica_malha_viaria_desmembramento_tipo_2 TEXT,
      area_publica_equipamentos_desmembramento_tipo_2 TEXT,
      enquadramento_desmembramento_tipo_3 TEXT,
      area_publica_malha_viaria_desmembramento_tipo_3 TEXT,
      area_publica_equipamentos_desmembramento_tipo_3 TEXT,
      enquadramento_loteamento TEXT,
      area_publica_malha_viaria_loteamento TEXT,
      area_publica_equipamentos_loteamento TEXT,
      coeficiente_aproveitamento_basico_4d TEXT,
      coeficiente_aproveitamento_maximo_4d TEXT,
      afastamentos_frente TEXT,
      afastamentos_laterais TEXT,
      afastamentos_fundos TEXT,
      taxa_permeabilidade_acima_1500m TEXT,
      taxa_permeabilidade_ate_1500m TEXT,
      fator_conversao_taxa_permeabilidade TEXT,
      recuo_jardim TEXT,
      comercio_varejista_inocuo_restricao_porte TEXT,
      comercio_varejista_ia1_restricao_porte TEXT,
      comercio_varejista_ia2_restricao_porte TEXT,
      comercio_atacadista_ia1_restricao_porte TEXT,
      comercio_atacadista_ia2_restricao_porte TEXT,
      comercio_atacadista_ia3_restricao_porte TEXT,
      servico_inocuo_restricao_porte TEXT,
      servico_ia1_restricao_porte TEXT,
      servico_ia2_restricao_porte TEXT,
      servico_ia3_restricao_porte TEXT,
      industria_inocua_restricao_porte TEXT,
      industria_interferencia_ambiental_restricao_porte TEXT,
      nivel_controle_polarizacao_entretenimento_noturno TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX idx_regime_bairro ON regime_urbanistico(bairro);
    CREATE INDEX idx_regime_zona ON regime_urbanistico(zona);
  `;

  const createZotsTable = `
    DROP TABLE IF EXISTS zots_bairros CASCADE;
    
    CREATE TABLE zots_bairros (
      id SERIAL PRIMARY KEY,
      bairro TEXT NOT NULL,
      zona TEXT NOT NULL,
      total_zonas_no_bairro INTEGER,
      tem_zona_especial BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX idx_zots_bairro ON zots_bairros(bairro);
    CREATE INDEX idx_zots_zona ON zots_bairros(zona);
    CREATE INDEX idx_zots_zona_especial ON zots_bairros(tem_zona_especial);
  `;

  try {
    // Executar criação das tabelas usando queries individuais
    console.log('📊 Criando tabela regime_urbanistico...');
    const { error: regimeError } = await supabase.rpc('exec', { 
      sql: createRegimeTable 
    });
    
    if (regimeError) {
      console.log('⚠️  Método rpc não disponível, tentando criar tabela manualmente...');
      // Se rpc não funcionar, pelo menos podemos verificar se as tabelas existem
    }

    console.log('📊 Criando tabela zots_bairros...');
    const { error: zotsError } = await supabase.rpc('exec', { 
      sql: createZotsTable 
    });
    
    if (zotsError) {
      console.log('⚠️  Método rpc não disponível, continuando com inserção direta...');
    }

    console.log('✅ Tabelas preparadas (ou já existentes)');
    return true;
  } catch (error) {
    console.log('⚠️  Erro ao criar tabelas via RPC, continuando:', error.message);
    return true; // Continuar mesmo com erro - tabelas podem já existir
  }
}

function transformRegimeUrbanisticoRecord(record) {
  const { id, ...data } = record;
  
  return {
    bairro: data.Bairro || '',
    zona: data.Zona || '',
    altura_maxima_edificacao_isolada: data['Altura Máxima - Edificação Isolada'] || null,
    coeficiente_aproveitamento_basico: data['Coeficiente de Aproveitamento - Básico'] || null,
    coeficiente_aproveitamento_maximo: data['Coeficiente de Aproveitamento - Máximo'] || null,
    area_minima_lote: data['Área Mínima do Lote'] || null,
    testada_minima_lote: data['Testada Mínima do Lote'] || null,
    modulo_fracionamento: data['Módulo de Fracionamento'] || null,
    face_maxima_quarteirao: data['Face Máxima do Quarteirão'] || null,
    area_maxima_quarteirao: data['Área Máxima do Quarteirão'] || null,
    area_minima_quarteirao: data['Área Mínima do Quarteirão'] || null,
    enquadramento_fracionamento: data['Enquadramento (Fracionamento)'] || null,
    area_destinacao_publica_malha_viaria_fracionamento: data['Área de Destinação Pública – Malha Viária (Fracionamento)'] || null,
    area_destinacao_publica_equipamentos_fracionamento: data['Área de Destinação Pública – Equipamentos (Fracionamento)'] || null,
    enquadramento_desmembramento_tipo_1: data['Enquadramento (Desmembramento Tipo 1)'] || null,
    area_publica_malha_viaria_desmembramento_tipo_1: data['Área Pública – Malha Viária (Desmembramento Tipo 1)'] || null,
    area_publica_equipamentos_desmembramento_tipo_1: data['Área Pública – Equipamentos (Desmembramento Tipo 1)'] || null,
    enquadramento_desmembramento_tipo_2: data['Enquadramento (Desmembramento Tipo 2)'] || null,
    area_publica_malha_viaria_desmembramento_tipo_2: data['Área Pública – Malha Viária (Desmembramento Tipo 2)'] || null,
    area_publica_equipamentos_desmembramento_tipo_2: data['Área Pública – Equipamentos (Desmembramento Tipo 2)'] || null,
    enquadramento_desmembramento_tipo_3: data['Enquadramento (Desmembramento Tipo 3)'] || null,
    area_publica_malha_viaria_desmembramento_tipo_3: data['Área Pública – Malha Viária (Desmembramento Tipo 3)'] || null,
    area_publica_equipamentos_desmembramento_tipo_3: data['Área Pública – Equipamentos (Desmembramento Tipo 3)'] || null,
    enquadramento_loteamento: data['Enquadramento (Loteamento)'] || null,
    area_publica_malha_viaria_loteamento: data['Área Pública – Malha Viária (Loteamento)'] || null,
    area_publica_equipamentos_loteamento: data['Área Pública – Equipamentos (Loteamento)'] || null,
    coeficiente_aproveitamento_basico_4d: data['Coeficiente de Aproveitamento Básico +4D'] || null,
    coeficiente_aproveitamento_maximo_4d: data['Coeficiente de Aproveitamento Máximo +4D'] || null,
    afastamentos_frente: data['Afastamentos - Frente'] || null,
    afastamentos_laterais: data['Afastamentos - Laterais'] || null,
    afastamentos_fundos: data['Afastamentos - Fundos'] || null,
    taxa_permeabilidade_acima_1500m: data['Taxa de Permeabilidade (acima de 1.500 m²)'] || null,
    taxa_permeabilidade_ate_1500m: data['Taxa de Permeabilidade (até 1.500 m²)'] || null,
    fator_conversao_taxa_permeabilidade: data['Fator de Conversão da Taxa de Permeabilidade'] || null,
    recuo_jardim: data['Recuo de Jardim'] || null,
    comercio_varejista_inocuo_restricao_porte: data['Comércio Varejista Inócuo – Restrição / Porte'] || null,
    comercio_varejista_ia1_restricao_porte: data['Comércio Varejista IA1 – Restrição / Porte'] || null,
    comercio_varejista_ia2_restricao_porte: data['Comércio Varejista IA2 – Restrição / Porte'] || null,
    comercio_atacadista_ia1_restricao_porte: data['Comércio Atacadista IA1 – Restrição / Porte'] || null,
    comercio_atacadista_ia2_restricao_porte: data['Comércio Atacadista IA2 – Restrição / Porte'] || null,
    comercio_atacadista_ia3_restricao_porte: data['Comércio Atacadista IA3 – Restrição / Porte'] || null,
    servico_inocuo_restricao_porte: data['Serviço Inócuo – Restrição / Porte'] || null,
    servico_ia1_restricao_porte: data['Serviço IA1 – Restrição / Porte'] || null,
    servico_ia2_restricao_porte: data['Serviço IA2 – Restrição / Porte'] || null,
    servico_ia3_restricao_porte: data['Serviço IA3 – Restrição / Porte'] || null,
    industria_inocua_restricao_porte: data['Indústria Inócua – Restrição / Porte'] || null,
    industria_interferencia_ambiental_restricao_porte: data['Indústria com Interferência Ambiental – Restrição / Porte'] || null,
    nivel_controle_polarizacao_entretenimento_noturno: data['Nível de Controle de Polarização de Entretenimento Noturno'] || null
  };
}

function transformZotsBairrosRecord(record) {
  const { id, ...data } = record;
  
  return {
    bairro: data.Bairro || '',
    zona: data.Zona || '',
    total_zonas_no_bairro: parseInt(data.Total_Zonas_no_Bairro) || 0,
    tem_zona_especial: data.Tem_Zona_Especial === true || data.Tem_Zona_Especial === 'true' || data.Tem_Zona_Especial === 1
  };
}

async function importData(tableName, jsonFile, transformFunction) {
  console.log(`\n📥 Importando dados de ${tableName}...`);
  
  try {
    const filePath = path.join(PROCESSED_DATA_DIR, jsonFile);
    const content = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(content);
    
    if (!jsonData.data || !Array.isArray(jsonData.data)) {
      throw new Error(`Formato inválido em ${jsonFile}`);
    }

    const data = jsonData.data;
    console.log(`📊 Total de registros: ${data.length}`);

    // Limpar dados existentes
    console.log(`🧹 Limpando dados existentes de ${tableName}...`);
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', 0);

    if (deleteError && !deleteError.message.includes('relation') && !deleteError.message.includes('does not exist')) {
      console.log(`⚠️  Aviso ao limpar ${tableName}:`, deleteError.message);
    }

    // Importar em lotes
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(data.length / BATCH_SIZE);

      console.log(`📦 Lote ${batchNumber}/${totalBatches} (${batch.length} registros)`);

      try {
        const transformedBatch = batch.map(transformFunction);
        
        const { data: insertData, error } = await supabase
          .from(tableName)
          .insert(transformedBatch)
          .select('id');

        if (error) {
          console.error(`❌ Erro no lote ${batchNumber}:`, error.message);
          errors += batch.length;
          
          // Tentar inserir um por vez em caso de erro do lote
          console.log(`🔄 Tentando inserção individual...`);
          for (const record of transformedBatch) {
            try {
              const { error: singleError } = await supabase
                .from(tableName)
                .insert([record]);
              
              if (singleError) {
                console.error(`❌ Erro individual:`, singleError.message);
              } else {
                imported++;
              }
            } catch (singleErr) {
              console.error(`❌ Erro individual:`, singleErr.message);
            }
          }
        } else {
          imported += batch.length;
          console.log(`✅ Lote ${batchNumber} importado: ${batch.length} registros`);
        }

        // Progress
        const progress = Math.round((i + batch.length) / data.length * 100);
        console.log(`📈 Progresso: ${progress}%`);

      } catch (batchError) {
        console.error(`❌ Erro no lote ${batchNumber}:`, batchError.message);
        errors += batch.length;
      }
    }

    console.log(`\n📊 Resumo da importação de ${tableName}:`);
    console.log(`   ✅ Importados: ${imported}`);
    console.log(`   ❌ Erros: ${errors}`);
    console.log(`   📈 Total: ${data.length}`);

    return { imported, errors, total: data.length };

  } catch (error) {
    console.error(`❌ Erro na importação de ${tableName}:`, error.message);
    return { imported: 0, errors: 0, total: 0 };
  }
}

async function validateImport() {
  console.log('\n🔍 Validando importação...');
  
  try {
    const { count: regimeCount } = await supabase
      .from('regime_urbanistico')
      .select('*', { count: 'exact', head: true });

    const { count: zotsCount } = await supabase
      .from('zots_bairros')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Regime Urbanístico: ${regimeCount || 0} registros`);
    console.log(`📊 ZOTs vs Bairros: ${zotsCount || 0} registros`);

    const regimeOk = (regimeCount || 0) === 387;
    const zotsOk = (zotsCount || 0) === 385;

    if (regimeOk && zotsOk) {
      console.log('✅ Validação bem-sucedida!');
      return true;
    } else {
      console.log('⚠️  Validação com inconsistências');
      if (!regimeOk) console.log(`   - Regime Urbanístico: esperado 387, encontrado ${regimeCount || 0}`);
      if (!zotsOk) console.log(`   - ZOTs vs Bairros: esperado 385, encontrado ${zotsCount || 0}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro na validação:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando importação direta de dados de regime urbanístico\n');

  try {
    // 1. Criar tabelas
    await createTablesDirectly();

    // 2. Importar dados de regime urbanístico
    const regimeStats = await importData(
      'regime_urbanistico',
      'regime-urbanistico-processed.json',
      transformRegimeUrbanisticoRecord
    );

    // 3. Importar dados de ZOTs vs Bairros
    const zotsStats = await importData(
      'zots_bairros',
      'zots-bairros-processed.json',
      transformZotsBairrosRecord
    );

    // 4. Validar importação
    const isValid = await validateImport();

    // 5. Resumo final
    console.log('\n🎯 RESUMO FINAL:');
    console.log('================');
    console.log(`📊 Regime Urbanístico: ${regimeStats.imported}/${regimeStats.total} (${regimeStats.errors} erros)`);
    console.log(`📊 ZOTs vs Bairros: ${zotsStats.imported}/${zotsStats.total} (${zotsStats.errors} erros)`);
    console.log(`🔍 Validação: ${isValid ? '✅ Sucesso' : '⚠️  Com problemas'}`);

    const totalImported = regimeStats.imported + zotsStats.imported;
    const totalExpected = 387 + 385;
    console.log(`\n🎉 Total importado: ${totalImported}/${totalExpected} registros`);

    if (isValid && totalImported === totalExpected) {
      console.log('\n✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!');
      process.exit(0);
    } else {
      console.log('\n⚠️  IMPORTAÇÃO CONCLUÍDA COM PROBLEMAS');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ ERRO CRÍTICO:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}