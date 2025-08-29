#!/usr/bin/env node

/**
 * Script para executar a importação no Supabase via API
 * Execute: node execute-supabase-import.cjs
 */

const fs = require('fs');
const path = require('path');

async function executeImport() {
    console.log('=== EXECUÇÃO DA IMPORTAÇÃO NO SUPABASE ===');
    
    const sqlFile = './processed-data/supabase-import.sql';
    
    if (!fs.existsSync(sqlFile)) {
        console.error('Arquivo SQL não encontrado:', sqlFile);
        return;
    }
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('\nPara executar no Supabase:');
    console.log('1. Acesse o Dashboard do Supabase');
    console.log('2. Vá para SQL Editor');
    console.log('3. Cole o conteúdo do arquivo:', sqlFile);
    console.log('4. Execute os comandos');
    console.log('\nOu use a Supabase CLI:');
    console.log('supabase db reset --db-url "sua-connection-string"');
    console.log('psql "sua-connection-string" -f', sqlFile);
    
    console.log('\n✓ Importação preparada para execução');
}

executeImport().catch(console.error);
