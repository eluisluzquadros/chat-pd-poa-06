// Helper function to route to correct LLM API based on provider

interface LLMConfig {
  url: string;
  headers: Record<string, string>;
  body: any;
}

export function getLLMConfig(
  provider: string, 
  modelName: string, 
  messages: any[], 
  systemPrompt: string
): LLMConfig {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  const zhipuaiApiKey = Deno.env.get('ZHIPUAI_API_KEY');

  switch (provider) {
    case 'anthropic':
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'x-api-key': anthropicApiKey || '',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: {
          model: modelName,
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages.map(m => ({
            role: m.role === 'system' ? 'assistant' : m.role,
            content: m.content
          }))
        }
      };

    case 'google':
      // Gemini uses a different format
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          contents: messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          systemInstruction: { parts: [{ text: systemPrompt }] }
        }
      };

    case 'deepseek':
      // DeepSeek uses OpenAI-compatible API
      return {
        url: 'https://api.deepseek.com/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${deepseekApiKey}`,
          'Content-Type': 'application/json',
        },
        body: {
          model: modelName,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          temperature: 0.7,
          max_tokens: 4096
        }
      };

    case 'zhipuai':
      // ZhipuAI uses similar format to OpenAI
      return {
        url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        headers: {
          'Authorization': `Bearer ${zhipuaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: {
          model: modelName,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          temperature: 0.7,
          max_tokens: 4096
        }
      };

    case 'openai':
    default:
      // OpenAI and fallback
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: {
          model: modelName || 'gpt-3.5-turbo',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          temperature: 0.7,
          max_tokens: 4096
        }
      };
  }
}

export function parseModelResponse(provider: string, response: any): string {
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