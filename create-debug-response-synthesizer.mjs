#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔧 Criando response-synthesizer com debug detalhado...\n');

const debugResponseSynthesizerCode = `
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const debugLog = [];
  
  try {
    debugLog.push({ step: 'start', time: new Date().toISOString() });
    
    const { originalQuery, analysisResult, sqlResults, vectorResults } = await req.json();
    
    debugLog.push({ 
      step: 'parsed_request',
      originalQuery,
      hasSqlResults: !!sqlResults,
      sqlResultsCount: sqlResults?.executionResults?.length || 0
    });
    
    // Verificar dados SQL
    if (sqlResults?.executionResults?.length > 0) {
      const firstResult = sqlResults.executionResults[0];
      debugLog.push({
        step: 'sql_data_check',
        dataCount: firstResult.data?.length || 0,
        sampleData: firstResult.data?.[0]
      });
    }
    
    // Verificar API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    debugLog.push({
      step: 'api_key_check',
      hasKey: !!openAIApiKey,
      keyLength: openAIApiKey?.length || 0
    });
    
    // Preparar prompt simples
    let prompt = 'Responda a pergunta do usuário sobre o Plano Diretor de Porto Alegre.\\n\\n';
    prompt += \`Pergunta: \${originalQuery}\\n\\n\`;
    
    if (sqlResults?.executionResults?.length > 0) {
      prompt += 'Dados encontrados:\\n';
      sqlResults.executionResults.forEach((result, i) => {
        if (result.data && result.data.length > 0) {
          prompt += \`\\nConjunto \${i+1} (\${result.data.length} registros):\\n\`;
          result.data.slice(0, 5).forEach(row => {
            prompt += \`- \${JSON.stringify(row)}\\n\`;
          });
        }
      });
    }
    
    debugLog.push({
      step: 'prompt_prepared',
      promptLength: prompt.length
    });
    
    // Chamar OpenAI
    debugLog.push({ step: 'calling_openai' });
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${openAIApiKey}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Você é um assistente do Plano Diretor de Porto Alegre.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        }),
      });
      
      debugLog.push({
        step: 'openai_response',
        status: response.status,
        ok: response.ok
      });
      
      if (!response.ok) {
        const error = await response.text();
        debugLog.push({
          step: 'openai_error',
          error: error.substring(0, 500)
        });
        throw new Error(\`OpenAI error: \${response.status}\`);
      }
      
      const data = await response.json();
      const synthesizedResponse = data.choices[0].message.content;
      
      return new Response(JSON.stringify({
        response: synthesizedResponse,
        confidence: 0.8,
        sources: {
          tabular: sqlResults?.executionResults?.length || 0,
          conceptual: 0
        },
        debugLog
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (openaiError) {
      debugLog.push({
        step: 'openai_exception',
        error: openaiError.message,
        stack: openaiError.stack
      });
      throw openaiError;
    }
    
  } catch (error) {
    console.error('Error in response-synthesizer:', error);
    
    return new Response(JSON.stringify({
      response: 'Desculpe, ocorreu um erro ao processar sua solicitação.',
      confidence: 0,
      sources: { tabular: 0, conceptual: 0 },
      error: error.message,
      debugLog
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
`;

// Salvar versão de debug
const debugFile = './supabase/functions/response-synthesizer/index.ts';
fs.writeFileSync(debugFile, debugResponseSynthesizerCode);
console.log('✅ Versão de debug criada');

console.log('\nFazendo deploy...');
try {
  execSync('npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs', { stdio: 'inherit' });
  console.log('✅ Deploy concluído');
} catch (error) {
  console.error('❌ Erro no deploy:', error.message);
}

console.log('\n💡 Agora as respostas incluirão debugLog com informações detalhadas');