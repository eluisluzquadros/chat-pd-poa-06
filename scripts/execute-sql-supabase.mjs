#!/usr/bin/env node

/**
 * Script para executar SQL no Supabase para criar as tabelas necessárias
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

async function executeSQL() {
  console.log('🚀 Criando tabelas de regime urbanístico...\n');

  try {
    // Ler arquivo SQL
    const sqlContent = await fs.readFile(
      path.join(__dirname, 'create-regime-tables.sql'), 
      'utf8'
    );

    console.log('📄 SQL a ser executado:');
    console.log(sqlContent.substring(0, 200) + '...\n');

    // Para executar SQL no Supabase, precisamos usar o dashboard ou a API REST diretamente
    // Vou criar um arquivo para ser executado manualmente
    console.log('⚠️  As tabelas precisam ser criadas manualmente no Supabase Dashboard:');
    console.log('1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql');
    console.log('2. Cole o conteúdo do arquivo: scripts/create-regime-tables.sql');
    console.log('3. Clique em "Run"\n');

    // Salvar instruções detalhadas
    const instructions = `# Instruções para criar as tabelas de Regime Urbanístico

## 1. Acesse o SQL Editor do Supabase

Link: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql

## 2. Execute o SQL

Copie e cole o conteúdo completo do arquivo:
\`scripts/create-regime-tables.sql\`

## 3. Verifique a criação

Após executar, você deve ver:
- Tabela: regime_urbanistico (21 colunas)
- Tabela: zots_bairros (8 colunas)
- 8 índices criados

## 4. Execute a importação

Após criar as tabelas, execute:
\`\`\`bash
node scripts/import-regime-supabase-cli.mjs
\`\`\`
`;

    await fs.writeFile(
      path.join(__dirname, 'INSTRUCOES_CRIAR_TABELAS.md'),
      instructions
    );

    console.log('📝 Instruções salvas em: scripts/INSTRUCOES_CRIAR_TABELAS.md');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

executeSQL().catch(console.error);