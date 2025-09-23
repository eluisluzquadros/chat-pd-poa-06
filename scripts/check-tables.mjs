#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function verificarTabelas() {
    console.log('🔍 Verificando tabelas existentes...');
    
    try {
        // Tentar consultar regime_urbanistico
        const { data: regimeData, error: regimeError } = await supabase
            .from('regime_urbanistico')
            .select('count')
            .limit(1);
            
        if (regimeError) {
            console.log('❌ Tabela regime_urbanistico não existe:', regimeError.message);
        } else {
            console.log('✅ Tabela regime_urbanistico existe');
        }
        
        // Tentar consultar zots_bairros
        const { data: zotsData, error: zotsError } = await supabase
            .from('zots_bairros')
            .select('count')
            .limit(1);
            
        if (zotsError) {
            console.log('❌ Tabela zots_bairros não existe:', zotsError.message);
        } else {
            console.log('✅ Tabela zots_bairros existe');
        }
        
        // Verificar outras tabelas do sistema
        const { data: documentsData, error: documentsError } = await supabase
            .from('documents')
            .select('count')
            .limit(1);
            
        if (documentsError) {
            console.log('❌ Tabela documents não existe:', documentsError.message);
        } else {
            console.log('✅ Tabela documents existe');
        }
        
    } catch (error) {
        console.error('💥 Erro ao verificar tabelas:', error);
    }
}

verificarTabelas();