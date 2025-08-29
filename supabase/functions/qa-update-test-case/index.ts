import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateTestCaseRequest {
  id: string;
  question: string;
  expected_answer: string;
  category: string;
  difficulty?: string;
  tags?: string[];
  is_active?: boolean;
  is_sql_related?: boolean;
  expected_sql?: string;
  sql_complexity?: string;
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

    const requestData: UpdateTestCaseRequest = await req.json();
    console.log('Updating test case:', requestData.id);

    // Validação básica
    if (!requestData.id) {
      throw new Error('ID do caso de teste é obrigatório');
    }

    if (!requestData.question?.trim() || !requestData.expected_answer?.trim() || !requestData.category) {
      throw new Error('Campos obrigatórios faltando: question, expected_answer, category');
    }

    // Validar e normalizar ID numérico
    const idNum = Number(requestData.id);
    if (!Number.isFinite(idNum)) {
      throw new Error('ID inválido: deve ser numérico');
    }

    // Buscar o caso atual para obter a versão
    const { data: currentCase, error: fetchError } = await supabase
      .from('qa_test_cases')
      .select('version')
      .eq('id', idNum)
      .single();

    if (fetchError) {
      console.error('Error fetching current case:', fetchError);
      throw new Error('Caso de teste não encontrado');
    }

    const currentVersion = currentCase?.version || 0;
    
    // Extrair keywords da resposta esperada
    const expectedKeywords = requestData.expected_answer
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 15);

    // Preparar dados para atualização
    const updateData: any = {
      query: requestData.question.trim(),
      question: requestData.question.trim(),
      expected_keywords: expectedKeywords,
      expected_answer: requestData.expected_answer.trim(),
      category: requestData.category,
      // Persistir difficulty e mapear para complexity
      difficulty: requestData.difficulty || 'medium',
      complexity: requestData.difficulty === 'easy' ? 'simple' : 
                 requestData.difficulty === 'hard' ? 'complex' : 
                 'medium',
      is_active: requestData.is_active !== false,
      tags: requestData.tags && requestData.tags.length > 0 ? requestData.tags : ['geral'],
      is_sql_related: requestData.is_sql_related || false,
      version: currentVersion + 1,
      updated_at: new Date().toISOString()
    };

    // Adicionar campos SQL se necessário
    if (requestData.is_sql_related) {
      updateData.expected_sql = requestData.expected_sql?.trim() || null;
      updateData.sql_complexity = requestData.sql_complexity || null;
    } else {
      updateData.expected_sql = null;
      updateData.sql_complexity = null;
    }

    console.log('Updating with data:', updateData);

    // Atualizar no banco usando service role key (bypassa RLS)
    const { data, error } = await supabase
      .from('qa_test_cases')
      .update(updateData)
      .eq('id', idNum)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Erro ao atualizar caso de teste: ${error.message}`);
    }

    console.log('Test case updated successfully:', data);

    return new Response(
      JSON.stringify({
        success: true,
        data: data,
        message: 'Caso de teste atualizado com sucesso!'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in qa-update-test-case:', error);
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