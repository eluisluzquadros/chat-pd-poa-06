#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 Importação REAL de Dados de Regime Urbanístico\n');

// Função para limpar valores numéricos do Excel
function cleanNumericValue(value) {
  if (value === null || value === undefined || value === '') return null;
  
  // Se for uma data do Excel (número serial), retornar null
  if (typeof value === 'number' && value > 40000 && value < 50000) {
    return null;
  }
  
  // Converter para string e limpar
  const str = String(value).trim();
  
  // Remover caracteres não numéricos exceto ponto e vírgula
  const cleaned = str.replace(/[^\d.,\-]/g, '');
  
  // Substituir vírgula por ponto
  const normalized = cleaned.replace(',', '.');
  
  // Converter para número
  const num = parseFloat(normalized);
  
  // Retornar null se não for um número válido
  return isNaN(num) ? null : num;
}

// Função para converter valor booleano
function cleanBooleanValue(value) {
  if (value === null || value === undefined || value === '') return false;
  const str = String(value).toLowerCase().trim();
  return str === 'sim' || str === 'yes' || str === 'true' || str === '1';
}

async function importRegimeUrbanistico() {
  const regimeFile = './knowledgebase/PDPOA2025-Regime_Urbanistico.xlsx';
  
  if (!fs.existsSync(regimeFile)) {
    console.error('❌ Arquivo não encontrado:', regimeFile);
    return;
  }
  
  console.log('📋 Lendo arquivo Excel de Regime Urbanístico...');
  const workbook = XLSX.readFile(regimeFile);
  const worksheet = workbook.Sheets['Sheet'];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 Total de registros encontrados: ${data.length}`);
  
  // Limpar tabela existente
  console.log('🧹 Limpando dados existentes...');
  const { error: deleteError } = await supabase
    .from('regime_urbanistico')
    .delete()
    .neq('id', 0); // Deletar todos
  
  if (deleteError) {
    console.error('❌ Erro ao limpar tabela:', deleteError);
  }
  
  // Processar e inserir dados em lotes
  const batchSize = 50;
  let successCount = 0;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const processedBatch = batch.map(row => ({
      bairro: row['Bairro'] || '',
      zona: row['Zona'] || '',
      altura_maxima_edificacao_isolada: cleanNumericValue(row['Altura Máxima - Edificação Isolada']),
      coeficiente_aproveitamento_basico: cleanNumericValue(row['Coeficiente de Aproveitamento - Básico']),
      coeficiente_aproveitamento_maximo: cleanNumericValue(row['Coeficiente de Aproveitamento - Máximo']),
      area_minima_lote: cleanNumericValue(row['Área Mínima do Lote']),
      testada_minima_lote: cleanNumericValue(row['Testada Mínima do Lote']),
      modulo_fracionamento: cleanNumericValue(row['Módulo de Fracionamento']),
      face_maxima_quarteirao: cleanNumericValue(row['Face Máxima do Quarteirão']),
      area_maxima_quarteirao: cleanNumericValue(row['Área Máxima do Quarteirão']),
      area_minima_quarteirao: cleanNumericValue(row['Área Mínima do Quarteirão']),
      enquadramento_fracionamento: row['Enquadramento (Fracionamento)'] || null,
      area_destinacao_publica_malha_viaria_fracionamento: row['Área de Destinação Pública – Malha Viária (Fracionamento)'] || null,
      area_destinacao_publica_equipamentos_fracionamento: row['Área de Destinação Pública – Equipamentos (Fracionamento)'] || null,
      enquadramento_desmembramento_tipo1: row['Enquadramento (Desmembramento Tipo 1)'] || null,
      area_publica_malha_viaria_desmembramento_tipo1: row['Área Pública – Malha Viária (Desmembramento Tipo 1)'] || null,
      area_publica_equipamentos_desmembramento_tipo1: row['Área Pública – Equipamentos (Desmembramento Tipo 1)'] || null,
      enquadramento_desmembramento_tipo2: row['Enquadramento (Desmembramento Tipo 2)'] || null,
      area_publica_malha_viaria_desmembramento_tipo2: row['Área Pública – Malha Viária (Desmembramento Tipo 2)'] || null,
      area_publica_equipamentos_desmembramento_tipo2: row['Área Pública – Equipamentos (Desmembramento Tipo 2)'] || null,
      enquadramento_desmembramento_tipo3: row['Enquadramento (Desmembramento Tipo 3)'] || null,
      area_publica_malha_viaria_desmembramento_tipo3: row['Área Pública – Malha Viária (Desmembramento Tipo 3)'] || null,
      area_publica_equipamentos_desmembramento_tipo3: row['Área Pública – Equipamentos (Desmembramento Tipo 3)'] || null,
      enquadramento_loteamento: row['Enquadramento (Loteamento)'] || null,
      area_publica_malha_viaria_loteamento: row['Área Pública – Malha Viária (Loteamento)'] || null,
      area_publica_equipamentos_loteamento: row['Área Pública – Equipamentos (Loteamento)'] || null,
      coeficiente_aproveitamento_basico_4d: cleanNumericValue(row['Coeficiente de Aproveitamento Básico +4D']),
      coeficiente_aproveitamento_maximo_4d: cleanNumericValue(row['Coeficiente de Aproveitamento Máximo +4D']),
      afastamentos_frente: row['Afastamentos - Frente'] || null,
      afastamentos_laterais: row['Afastamentos - Laterais'] || null,
      afastamentos_fundos: row['Afastamentos - Fundos'] || null,
      taxa_permeabilidade_acima_1500m2: row['Taxa de Permeabilidade (acima de 1.500 m²)'] || null,
      taxa_permeabilidade_ate_1500m2: row['Taxa de Permeabilidade (até 1.500 m²)'] || null,
      fator_conversao_taxa_permeabilidade: row['Fator de Conversão da Taxa de Permeabilidade'] || null,
      recuo_jardim: row['Recuo de Jardim'] || null,
      comercio_varejista_inocuo_restricao_porte: row['Comércio Varejista Inócuo – Restrição / Porte'] || null,
      comercio_varejista_ia1_restricao_porte: row['Comércio Varejista IA1 – Restrição / Porte'] || null,
      comercio_varejista_ia2_restricao_porte: row['Comércio Varejista IA2 – Restrição / Porte'] || null,
      comercio_atacadista_ia1_restricao_porte: row['Comércio Atacadista IA1 – Restrição / Porte'] || null,
      comercio_atacadista_ia2_restricao_porte: row['Comércio Atacadista IA2 – Restrição / Porte'] || null,
      comercio_atacadista_ia3_restricao_porte: row['Comércio Atacadista IA3 – Restrição / Porte'] || null,
      servico_inocuo_restricao_porte: row['Serviço Inócuo – Restrição / Porte'] || null,
      servico_ia1_restricao_porte: row['Serviço IA1 – Restrição / Porte'] || null,
      servico_ia2_restricao_porte: row['Serviço IA2 – Restrição / Porte'] || null,
      servico_ia3_restricao_porte: row['Serviço IA3 – Restrição / Porte'] || null,
      industria_inocua_restricao_porte: row['Indústria Inócua – Restrição / Porte'] || null,
      industria_interferencia_ambiental_restricao_porte: row['Indústria com Interferência Ambiental – Restrição / Porte'] || null,
      nivel_controle_polarizacao_entretenimento_noturno: row['Nível de Controle de Polarização de Entretenimento Noturno'] || null
    }));
    
    const { data: insertedData, error } = await supabase
      .from('regime_urbanistico')
      .insert(processedBatch)
      .select();
    
    if (error) {
      console.error(`❌ Erro ao inserir lote ${i/batchSize + 1}:`, error);
    } else {
      successCount += insertedData.length;
      console.log(`✅ Lote ${i/batchSize + 1}: ${insertedData.length} registros inseridos`);
    }
  }
  
  console.log(`\n✅ Total de registros importados: ${successCount}/${data.length}`);
}

async function importZotsBairros() {
  const zotsFile = './knowledgebase/PDPOA2025-ZOTs_vs_Bairros.xlsx';
  
  if (!fs.existsSync(zotsFile)) {
    console.error('❌ Arquivo não encontrado:', zotsFile);
    return;
  }
  
  console.log('\n📋 Lendo arquivo Excel de ZOTs vs Bairros...');
  const workbook = XLSX.readFile(zotsFile);
  const worksheet = workbook.Sheets['Sheet'];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 Total de registros encontrados: ${data.length}`);
  
  // Limpar tabela existente
  console.log('🧹 Limpando dados existentes...');
  const { error: deleteError } = await supabase
    .from('zots_bairros')
    .delete()
    .neq('id', 0); // Deletar todos
  
  if (deleteError) {
    console.error('❌ Erro ao limpar tabela:', deleteError);
  }
  
  // Processar e inserir dados em lotes
  const batchSize = 50;
  let successCount = 0;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const processedBatch = batch.map(row => ({
      bairro: row['Bairro'] || '',
      zona: row['Zona'] || '',
      total_zonas_no_bairro: parseInt(row['Total_Zonas_no_Bairro']) || 0,
      tem_zona_especial: cleanBooleanValue(row['Tem_Zona_Especial'])
    }));
    
    const { data: insertedData, error } = await supabase
      .from('zots_bairros')
      .insert(processedBatch)
      .select();
    
    if (error) {
      console.error(`❌ Erro ao inserir lote ${i/batchSize + 1}:`, error);
    } else {
      successCount += insertedData.length;
      console.log(`✅ Lote ${i/batchSize + 1}: ${insertedData.length} registros inseridos`);
    }
  }
  
  console.log(`\n✅ Total de registros importados: ${successCount}/${data.length}`);
}

async function main() {
  console.log('🚀 Iniciando importação de dados reais...\n');
  
  await importRegimeUrbanistico();
  await importZotsBairros();
  
  // Verificar importação
  console.log('\n📊 Verificando importação final...');
  
  const { count: regimeCount } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true });
  
  const { count: zotsCount } = await supabase
    .from('zots_bairros')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Resumo Final:`);
  console.log(`- Regime Urbanístico: ${regimeCount} registros`);
  console.log(`- ZOTs vs Bairros: ${zotsCount} registros`);
  
  // Testar algumas queries
  console.log('\n🧪 Testando queries...');
  
  const { data: teste1 } = await supabase
    .from('regime_urbanistico')
    .select('bairro, zona, altura_maxima_edificacao_isolada')
    .eq('bairro', 'CENTRO HISTÓRICO')
    .limit(5);
  
  console.log('\nCentro Histórico:', teste1);
  
  const { data: teste2 } = await supabase
    .from('regime_urbanistico')
    .select('bairro, zona, altura_maxima_edificacao_isolada')
    .gte('altura_maxima_edificacao_isolada', 60)
    .limit(5);
  
  console.log('\nZonas com altura >= 60m:', teste2);
  
  console.log('\n🎉 Importação concluída!');
}

main().catch(console.error);