#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔧 Criando response-synthesizer simplificado...\n');

// Criar uma versão simplificada que não depende da OpenAI
const simpleResponseSynthesizerCode = `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { originalQuery, analysisResult, sqlResults, vectorResults } = await req.json();
    
    console.log('Synthesizing response for:', originalQuery);
    
    // Resposta simples baseada no tipo de query
    let response = '';
    let confidence = 0.5;
    
    if (originalQuery.toLowerCase().includes('oi') || originalQuery.toLowerCase().includes('olá')) {
      response = 'Olá! Sou o assistente do Plano Diretor de Porto Alegre. Como posso ajudá-lo hoje?';
      confidence = 1.0;
    } else if (sqlResults?.executionResults?.length > 0) {
      // Se temos resultados SQL, formatar uma resposta
      const results = sqlResults.executionResults[0];
      if (results.data && results.data.length > 0) {
        response = \`Encontrei \${results.data.length} resultados para sua consulta. \\n\\n\`;
        response += 'Aqui estão alguns exemplos:\\n';
        results.data.slice(0, 3).forEach(row => {
          response += \`- \${row.bairro || 'N/A'} - \${row.zona || 'N/A'}\\n\`;
        });
        confidence = 0.8;
      } else {
        response = 'Não encontrei informações específicas para sua consulta.';
        confidence = 0.3;
      }
    } else {
      // Resposta padrão
      response = \`Desculpe, ainda estou aprendendo a responder sobre "\${originalQuery}". 
      
Por favor, tente perguntar sobre:
- Zonas e bairros específicos de Porto Alegre
- Regras de construção (altura máxima, coeficientes)
- Informações do Plano Diretor\`;
      confidence = 0.2;
    }
    
    return new Response(JSON.stringify({
      response,
      confidence,
      sources: {
        tabular: sqlResults?.executionResults?.length || 0,
        conceptual: 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in response-synthesizer:', error);
    return new Response(JSON.stringify({
      response: 'Desculpe, ocorreu um erro ao processar sua solicitação.',
      confidence: 0,
      sources: { tabular: 0, conceptual: 0 },
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
`;

// Backup do arquivo original
const originalFile = './supabase/functions/response-synthesizer/index.ts';
const backupFile = './supabase/functions/response-synthesizer/index.ts.backup';

console.log('1. Fazendo backup do arquivo original...');
fs.copyFileSync(originalFile, backupFile);
console.log('✅ Backup criado em:', backupFile);

console.log('\n2. Substituindo por versão simplificada...');
fs.writeFileSync(originalFile, simpleResponseSynthesizerCode);
console.log('✅ Arquivo substituído');

console.log('\n3. Fazendo deploy...');
try {
  execSync('npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs', { stdio: 'inherit' });
  console.log('✅ Deploy concluído');
} catch (error) {
  console.error('❌ Erro no deploy:', error.message);
}

console.log('\n\n📌 Para restaurar a versão original:');
console.log('   cp ./supabase/functions/response-synthesizer/index.ts.backup ./supabase/functions/response-synthesizer/index.ts');
console.log('   npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs');