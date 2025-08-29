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

console.log('🚀 Importação REAL de Dados - Versão Corrigida\n');

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
      altura_maxima: cleanNumericValue(row['Altura Máxima - Edificação Isolada']),
      coef_aproveitamento_basico: cleanNumericValue(row['Coeficiente de Aproveitamento - Básico']),
      coef_aproveitamento_maximo: cleanNumericValue(row['Coeficiente de Aproveitamento - Máximo']),
      area_minima_lote: cleanNumericValue(row['Área Mínima do Lote']),
      testada_minima_lote: cleanNumericValue(row['Testada Mínima do Lote']),
      
      // Campos texto
      modulo_fracionamento: row['Módulo de Fracionamento'] || null,
      face_maxima_quarteirao: row['Face Máxima do Quarteirão'] || null,
      area_maxima_quarteirao: row['Área Máxima do Quarteirão'] || null,
      area_minima_quarteirao: row['Área Mínima do Quarteirão'] || null,
      
      // Fracionamento
      enquadramento_fracionamento: row['Enquadramento (Fracionamento)'] || null,
      area_publica_viaria_fracionamento: row['Área de Destinação Pública – Malha Viária (Fracionamento)'] || null,
      area_publica_equip_fracionamento: row['Área de Destinação Pública – Equipamentos (Fracionamento)'] || null,
      
      // Desmembramento Tipo 1
      enquadramento_desmembramento_t1: row['Enquadramento (Desmembramento Tipo 1)'] || null,
      area_publica_viaria_desmembramento_t1: row['Área Pública – Malha Viária (Desmembramento Tipo 1)'] || null,
      area_publica_equip_desmembramento_t1: row['Área Pública – Equipamentos (Desmembramento Tipo 1)'] || null,
      
      // Desmembramento Tipo 2
      enquadramento_desmembramento_t2: row['Enquadramento (Desmembramento Tipo 2)'] || null,
      area_publica_viaria_desmembramento_t2: row['Área Pública – Malha Viária (Desmembramento Tipo 2)'] || null,
      area_publica_equip_desmembramento_t2: row['Área Pública – Equipamentos (Desmembramento Tipo 2)'] || null,
      
      // Desmembramento Tipo 3
      enquadramento_desmembramento_t3: row['Enquadramento (Desmembramento Tipo 3)'] || null,
      area_publica_viaria_desmembramento_t3: row['Área Pública – Malha Viária (Desmembramento Tipo 3)'] || null,
      area_publica_equip_desmembramento_t3: row['Área Pública – Equipamentos (Desmembramento Tipo 3)'] || null,
      
      // Loteamento
      enquadramento_loteamento: row['Enquadramento (Loteamento)'] || null,
      area_publica_viaria_loteamento: row['Área Pública – Malha Viária (Loteamento)'] || null,
      area_publica_equip_loteamento: row['Área Pública – Equipamentos (Loteamento)'] || null,
      
      // Coeficientes +4D
      coef_basico_4d: row['Coeficiente de Aproveitamento Básico +4D'] || null,
      coef_maximo_4d: row['Coeficiente de Aproveitamento Máximo +4D'] || null,
      
      // Afastamentos
      afastamento_frente: row['Afastamentos - Frente'] || null,
      afastamento_lateral: row['Afastamentos - Laterais'] || null,
      afastamento_fundos: row['Afastamentos - Fundos'] || null,
      
      // Taxa de Permeabilidade
      taxa_permeabilidade_acima_1500: row['Taxa de Permeabilidade (acima de 1.500 m²)'] || null,
      taxa_permeabilidade_ate_1500: row['Taxa de Permeabilidade (até 1.500 m²)'] || null,
      fator_conversao_permeabilidade: row['Fator de Conversão da Taxa de Permeabilidade'] || null,
      
      // Recuo
      recuo_jardim: row['Recuo de Jardim'] || null,
      
      // Comércio
      comercio_varejista_inocuo: row['Comércio Varejista Inócuo – Restrição / Porte'] || null,
      comercio_varejista_ia1: row['Comércio Varejista IA1 – Restrição / Porte'] || null,
      comercio_varejista_ia2: row['Comércio Varejista IA2 – Restrição / Porte'] || null,
      comercio_atacadista_ia1: row['Comércio Atacadista IA1 – Restrição / Porte'] || null,
      comercio_atacadista_ia2: row['Comércio Atacadista IA2 – Restrição / Porte'] || null,
      comercio_atacadista_ia3: row['Comércio Atacadista IA3 – Restrição / Porte'] || null,
      
      // Serviços
      servico_inocuo: row['Serviço Inócuo – Restrição / Porte'] || null,
      servico_ia1: row['Serviço IA1 – Restrição / Porte'] || null,
      servico_ia2: row['Serviço IA2 – Restrição / Porte'] || null,
      servico_ia3: row['Serviço IA3 – Restrição / Porte'] || null,
      
      // Indústria
      industria_inocua: row['Indústria Inócua – Restrição / Porte'] || null,
      industria_interferencia_ambiental: row['Indústria com Interferência Ambiental – Restrição / Porte'] || null,
      
      // Entretenimento
      nivel_controle_entretenimento: row['Nível de Controle de Polarização de Entretenimento Noturno'] || null
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
  
  console.log(`\n✅ Total de registros de regime importados: ${successCount}/${data.length}`);
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
      tem_zona_especial: row['Tem_Zona_Especial'] || 'Não' // Já vem como 'Sim' ou 'Não' do Excel
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
  
  console.log(`\n✅ Total de registros de ZOTs importados: ${successCount}/${data.length}`);
}

async function testQueries() {
  console.log('\n🧪 Testando queries...');
  
  // Teste 1: Centro Histórico
  const { data: teste1, error: error1 } = await supabase
    .from('regime_urbanistico')
    .select('bairro, zona, altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo')
    .eq('bairro', 'CENTRO HISTÓRICO')
    .limit(5);
  
  console.log('\n📍 CENTRO HISTÓRICO:');
  if (error1) {
    console.error('Erro:', error1);
  } else if (teste1 && teste1.length > 0) {
    teste1.forEach(row => {
      console.log(`  Zona ${row.zona}: Altura ${row.altura_maxima}m, Coef. Básico ${row.coef_aproveitamento_basico}, Coef. Máximo ${row.coef_aproveitamento_maximo}`);
    });
  } else {
    console.log('  Nenhum registro encontrado');
  }
  
  // Teste 2: Zonas com altura >= 60m
  const { data: teste2, error: error2 } = await supabase
    .from('regime_urbanistico')
    .select('bairro, zona, altura_maxima')
    .gte('altura_maxima', 60)
    .order('altura_maxima', { ascending: false })
    .limit(10);
  
  console.log('\n🏢 ZONAS COM ALTURA >= 60m:');
  if (error2) {
    console.error('Erro:', error2);
  } else if (teste2 && teste2.length > 0) {
    teste2.forEach(row => {
      console.log(`  ${row.bairro} - ${row.zona}: ${row.altura_maxima}m`);
    });
  } else {
    console.log('  Nenhum registro encontrado');
  }
  
  // Teste 3: Bairros com zonas especiais
  const { data: teste3, error: error3 } = await supabase
    .from('zots_bairros')
    .select('bairro, zona')
    .eq('tem_zona_especial', 'Sim')
    .limit(10);
  
  console.log('\n🏛️ BAIRROS COM ZONAS ESPECIAIS:');
  if (error3) {
    console.error('Erro:', error3);
  } else if (teste3 && teste3.length > 0) {
    teste3.forEach(row => {
      console.log(`  ${row.bairro} - ${row.zona}`);
    });
  } else {
    console.log('  Nenhum registro encontrado');
  }
  
  // Teste 4: Contar bairros únicos
  const { data: bairros } = await supabase
    .from('regime_urbanistico')
    .select('bairro')
    .order('bairro');
  
  const bairrosUnicos = [...new Set(bairros?.map(b => b.bairro) || [])];
  console.log(`\n📊 Total de bairros únicos: ${bairrosUnicos.length}`);
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
  
  console.log(`\n📊 RESUMO FINAL:`);
  console.log(`✅ Regime Urbanístico: ${regimeCount} registros`);
  console.log(`✅ ZOTs vs Bairros: ${zotsCount} registros`);
  console.log(`✅ Total Geral: ${(regimeCount || 0) + (zotsCount || 0)} registros`);
  
  // Testar queries
  await testQueries();
  
  console.log('\n🎉 Importação concluída com sucesso!');
  console.log('\n💡 Os dados agora estão prontos para serem consultados pelo sistema de chat!');
}

main().catch(console.error);