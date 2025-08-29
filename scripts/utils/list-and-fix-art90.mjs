#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 Buscando casos de teste sobre EIV (Estudo de Impacto de Vizinhança)\n');

async function fixArt90Cases() {
  try {
    // Buscar todos os casos que mencionam EIV ou Estudo de Impacto
    const { data: testCases, error } = await supabase
      .from('qa_test_cases')
      .select('*')
      .or('question.ilike.%Estudo%Impacto%Vizinhança%,question.ilike.%EIV%,expected_answer.ilike.%Art.%89%EIV%,expected_answer.ilike.%Art.%90%')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!testCases || testCases.length === 0) {
      console.log('Nenhum caso de teste encontrado sobre EIV. Criando novo...\n');
      
      // Criar novo caso correto
      const newTestCase = {
        test_id: `legal_art90_eiv_${Date.now()}`,
        query: 'Qual artigo define o Estudo de Impacto de Vizinhança?',
        question: 'Qual artigo define o Estudo de Impacto de Vizinhança?',
        expected_keywords: ['artigo', '90', 'luos', 'estudo', 'impacto', 'vizinhança', 'eiv', 'instrumento', 'urbanístico', 'anexo', '7'],
        expected_answer: 'No Art. 90 da LUOS o Estudo de Impacto de Vizinhança (EIV) é considerado como instrumento urbanístico destinado a avaliar os efeitos positivos e negativos de empreendimentos ou atividades sobre a qualidade de vida urbana, a infraestrutura urbana e o entorno imediato, visando compatibilizá-los com as condições da vizinhança consolidada, sendo exigido nos casos definidos no Anexo 7 desta Lei Complementar. Parágrafo único: O Estudo de Impacto de Vizinhança será exigido para as atividades e tipologias previstos no Anexo 7, e deverá ser requerido previamente à análise do projeto arquitetônico ou do projeto de parcelamento do solo, conforme o caso.',
        expected_response: 'No Art. 90 da LUOS o Estudo de Impacto de Vizinhança (EIV) é considerado como instrumento urbanístico destinado a avaliar os efeitos positivos e negativos de empreendimentos ou atividades sobre a qualidade de vida urbana, a infraestrutura urbana e o entorno imediato, visando compatibilizá-los com as condições da vizinhança consolidada, sendo exigido nos casos definidos no Anexo 7 desta Lei Complementar. Parágrafo único: O Estudo de Impacto de Vizinhança será exigido para as atividades e tipologias previstos no Anexo 7, e deverá ser requerido previamente à análise do projeto arquitetônico ou do projeto de parcelamento do solo, conforme o caso.',
        category: 'legal_articles',
        complexity: 'high',
        min_response_length: 100,
        is_active: true,
        tags: ['legal', 'artigo', 'luos', 'eiv', 'art90', 'anexo7', 'vizinhança'],
        is_sql_related: false,
        version: 1
      };

      const { data: created, error: createError } = await supabase
        .from('qa_test_cases')
        .insert(newTestCase)
        .select();

      if (createError) {
        throw createError;
      }

      console.log('✅ Novo caso de teste criado com sucesso!');
      console.log('   ID:', created[0]?.id);
      console.log('   Pergunta:', created[0]?.question);
      
    } else {
      console.log(`📋 Encontrados ${testCases.length} casos relacionados a EIV:\n`);
      
      for (const testCase of testCases) {
        console.log(`\nCaso ID: ${testCase.id}`);
        console.log(`Pergunta: ${testCase.question}`);
        console.log(`Resposta atual: ${testCase.expected_answer?.substring(0, 100)}...`);
        
        // Verificar se a resposta menciona Art. 89 (incorreto)
        if (testCase.expected_answer?.includes('Art. 89')) {
          console.log('⚠️ INCORRETO: Menciona Art. 89 - Corrigindo para Art. 90...');
          
          const correctAnswer = 'No Art. 90 da LUOS o Estudo de Impacto de Vizinhança (EIV) é considerado como instrumento urbanístico destinado a avaliar os efeitos positivos e negativos de empreendimentos ou atividades sobre a qualidade de vida urbana, a infraestrutura urbana e o entorno imediato, visando compatibilizá-los com as condições da vizinhança consolidada, sendo exigido nos casos definidos no Anexo 7 desta Lei Complementar. Parágrafo único: O Estudo de Impacto de Vizinhança será exigido para as atividades e tipologias previstos no Anexo 7, e deverá ser requerido previamente à análise do projeto arquitetônico ou do projeto de parcelamento do solo, conforme o caso.';
          
          const { error: updateError } = await supabase
            .from('qa_test_cases')
            .update({
              query: testCase.question,
              expected_answer: correctAnswer,
              expected_response: correctAnswer,
              expected_keywords: ['artigo', '90', 'luos', 'estudo', 'impacto', 'vizinhança', 'eiv', 'instrumento', 'urbanístico', 'anexo', '7'],
              tags: ['legal', 'artigo', 'luos', 'eiv', 'art90', 'anexo7', 'vizinhança'],
              category: 'legal_articles',
              complexity: 'high',
              version: (testCase.version || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', testCase.id);

          if (updateError) {
            console.error('❌ Erro ao atualizar:', updateError.message);
          } else {
            console.log('✅ Caso atualizado com sucesso para Art. 90!');
          }
        } else if (testCase.expected_answer?.includes('Art. 90')) {
          console.log('✅ Já está correto (menciona Art. 90)');
        } else {
          console.log('⚠️ Resposta não menciona artigo específico - Atualizando...');
          
          const correctAnswer = 'No Art. 90 da LUOS o Estudo de Impacto de Vizinhança (EIV) é considerado como instrumento urbanístico destinado a avaliar os efeitos positivos e negativos de empreendimentos ou atividades sobre a qualidade de vida urbana, a infraestrutura urbana e o entorno imediato, visando compatibilizá-los com as condições da vizinhança consolidada, sendo exigido nos casos definidos no Anexo 7 desta Lei Complementar. Parágrafo único: O Estudo de Impacto de Vizinhança será exigido para as atividades e tipologias previstos no Anexo 7, e deverá ser requerido previamente à análise do projeto arquitetônico ou do projeto de parcelamento do solo, conforme o caso.';
          
          const { error: updateError } = await supabase
            .from('qa_test_cases')
            .update({
              expected_answer: correctAnswer,
              expected_response: correctAnswer,
              expected_keywords: ['artigo', '90', 'luos', 'estudo', 'impacto', 'vizinhança', 'eiv', 'instrumento', 'urbanístico', 'anexo', '7'],
              version: (testCase.version || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', testCase.id);

          if (updateError) {
            console.error('❌ Erro ao atualizar:', updateError.message);
          } else {
            console.log('✅ Caso atualizado com resposta correta!');
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar
fixArt90Cases().then(() => {
  console.log('\n✨ Processo concluído!');
  process.exit(0);
});