import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testMultipleBairros() {
  console.log('🧪 TESTE DE MÚLTIPLOS BAIRROS\n');
  console.log('=' .repeat(70));
  
  // Lista de bairros para testar (amostra dos 94)
  const bairros = [
    'Petrópolis',
    'Centro Histórico',
    'Moinhos de Vento',
    'Bela Vista',
    'Cidade Baixa',
    'Floresta',
    'Independência',
    'Santana',
    'Azenha',
    'Menino Deus'
  ];
  
  const resultados = {
    sucesso: 0,
    erro: 0,
    detalhes: []
  };
  
  for (const bairro of bairros) {
    console.log(`\n📍 Testando bairro: ${bairro}`);
    console.log('-'.repeat(40));
    
    const queries = [
      `Qual a altura máxima no bairro ${bairro}?`,
      `Quais são os principais índices urbanísticos do bairro ${bairro}?`
    ];
    
    for (const query of queries) {
      try {
        const startTime = Date.now();
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            query: query,
            bypassCache: true,
            model: 'openai/gpt-3.5-turbo'
          }),
        });
        
        const result = await response.json();
        const duration = Date.now() - startTime;
        
        if (response.ok && result.response) {
          // Verificar se a resposta contém dados específicos
          const respostaLower = result.response.toLowerCase();
          const temDados = 
            respostaLower.includes('metros') ||
            respostaLower.includes('altura') ||
            respostaLower.includes('coeficiente') ||
            respostaLower.includes('zot');
          
          if (temDados) {
            console.log(`   ✅ ${query.substring(0, 40)}... (${duration}ms)`);
            
            // Extrair valores da resposta
            const alturaMatch = result.response.match(/(\d+)\s*metros/i);
            const zotMatch = result.response.match(/ZOT\s+[\d.]+(?:\s*-\s*[A-Z])?/gi);
            
            if (alturaMatch) {
              console.log(`      → Altura: ${alturaMatch[0]}`);
            }
            if (zotMatch) {
              console.log(`      → Zonas: ${zotMatch.join(', ')}`);
            }
            
            resultados.sucesso++;
          } else {
            console.log(`   ⚠️ ${query.substring(0, 40)}... - Resposta genérica`);
            resultados.erro++;
          }
        } else {
          console.log(`   ❌ ${query.substring(0, 40)}... - Erro: ${result.error}`);
          resultados.erro++;
        }
      } catch (error) {
        console.log(`   ❌ Erro de rede: ${error.message}`);
        resultados.erro++;
      }
    }
  }
  
  // Resumo final
  console.log('\n' + '=' .repeat(70));
  console.log('📊 RESUMO DO TESTE:\n');
  console.log(`Total de testes: ${resultados.sucesso + resultados.erro}`);
  console.log(`✅ Sucessos: ${resultados.sucesso} (${((resultados.sucesso / (resultados.sucesso + resultados.erro)) * 100).toFixed(1)}%)`);
  console.log(`❌ Erros: ${resultados.erro} (${((resultados.erro / (resultados.sucesso + resultados.erro)) * 100).toFixed(1)}%)`);
  
  // Teste de queries especiais
  console.log('\n🎯 TESTES ESPECIAIS:\n');
  console.log('=' .repeat(70));
  
  const specialQueries = [
    {
      query: "Qual é a altura máxima mais alta permitida no novo Plano Diretor?",
      check: "deveria retornar as maiores alturas"
    },
    {
      query: "Quais bairros têm altura máxima acima de 60 metros?",
      check: "deveria listar bairros com altura > 60m"
    },
    {
      query: "Qual a média de altura máxima em Porto Alegre?",
      check: "deveria calcular média"
    }
  ];
  
  for (const test of specialQueries) {
    console.log(`\n📝 ${test.query}`);
    console.log(`   Verificação: ${test.check}`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: test.query,
          bypassCache: true,
          model: 'openai/gpt-3.5-turbo'
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.response) {
        const preview = result.response.substring(0, 200).replace(/\n/g, ' ');
        console.log(`   ✅ Resposta: ${preview}...`);
      } else {
        console.log(`   ❌ Erro: ${result.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro de rede: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Teste completo finalizado!');
}

testMultipleBairros().catch(console.error);