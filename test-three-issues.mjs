import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

async function testThreeIssues() {
  console.log('=== Testando as 3 questões problemáticas ===\n');

  const tests = [
    {
      name: '1. Liste todos os bairros de Porto Alegre',
      query: 'liste todos os bairros de porto alegre',
      expectedCheck: (response) => {
        // Count table rows (lines that start with |)
        const tableRows = (response.match(/^\|[^|]+\|/gm) || []).length;
        // Subtract header rows
        const bairroCount = Math.max(0, tableRows - 2);
        const has94 = response.includes('94');
        const hasFullList = bairroCount >= 90; // Allow some margin
        return {
          pass: hasFullList,
          message: `Esperado: 94 bairros listados. Encontrado: ${bairroCount} bairros em tabela. Mencionou 94? ${has94}`
        };
      }
    },
    {
      name: '2. O que pode ser construído no bairro Três Figueiras?',
      query: 'O que pode ser construído no bairro Três Figueiras?',
      expectedCheck: (response) => {
        const hasTable = response.includes('|');
        const hasAltura = response.includes('Altura');
        const hasCoef = response.includes('Coef');
        const hasZOT = response.includes('ZOT');
        const hasNotFound = response.includes('não consegui localizar');
        
        return {
          pass: hasTable && hasAltura && hasCoef && hasZOT && !hasNotFound,
          message: `Tabela: ${hasTable}, Altura: ${hasAltura}, Coef: ${hasCoef}, ZOT: ${hasZOT}, Erro: ${hasNotFound}`
        };
      }
    },
    {
      name: '3. ZOT 8 pertence a que bairro?',
      query: 'zot 8 pertence a que bairro?',
      expectedCheck: (response) => {
        // Count table rows (lines that start with |)
        const tableRows = (response.match(/^\|[^|]+\|/gm) || []).length;
        // Subtract header rows
        const bairroCount = Math.max(0, tableRows - 2);
        const mentions38 = response.includes('38');
        const hasOnly3 = response.includes('três bairros') || response.includes('3 bairros');
        
        return {
          pass: bairroCount >= 30 && !hasOnly3,
          message: `Bairros listados: ${bairroCount}, Mencionou 38? ${mentions38}, Disse apenas 3? ${hasOnly3}`
        };
      }
    }
  ];

  for (const test of tests) {
    console.log(`\n${test.name}`);
    console.log('Query:', test.query);
    
    try {
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message: test.query,
          userRole: 'user',
          sessionId: 'test-' + Date.now(),
          bypassCache: true
        }
      });

      if (error) {
        console.log('❌ Erro:', error.message);
        continue;
      }

      const response = data?.response || '';
      const check = test.expectedCheck(response);
      
      console.log(check.pass ? '✅ PASSOU' : '❌ FALHOU');
      console.log('Detalhes:', check.message);
      
      // Show preview of response
      console.log('\nResposta (primeiras 300 chars):');
      console.log(response.substring(0, 300) + '...');
      
      if (!check.pass) {
        console.log('\nResposta completa para debug:');
        console.log(response);
      }
    } catch (err) {
      console.log('❌ Exceção:', err.message);
    }
  }
  
  console.log('\n=== Teste concluído ===');
}

testThreeIssues().catch(console.error);