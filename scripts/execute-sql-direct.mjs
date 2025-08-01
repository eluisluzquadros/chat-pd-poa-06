#!/usr/bin/env node

/**
 * Script para executar SQL diretamente no Supabase via API REST
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Carrega variáveis do .env.local
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada!');
  process.exit(1);
}

async function executeSQLViaREST(sql) {
  try {
    // Usar a API REST do Supabase para executar SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query: sql
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SQL Error: ${error}`);
    }

    return await response.json();
  } catch (error) {
    // Se RPC não funcionar, tentar via pg REST
    console.log('⚠️  RPC não disponível, tentando método alternativo...');
    return null;
  }
}

async function createTablesAndImport() {
  console.log('🚀 Criando tabelas de regime urbanístico...\n');

  // SQL para criar as tabelas
  const createTableSQL = `
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
`;

  console.log('📝 Tentando criar tabelas...');
  
  // Como não podemos executar SQL diretamente, vamos usar uma abordagem diferente
  console.log('\n⚠️  Não é possível executar SQL diretamente via API REST.');
  console.log('\n📋 Instruções para criar as tabelas:\n');
  console.log('1. Use o Supabase CLI localmente:');
  console.log('   npx supabase db execute --file CREATE_REGIME_TABLES.sql\n');
  console.log('2. Ou acesse o SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql\n');
  console.log('3. Cole e execute o SQL do arquivo CREATE_REGIME_TABLES.sql\n');
  console.log('4. Após criar as tabelas, execute:');
  console.log('   node scripts/convert-and-import-regime.mjs\n');

  // Salvar um script alternativo usando psql
  const psqlScript = `#!/bin/bash
# Script para executar SQL usando psql

DATABASE_URL="postgresql://postgres.ngrqwmvuhvjkeohesbxs:${SERVICE_KEY}@aws-0-us-west-1.pooler.supabase.com:5432/postgres"

echo "🚀 Executando SQL no Supabase..."

psql "$DATABASE_URL" -f CREATE_REGIME_TABLES.sql

if [ $? -eq 0 ]; then
    echo "✅ Tabelas criadas com sucesso!"
    echo "🎯 Agora execute: node scripts/convert-and-import-regime.mjs"
else
    echo "❌ Erro ao criar tabelas"
fi
`;

  // Salvar script psql
  const fs = await import('fs/promises');
  await fs.writeFile('execute-sql-psql.sh', psqlScript);
  console.log('💾 Script alternativo salvo: execute-sql-psql.sh');
  console.log('   Para usar: chmod +x execute-sql-psql.sh && ./execute-sql-psql.sh');
}

// Executar
createTablesAndImport().catch(console.error);