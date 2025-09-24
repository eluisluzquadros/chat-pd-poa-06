import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testSqlGenerator() {
  console.log('🧪 TESTANDO SQL GENERATOR DIRETAMENTE\n');
  console.log('=' .repeat(70));
  
  const testQueries = [
    "Qual é a altura máxima permitida no bairro Três Figueiras?",
    "Qual é a altura máxima mais alta no novo Plano Diretor?",
    "Principais índices do bairro Centro Histórico?"
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log('-'.repeat(50));
    
    try {
      // 1. Chamar SQL Generator
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sql-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ 
          question: query,
          hints: {
            useRegimeTable: true,
            needsMax: query.includes('mais alta'),
            needsMin: query.includes('mais baixa')
          }
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.sql) {
        console.log('\n📋 SQL Gerado:');
        console.log(result.sql);
        
        // 2. Executar SQL diretamente
        console.log('\n🔍 Executando SQL...');
        try {
          const { data, error } = await supabase.rpc('execute_sql', { 
            query_text: result.sql 
          }).single();
          
          if (error) {
            // Tentar executar com query direta
            const queryResult = await supabase.from('regime_urbanistico').select('*').limit(1);
            console.log('Erro ao executar SQL via RPC, tentando query de teste:', queryResult);
            
            // Executar manualmente algumas queries
            if (query.includes('Três Figueiras')) {
              const { data: tfData } = await supabase
                .from('regime_urbanistico')
                .select('*')
                .ilike('bairro', '%TRÊS FIGUEIRAS%');
              console.log('\n📊 Dados reais de Três Figueiras:');
              console.log(JSON.stringify(tfData, null, 2));
            }
          } else {
            console.log('\n📊 Resultado do SQL:');
            console.log(JSON.stringify(data, null, 2));
          }
        } catch (execError) {
          console.log('Erro ao executar SQL:', execError.message);
        }
        
        console.log('\n🔍 Verificando se o SQL está correto:');
        if (result.sql.includes('regime_urbanistico')) {
          console.log('✅ Usando tabela regime_urbanistico');
        } else {
          console.log('❌ NÃO está usando regime_urbanistico!');
        }
        
      } else {
        console.log('❌ Erro:', result.error || 'SQL não gerado');
      }
    } catch (error) {
      console.log('❌ Erro de rede:', error.message);
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Teste completo!');
}

testSqlGenerator().catch(console.error);