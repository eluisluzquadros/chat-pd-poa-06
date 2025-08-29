// Teste do fix Porto Alegre
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

async function testFix() {
  console.log('🧪 TESTE DO FIX PORTO ALEGRE\n');
  
  const testQueries = [
    'Altura máxima da construção dos prédios em porto alegre',
    'coeficiente de aproveitamento em porto alegre',
    'o que posso construir em porto alegre?',
    'qual a altura máxima permitida?'
  ];
  
  console.log('⚠️  NOTA: O fix foi aplicado localmente mas precisa ser deployado.');
  console.log('Para funcionar em produção, é necessário fazer o deploy da função.\n');
  
  // Criar arquivo de instruções para deploy manual
  const deployInstructions = `# INSTRUÇÕES PARA DEPLOY MANUAL

## 1. Via Dashboard Supabase
1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions
2. Encontre a função "query-analyzer"
3. Clique em "Edit"
4. Cole o código atualizado de: supabase/functions/query-analyzer/index.ts
5. Clique em "Save and Deploy"

## 2. Correções Aplicadas
- Adicionada regra para NÃO tratar "Porto Alegre" como bairro
- Pós-processamento remove "PORTO ALEGRE" da lista de bairros
- Queries genéricas sobre a cidade agora retornam intent: "conceptual"

## 3. Resultado Esperado
- "altura máxima em porto alegre" → Consulta conceitual sobre a cidade
- "coeficiente de aproveitamento de porto alegre" → Consulta conceitual
- NÃO deve mais retornar dados específicos de Petrópolis
`;
  
  console.log(deployInstructions);
  
  // Salvar instruções em arquivo
  const fs = await import('fs/promises');
  await fs.writeFile('DEPLOY_INSTRUCTIONS_PORTO_ALEGRE.md', deployInstructions);
  console.log('\n✅ Instruções salvas em: DEPLOY_INSTRUCTIONS_PORTO_ALEGRE.md');
}

testFix().catch(console.error);