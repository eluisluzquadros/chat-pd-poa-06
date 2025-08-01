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

async function aplicarMigration() {
    console.log('🚀 Aplicando migration para criar tabelas...');
    
    try {
        // Ler o SQL da migration
        const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250131_create_regime_urbanistico_tables.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');
        
        // Dividir em comandos individuais (separados por ponto-e-vírgula no final de linha)
        const commands = migrationSQL
            .split('\n')
            .reduce((acc, line) => {
                if (!acc.length) acc.push('');
                
                acc[acc.length - 1] += line + '\n';
                
                if (line.trim().endsWith(';') && !line.trim().startsWith('--')) {
                    acc.push('');
                }
                
                return acc;
            }, [])
            .filter(cmd => cmd.trim() && !cmd.trim().startsWith('--'))
            .map(cmd => cmd.trim());
        
        console.log(`📊 Executando ${commands.length} comandos SQL...`);
        
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            if (command) {
                try {
                    console.log(`⏳ Executando comando ${i + 1}/${commands.length}...`);
                    
                    // Usar query raw para executar SQL
                    const { error } = await supabase
                        .rpc('query', { query_text: command });
                        
                    if (error) {
                        console.error(`❌ Erro no comando ${i + 1}:`, error);
                        // Continuar mesmo com erro (pode ser devido a IF NOT EXISTS)
                    } else {
                        console.log(`✅ Comando ${i + 1} executado com sucesso`);
                    }
                    
                } catch (cmdError) {
                    console.error(`❌ Erro no comando ${i + 1}:`, cmdError);
                }
            }
        }
        
        console.log('✅ Migration aplicada!');
        
        // Verificar se as tabelas foram criadas
        await verificarTabelas();
        
    } catch (error) {
        console.error('💥 Erro ao aplicar migration:', error);
        
        // Tentar método alternativo - executar comandos básicos
        console.log('\n🔄 Tentando método alternativo...');
        await criarTabelasAlternativo();
    }
}

async function criarTabelasAlternativo() {
    console.log('🏗️ Criando tabelas com método alternativo...');
    
    try {
        // Primeiro, tentar criar a tabela regime_urbanistico
        console.log('📊 Criando tabela regime_urbanistico...');
        
        const { error: regimeError } = await supabase
            .from('regime_urbanistico')
            .select('count')
            .limit(0);
            
        if (regimeError && regimeError.message.includes('does not exist')) {
            // A tabela não existe, precisamos usar outro método
            console.log('❌ Não é possível criar tabelas via API do Supabase');
            console.log('💡 Solução: Execute o SQL manualmente no Dashboard do Supabase');
            console.log('🔗 https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql');
            
            console.log('\n📋 SQL para executar:');
            const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250131_create_regime_urbanistico_tables.sql');
            const migrationSQL = readFileSync(migrationPath, 'utf-8');
            console.log('─'.repeat(60));
            console.log(migrationSQL);
            console.log('─'.repeat(60));
            
            return false;
        }
        
        console.log('✅ Tabelas já existem ou foram criadas');
        return true;
        
    } catch (error) {
        console.error('❌ Erro no método alternativo:', error);
        return false;
    }
}

async function verificarTabelas() {
    console.log('\n🔍 Verificando tabelas criadas...');
    
    try {
        // Verificar regime_urbanistico
        const { error: regimeError } = await supabase
            .from('regime_urbanistico')
            .select('count')
            .limit(1);
            
        if (regimeError) {
            console.log('❌ Tabela regime_urbanistico:', regimeError.message);
        } else {
            console.log('✅ Tabela regime_urbanistico criada');
        }
        
        // Verificar zots_bairros
        const { error: zotsError } = await supabase
            .from('zots_bairros')
            .select('count')
            .limit(1);
            
        if (zotsError) {
            console.log('❌ Tabela zots_bairros:', zotsError.message);
        } else {
            console.log('✅ Tabela zots_bairros criada');
        }
        
    } catch (error) {
        console.error('❌ Erro na verificação:', error);
    }
}

aplicarMigration();