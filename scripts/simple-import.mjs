#!/usr/bin/env node

/**
 * Script Simples de Importação - Dados de Regime Urbanístico 
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente do .env.local
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

// Configuração do Supabase
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔗 Conectando ao Supabase...');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey ? 'Configurada' : 'Não encontrada'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

// Função para criar tabelas
async function criarTabelas() {
    console.log('🏗️ Criando tabelas...');
    
    // SQL para criar as tabelas
    const createTablesSQL = `
-- Tabela para dados de Regime Urbanístico
DROP TABLE IF EXISTS regime_urbanistico;

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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_regime_bairro ON regime_urbanistico(bairro);
CREATE INDEX idx_regime_zona ON regime_urbanistico(zona);

-- Tabela para dados de ZOTs vs Bairros
DROP TABLE IF EXISTS zots_bairros;

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
    `;
    
    try {
        // Dividir em comandos individuais
        const commands = createTablesSQL.split(';').filter(cmd => cmd.trim());
        
        for (const command of commands) {
            if (command.trim()) {
                const { error } = await supabase.rpc('exec_sql', { sql: command.trim() });
                if (error) {
                    console.error('Erro ao executar comando:', command.trim().substring(0, 50) + '...');
                    console.error(error);
                }
            }
        }
        
        console.log('✅ Tabelas criadas!');
    } catch (error) {
        console.error('❌ Erro ao criar tabelas:', error);
        throw error;
    }
}

// Função para importar regime urbanístico
async function importarRegimeUrbanistico() {
    console.log('📊 Importando Regime Urbanístico...');
    
    const dataPath = join(__dirname, '..', 'processed-data', 'regime-urbanistico-processed.json');
    const rawData = readFileSync(dataPath, 'utf-8');
    const jsonData = JSON.parse(rawData);
    
    const registros = jsonData.data.map(item => ({
        bairro: item.Bairro,
        zona: item.Zona,
        altura_maxima_edificacao_isolada: item['Altura Máxima - Edificação Isolada'] || null,
        coeficiente_aproveitamento_basico: item['Coeficiente de Aproveitamento - Básico'] || null,
        coeficiente_aproveitamento_maximo: item['Coeficiente de Aproveitamento - Máximo'] || null,
        area_minima_lote: item['Área Mínima do Lote'] || null,
        testada_minima_lote: item['Testada Mínima do Lote'] || null,
        modulo_fracionamento: item['Módulo de Fracionamento'] || null,
        face_maxima_quarteirao: item['Face Máxima do Quarteirão'] || null,
        area_maxima_quarteirao: item['Área Máxima do Quarteirão'] || null,
        area_minima_quarteirao: item['Área Mínima do Quarteirão'] || null
    }));
    
    console.log(`📈 Importando ${registros.length} registros...`);
    
    // Importar em lotes de 50
    const batchSize = 50;
    let importedCount = 0;
    
    for (let i = 0; i < registros.length; i += batchSize) {
        const batch = registros.slice(i, i + batchSize);
        
        const { error } = await supabase
            .from('regime_urbanistico')
            .insert(batch);
            
        if (error) {
            console.error(`❌ Erro no lote ${Math.floor(i/batchSize) + 1}:`, error);
            throw error;
        }
        
        importedCount += batch.length;
        console.log(`✅ Lote ${Math.floor(i/batchSize) + 1}: ${importedCount}/${registros.length}`);
        
        // Pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`✅ Regime Urbanístico: ${importedCount} registros importados`);
}

// Função para importar ZOTs vs Bairros
async function importarZotsBairros() {
    console.log('📊 Importando ZOTs vs Bairros...');
    
    const dataPath = join(__dirname, '..', 'processed-data', 'zots-bairros-processed.json');
    const rawData = readFileSync(dataPath, 'utf-8');
    const jsonData = JSON.parse(rawData);
    
    const registros = jsonData.data.map(item => ({
        bairro: item.Bairro,
        zona: item.Zona,
        total_zonas_no_bairro: parseInt(item.Total_Zonas_no_Bairro) || 0,
        tem_zona_especial: item.Tem_Zona_Especial === 'Sim' || item.Tem_Zona_Especial === true
    }));
    
    console.log(`📈 Importando ${registros.length} registros...`);
    
    // Importar em lotes de 50
    const batchSize = 50;
    let importedCount = 0;
    
    for (let i = 0; i < registros.length; i += batchSize) {
        const batch = registros.slice(i, i + batchSize);
        
        const { error } = await supabase
            .from('zots_bairros')
            .insert(batch);
            
        if (error) {
            console.error(`❌ Erro no lote ${Math.floor(i/batchSize) + 1}:`, error);
            throw error;
        }
        
        importedCount += batch.length;
        console.log(`✅ Lote ${Math.floor(i/batchSize) + 1}: ${importedCount}/${registros.length}`);
        
        // Pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`✅ ZOTs vs Bairros: ${importedCount} registros importados`);
}

// Função para verificar dados
async function verificarDados() {
    console.log('🔍 Verificando dados importados...');
    
    try {
        const { count: regimeCount } = await supabase
            .from('regime_urbanistico')
            .select('*', { count: 'exact', head: true });
            
        const { count: zotsCount } = await supabase
            .from('zots_bairros')
            .select('*', { count: 'exact', head: true });
            
        console.log(`✅ Regime Urbanístico: ${regimeCount} registros`);
        console.log(`✅ ZOTs vs Bairros: ${zotsCount} registros`);
        console.log(`✅ Total: ${(regimeCount || 0) + (zotsCount || 0)} registros`);
        
        // Amostra de dados
        const { data: amostra } = await supabase
            .from('regime_urbanistico')
            .select('bairro, zona')
            .limit(5);
            
        if (amostra && amostra.length > 0) {
            console.log('\n📋 Amostra de dados:');
            amostra.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.bairro} - ${item.zona}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro na verificação:', error);
    }
}

// Função principal
async function main() {
    console.log('🚀 Iniciando importação simples dos dados');
    console.log('=' .repeat(60));
    
    try {
        await criarTabelas();
        await importarRegimeUrbanistico();
        await importarZotsBairros();
        await verificarDados();
        
        console.log('\n🎉 Importação concluída com sucesso!');
        
    } catch (error) {
        console.error('\n💥 Erro na importação:', error);
        process.exit(1);
    }
}

// Executar
main();