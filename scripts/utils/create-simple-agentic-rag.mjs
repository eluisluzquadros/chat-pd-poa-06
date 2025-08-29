#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔧 Criando agentic-rag simplificado e funcional...\n');

const simpleAgenticRagCode = `
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const requestBody = await req.json();
    const { query, message, sessionId, userId, bypassCache } = requestBody;
    const userMessage = message || query || '';
    
    if (!userMessage) {
      throw new Error('Query or message is required');
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const agentTrace = [];
    
    // Step 1: Query Analysis
    console.log('🔍 Analyzing query:', userMessage);
    agentTrace.push({ step: 'query_analysis', timestamp: Date.now() });
    
    const analysisResponse = await fetch(\`\${supabaseUrl}/functions/v1/query-analyzer\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${Deno.env.get('SUPABASE_ANON_KEY')}\`,
      },
      body: JSON.stringify({ query: userMessage, sessionId }),
    });

    if (!analysisResponse.ok) {
      throw new Error(\`Query analyzer failed: \${analysisResponse.status}\`);
    }

    const analysisResult = await analysisResponse.json();
    agentTrace.push({ step: 'query_analysis_complete', result: analysisResult });
    
    // Handle simple greetings
    if (userMessage.toLowerCase().match(/^(oi|olá|ola|bom dia|boa tarde|boa noite)$/)) {
      return new Response(JSON.stringify({
        response: 'Olá! Sou o assistente do Plano Diretor de Porto Alegre. Como posso ajudá-lo hoje? Você pode me perguntar sobre zonas, bairros, regras de construção e muito mais.',
        confidence: 1.0,
        sources: { tabular: 0, conceptual: 0 },
        executionTime: Date.now() - startTime,
        agentTrace
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Step 2: SQL Generation (if needed)
    let sqlResults = null;
    if (analysisResult.strategy === 'structured_only' || analysisResult.strategy === 'hybrid') {
      console.log('🔧 Generating SQL...');
      agentTrace.push({ step: 'sql_generation', timestamp: Date.now() });
      
      const sqlResponse = await fetch(\`\${supabaseUrl}/functions/v1/sql-generator\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${Deno.env.get('SUPABASE_ANON_KEY')}\`,
        },
        body: JSON.stringify({
          query: userMessage,
          analysisResult
        }),
      });

      if (sqlResponse.ok) {
        sqlResults = await sqlResponse.json();
        agentTrace.push({ step: 'sql_generation_complete', hasResults: sqlResults.executionResults?.length > 0 });
      }
    }

    // Step 3: Response Synthesis
    console.log('📝 Synthesizing response...');
    agentTrace.push({ step: 'response_synthesis', timestamp: Date.now() });
    
    const synthesisResponse = await fetch(\`\${supabaseUrl}/functions/v1/response-synthesizer\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${Deno.env.get('SUPABASE_ANON_KEY')}\`,
      },
      body: JSON.stringify({
        originalQuery: userMessage,
        analysisResult,
        sqlResults,
        vectorResults: null
      }),
    });

    if (!synthesisResponse.ok) {
      throw new Error(\`Response synthesis failed: \${synthesisResponse.status}\`);
    }

    const synthesisResult = await synthesisResponse.json();
    agentTrace.push({ step: 'response_synthesis_complete' });
    
    const executionTime = Date.now() - startTime;
    
    return new Response(JSON.stringify({
      response: synthesisResult.response,
      confidence: synthesisResult.confidence,
      sources: synthesisResult.sources,
      executionTime,
      agentTrace,
      model: 'gpt-3.5-turbo',
      tokensUsed: synthesisResult.tokensUsed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Agentic RAG error:', error);
    
    const fallbackResponse = {
      response: \`Desculpe, ocorreu um erro ao processar sua solicitação: \${error.message}\`,
      confidence: 0.1,
      sources: { tabular: 0, conceptual: 0 },
      executionTime: Date.now() - startTime,
      agentTrace: [{ step: 'error', error: error.message, stack: error.stack }],
      error: error.message
    };

    return new Response(JSON.stringify(fallbackResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
`;

// Backup e substituir
console.log('1. Fazendo backup do arquivo atual...');
const originalFile = './supabase/functions/agentic-rag/index.ts';
const backupFile = './supabase/functions/agentic-rag/index.ts.complex-backup';
fs.copyFileSync(originalFile, backupFile);
console.log('✅ Backup criado');

console.log('\n2. Criando versão simplificada...');
fs.writeFileSync(originalFile, simpleAgenticRagCode);
console.log('✅ Arquivo substituído');

console.log('\n3. Fazendo deploy...');
try {
  execSync('npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs', { stdio: 'inherit' });
  console.log('✅ Deploy concluído');
} catch (error) {
  console.error('❌ Erro no deploy:', error.message);
}

console.log('\n✅ Agentic-rag simplificado está pronto!');