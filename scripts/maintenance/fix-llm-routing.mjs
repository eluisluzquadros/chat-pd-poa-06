import { readFileSync, writeFileSync } from 'fs';

// Função para adicionar o roteamento correto de LLMs
const routingCode = `
// Helper function to route to correct LLM API
function getLLMEndpoint(provider) {
  const endpoints = {
    'openai': 'https://api.openai.com/v1/chat/completions',
    'anthropic': 'https://api.anthropic.com/v1/messages',
    'google': 'https://generativelanguage.googleapis.com/v1beta/models',
    'deepseek': 'https://api.deepseek.com/v1/chat/completions',
    'zhipuai': 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
  };
  return endpoints[provider] || endpoints['openai'];
}

function getAPIHeaders(provider) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  const zhipuaiApiKey = Deno.env.get('ZHIPUAI_API_KEY');

  switch (provider) {
    case 'anthropic':
      return {
        'x-api-key': anthropicApiKey || '',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      };
    case 'google':
      return {
        'Content-Type': 'application/json',
      };
    case 'deepseek':
      return {
        'Authorization': \`Bearer \${deepseekApiKey}\`,
        'Content-Type': 'application/json',
      };
    case 'zhipuai':
      return {
        'Authorization': \`Bearer \${zhipuaiApiKey}\`,
        'Content-Type': 'application/json',
      };
    case 'openai':
    default:
      return {
        'Authorization': \`Bearer \${openAIApiKey}\`,
        'Content-Type': 'application/json',
      };
  }
}

function formatRequestBody(provider, modelName, messages, systemPrompt) {
  switch (provider) {
    case 'anthropic':
      return {
        model: modelName,
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role === 'system' ? 'assistant' : m.role,
          content: m.content
        }))
      };
    case 'google':
      return {
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        systemInstruction: { parts: [{ text: systemPrompt }] }
      };
    case 'deepseek':
    case 'zhipuai':
    case 'openai':
    default:
      return {
        model: modelName || 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.7,
        max_tokens: 4096
      };
  }
}

function parseModelResponse(provider, response) {
  switch (provider) {
    case 'anthropic':
      return response.content?.[0]?.text || '';
    case 'google':
      return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    case 'deepseek':
    case 'zhipuai':
    case 'openai':
    default:
      return response.choices?.[0]?.message?.content || '';
  }
}
`;

// Lista de arquivos para atualizar
const files = [
  'supabase/functions/response-synthesizer/index.ts',
  'supabase/functions/response-synthesizer-rag/index.ts'
];

console.log('🔧 Corrigindo roteamento de LLMs...\n');

files.forEach(file => {
  try {
    console.log(`📄 Processando: ${file}`);
    
    // Ler o arquivo
    let content = readFileSync(file, 'utf8');
    
    // Verificar se já tem o roteamento
    if (content.includes('getLLMEndpoint')) {
      console.log('✅ Já tem roteamento de LLMs\n');
      return;
    }
    
    // Adicionar as funções helper após os imports
    const importEndIndex = content.lastIndexOf('import');
    const importEndLine = content.indexOf('\n', importEndIndex);
    
    content = content.slice(0, importEndLine + 1) + 
              routingCode + 
              content.slice(importEndLine + 1);
    
    // Substituir a chamada fixa para OpenAI
    content = content.replace(
      /const response = await fetch\('https:\/\/api\.openai\.com\/v1\/chat\/completions',/g,
      `// Determine API endpoint based on provider
    const apiEndpoint = provider === 'google' 
      ? \`\${getLLMEndpoint(provider)}/\${modelName}:generateContent?key=\${Deno.env.get('GEMINI_API_KEY')}\`
      : getLLMEndpoint(provider);
    
    const response = await fetch(apiEndpoint,`
    );
    
    // Substituir os headers
    content = content.replace(
      /headers: {\s*'Authorization': `Bearer \${openAIApiKey}`,\s*'Content-Type': 'application\/json',\s*},/g,
      'headers: getAPIHeaders(provider),'
    );
    
    // Substituir o body
    content = content.replace(
      /body: JSON.stringify\({\s*model: modelName \|\| 'gpt-3\.5-turbo',\s*messages: \[\s*{ role: 'system', content: systemPrompt },\s*\.\.\.messages\s*\],\s*temperature: 0\.7,\s*max_tokens: 4096\s*}\)/g,
      'body: JSON.stringify(formatRequestBody(provider, modelName, messages, systemPrompt))'
    );
    
    // Substituir o parsing da resposta
    content = content.replace(
      /const llmContent = llmResponse\.choices\?\[0\]\.message\.content \|\| '';/g,
      'const llmContent = parseModelResponse(provider, llmResponse);'
    );
    
    // Salvar o arquivo atualizado
    writeFileSync(file, content);
    console.log('✅ Arquivo atualizado com sucesso!\n');
    
  } catch (error) {
    console.error(`❌ Erro ao processar ${file}:`, error.message);
  }
});

console.log('🎉 Correção concluída! Agora faça o deploy das funções:');
console.log('npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs');
console.log('npx supabase functions deploy response-synthesizer-rag --project-ref ngrqwmvuhvjkeohesbxs');