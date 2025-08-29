#!/usr/bin/env node

/**
 * Script para criar tabelas via API do Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carrega variáveis do .env.local
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada!');
  process.exit(1);
}

async function createTables() {
  console.log('🚀 Criando tabelas de regime urbanístico...\n');

  // Usar fetch direto para a API REST do Supabase
  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // Primeiro, vamos verificar se as tabelas já existem
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/regime_urbanistico?select=id&limit=1`,
      { headers }
    );

    if (checkResponse.status === 404 || checkResponse.status === 400) {
      console.log('📋 Tabela regime_urbanistico não existe. Instruções para criar:\n');
      
      console.log('1. Acesse o SQL Editor do Supabase:');
      console.log('   https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql\n');
      
      console.log('2. Execute o seguinte SQL:\n');
      
      const sqlCommands = `
-- Criar tabela regime_urbanistico
CREATE TABLE IF NOT EXISTS regime_urbanistico (
    id SERIAL PRIMARY KEY,
    bairro VARCHAR(255) NOT NULL,
    zona VARCHAR(50) NOT NULL,
    altura_max_m DECIMAL(10,2),
    ca_max DECIMAL(5,2),
    to_base DECIMAL(5,2),
    to_max DECIMAL(5,2),
    taxa_permeabilidade DECIMAL(5,2),
    recuo_jardim_m DECIMAL(10,2),
    recuo_lateral_m DECIMAL(10,2),
    recuo_fundos_m DECIMAL(10,2),
    area_total_ha DECIMAL(10,2),
    populacao INTEGER,
    densidade_hab_ha DECIMAL(10,2),
    domicilios INTEGER,
    quarteirao_padrao_m INTEGER,
    divisao_lote BOOLEAN,
    remembramento BOOLEAN,
    quota_ideal_m2 INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela zots_bairros
CREATE TABLE IF NOT EXISTS zots_bairros (
    id SERIAL PRIMARY KEY,
    bairro VARCHAR(255) NOT NULL,
    zona VARCHAR(50) NOT NULL,
    caracteristicas JSONB DEFAULT '{}',
    restricoes JSONB DEFAULT '{}',
    incentivos JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_regime_bairro ON regime_urbanistico(bairro);
CREATE INDEX IF NOT EXISTS idx_regime_zona ON regime_urbanistico(zona);
CREATE INDEX IF NOT EXISTS idx_regime_altura ON regime_urbanistico(altura_max_m);
CREATE INDEX IF NOT EXISTS idx_zots_bairro ON zots_bairros(bairro);
CREATE INDEX IF NOT EXISTS idx_zots_zona ON zots_bairros(zona);

-- Habilitar RLS
ALTER TABLE regime_urbanistico ENABLE ROW LEVEL SECURITY;
ALTER TABLE zots_bairros ENABLE ROW LEVEL SECURITY;

-- Criar políticas de leitura pública
CREATE POLICY "Enable read for all users" ON regime_urbanistico FOR SELECT USING (true);
CREATE POLICY "Enable read for all users" ON zots_bairros FOR SELECT USING (true);
`;

      console.log(sqlCommands);
      
      console.log('\n3. Após criar as tabelas, execute:');
      console.log('   node scripts/convert-and-import-regime.mjs\n');
      
    } else if (checkResponse.ok) {
      console.log('✅ Tabela regime_urbanistico já existe!');
      
      // Verificar zots_bairros
      const checkZots = await fetch(
        `${SUPABASE_URL}/rest/v1/zots_bairros?select=id&limit=1`,
        { headers }
      );
      
      if (checkZots.ok) {
        console.log('✅ Tabela zots_bairros já existe!');
        console.log('\n🎯 Pronto para importar dados!');
        console.log('   Execute: node scripts/convert-and-import-regime.mjs');
      } else {
        console.log('❌ Tabela zots_bairros não existe. Execute o SQL acima.');
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

createTables().catch(console.error);