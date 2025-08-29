import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  llmProvider?: 'openai' | 'claude' | 'gemini' | 'groq' | 'deepseek' | 'llama'
  model?: string
  temperature?: number
  max_tokens?: number
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, llmProvider = 'openai', model, temperature = 0.7, max_tokens = 1000 } = await req.json() as ChatRequest

    // Get API keys from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY')
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')

    let response
    
    switch (llmProvider) {
      case 'openai':
        if (!openaiApiKey) throw new Error('OpenAI API key not configured')
        response = await callOpenAI(messages, model || 'gpt-4-turbo-preview', temperature, max_tokens, openaiApiKey)
        break
        
      case 'claude':
        if (!claudeApiKey) throw new Error('Claude API key not configured')
        response = await callClaude(messages, model || 'claude-3-opus-20240229', temperature, max_tokens, claudeApiKey)
        break
        
      case 'gemini':
        if (!geminiApiKey) throw new Error('Gemini API key not configured')
        response = await callGemini(messages, model || 'gemini-pro', temperature, max_tokens, geminiApiKey)
        break
        
      case 'groq':
        if (!groqApiKey) throw new Error('Groq API key not configured')
        response = await callGroq(messages, model || 'mixtral-8x7b-32768', temperature, max_tokens, groqApiKey)
        break
        
      case 'deepseek':
        if (!deepseekApiKey) throw new Error('DeepSeek API key not configured')
        response = await callDeepSeek(messages, model || 'deepseek-coder', temperature, max_tokens, deepseekApiKey)
        break
        
      case 'llama':
        response = await callLocalLlama(messages, model || 'llama2', temperature, max_tokens)
        break
        
      default:
        throw new Error(`Unknown LLM provider: ${llmProvider}`)
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in multiLLMService:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function callOpenAI(messages: any[], model: string, temperature: number, maxTokens: number, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI API error')
  }

  return {
    content: data.choices[0].message.content,
    provider: 'openai',
    model,
  }
}

async function callClaude(messages: any[], model: string, temperature: number, maxTokens: number, apiKey: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Claude API error')
  }

  return {
    content: data.content[0].text,
    provider: 'claude',
    model,
  }
}

async function callGemini(messages: any[], model: string, temperature: number, maxTokens: number, apiKey: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gemini API error')
  }

  return {
    content: data.candidates[0].content.parts[0].text,
    provider: 'gemini',
    model,
  }
}

async function callGroq(messages: any[], model: string, temperature: number, maxTokens: number, apiKey: string) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Groq API error')
  }

  return {
    content: data.choices[0].message.content,
    provider: 'groq',
    model,
  }
}

async function callDeepSeek(messages: any[], model: string, temperature: number, maxTokens: number, apiKey: string) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'DeepSeek API error')
  }

  return {
    content: data.choices[0].message.content,
    provider: 'deepseek',
    model,
  }
}

async function callLocalLlama(messages: any[], model: string, temperature: number, maxTokens: number) {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || 'Local Llama API error')
  }

  return {
    content: data.message.content,
    provider: 'llama',
    model,
  }
}