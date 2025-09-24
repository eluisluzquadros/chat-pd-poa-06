// Script para testar o fluxo completo do RAG
// Execute com: npx tsx scripts/test-rag-flow.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRAGFlow() {
  console.log('🧪 Testando fluxo completo do RAG\n');
  
  const testQueries = [
    "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    "Qual a regra para empreendimentos do 4º distrito?",
    "Quais bairros têm risco de inundação?"
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log('─'.repeat(80));
    
    try {
      // 1. Testar agentic-rag diretamente
      console.log('\n1️⃣ Testando agentic-rag...');
      const { data: ragData, error: ragError } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message: query,
          userRole: 'citizen'
        }
      });
      
      if (ragError) {
        console.error('❌ Erro no agentic-rag:', ragError.message);
      } else {
        console.log('✅ Resposta:', ragData.response?.substring(0, 200) + '...');
        console.log('   Confiança:', ragData.confidence);
        console.log('   Fontes:', ragData.sources);
      }
      
      // 2. Testar response-synthesizer-rag diretamente
      console.log('\n2️⃣ Testando response-synthesizer-rag diretamente...');
      const { data: synthData, error: synthError } = await supabase.functions.invoke('response-synthesizer-rag', {
        body: {
          originalQuery: query,
          analysisResult: {},
          sqlResults: null,
          vectorResults: null
        }
      });
      
      if (synthError) {
        console.error('❌ Erro no response-synthesizer-rag:', synthError.message);
      } else {
        console.log('✅ Resposta:', synthData.response?.substring(0, 200) + '...');
        console.log('   Confiança:', synthData.confidence);
        console.log('   Fontes:', synthData.sources);
      }
      
      // 3. Verificar se está usando o synthesizer correto
      console.log('\n3️⃣ Verificando roteamento...');
      const needsVectorSearch = 
        query.toLowerCase().includes('certificação') ||
        query.toLowerCase().includes('4º distrito') ||
        query.toLowerCase().includes('risco');
      
      console.log(`   Precisa busca vetorial: ${needsVectorSearch ? 'SIM' : 'NÃO'}`);
      console.log(`   Synthesizer esperado: ${needsVectorSearch ? 'response-synthesizer-rag' : 'response-synthesizer'}`);
      
    } catch (error) {
      console.error('❌ Erro geral:', error);
    }
  }
  
  // 4. Verificar status das Edge Functions
  console.log('\n\n4️⃣ Status das Edge Functions:');
  console.log('─'.repeat(80));
  
  const functions = [
    'agentic-rag',
    'query-analyzer',
    'sql-generator',
    'response-synthesizer',
    'response-synthesizer-rag'
  ];
  
  for (const fn of functions) {
    try {
      const { error } = await supabase.functions.invoke(fn, {
        body: { test: true }
      });
      
      if (error) {
        console.log(`❌ ${fn}: ${error.message}`);
      } else {
        console.log(`✅ ${fn}: Disponível`);
      }
    } catch (e) {
      console.log(`❌ ${fn}: Não disponível`);
    }
  }
}

testRAGFlow().catch(console.error);