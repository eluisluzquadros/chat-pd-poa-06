import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestCaseRequest {
  question: string;
  expected_answer: string;
  category: string;
  difficulty?: string;
  tags?: string[];
  is_active?: boolean;
  is_sql_related?: boolean;
  expected_sql?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação (opcional - pode ser removido se quiser permitir sem auth)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.log('Authentication failed:', authError);
        // Continuar mesmo sem auth para casos de teste
      } else {
        console.log('Authenticated user:', user.email);
      }
    }

    const requestData: TestCaseRequest = await req.json();
    console.log('Creating test case:', requestData);

    // Validação básica
    if (!requestData.question?.trim() || !requestData.expected_answer?.trim() || !requestData.category) {
      throw new Error('Campos obrigatórios faltando: question, expected_answer, category');
    }

    // Gerar test_id
    const testId = `${requestData.category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extrair keywords da resposta esperada
    const expectedKeywords = requestData.expected_answer
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 15);

    // Preparar dados para inserção (apenas campos que existem na tabela)
    const testCase = {
      test_id: testId,
      query: requestData.question.trim(),
      question: requestData.question.trim(),
      expected_keywords: expectedKeywords,
      expected_answer: requestData.expected_answer.trim(),
      category: requestData.category,
      // Mapear difficulty para complexity e também persistir difficulty
      difficulty: requestData.difficulty || 'medium',
      complexity: requestData.difficulty === 'easy' ? 'simple' : 
                 requestData.difficulty === 'hard' ? 'complex' : 
                 'medium',
      min_response_length: 50,
      is_active: requestData.is_active !== false,
      tags: requestData.tags && requestData.tags.length > 0 ? requestData.tags : ['geral'],
      is_sql_related: requestData.is_sql_related || false,
      expected_sql: requestData.expected_sql || null,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Inserting test case:', testCase);

    // Inserir no banco usando service role key (bypassa RLS)
    const { data, error } = await supabase
      .from('qa_test_cases')
      .insert(testCase)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Erro ao salvar caso de teste: ${error.message}`);
    }

    console.log('Test case created successfully:', data);

    return new Response(
      JSON.stringify({
        success: true,
        data: data,
        message: 'Caso de teste criado com sucesso!'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in qa-add-test-case:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});