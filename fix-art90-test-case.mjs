#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

console.log('🔧 Corrigindo caso de teste sobre Art. 90 - Estudo de Impacto de Vizinhança\n');

async function fixArt90TestCase() {
  try {
    // Primeiro, buscar o caso de teste sobre EIV
    const searchResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/qa_test_cases?question=ilike.%Estudo%de%Impacto%de%Vizinhança%`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );

    if (!searchResponse.ok) {
      throw new Error('Erro ao buscar caso de teste');
    }

    const testCases = await searchResponse.json();
    
    if (testCases.length === 0) {
      console.log('❌ Caso de teste não encontrado. Criando novo...');
      
      // Criar novo caso de teste
      const newTestCase = {
        test_id: `legal_art90_${Date.now()}`,
        query: 'Qual artigo define o Estudo de Impacto de Vizinhança?',
        question: 'Qual artigo define o Estudo de Impacto de Vizinhança?',
        expected_keywords: ['artigo', '90', 'luos', 'estudo', 'impacto', 'vizinhança', 'eiv', 'instrumento', 'urbanístico', 'anexo'],
        expected_answer: 'No Art. 90 da LUOS o Estudo de Impacto de Vizinhança (EIV) é considerado como instrumento urbanístico destinado a avaliar os efeitos positivos e negativos de empreendimentos ou atividades sobre a qualidade de vida urbana, a infraestrutura urbana e o entorno imediato, visando compatibilizá-los com as condições da vizinhança consolidada, sendo exigido nos casos definidos no Anexo 7 desta Lei Complementar. Parágrafo único: O Estudo de Impacto de Vizinhança será exigido para as atividades e tipologias previstos no Anexo 7, e deverá ser requerido previamente à análise do projeto arquitetônico ou do projeto de parcelamento do solo, conforme o caso.',
        expected_response: 'No Art. 90 da LUOS o Estudo de Impacto de Vizinhança (EIV) é considerado como instrumento urbanístico destinado a avaliar os efeitos positivos e negativos de empreendimentos ou atividades sobre a qualidade de vida urbana, a infraestrutura urbana e o entorno imediato, visando compatibilizá-los com as condições da vizinhança consolidada, sendo exigido nos casos definidos no Anexo 7 desta Lei Complementar. Parágrafo único: O Estudo de Impacto de Vizinhança será exigido para as atividades e tipologias previstos no Anexo 7, e deverá ser requerido previamente à análise do projeto arquitetônico ou do projeto de parcelamento do solo, conforme o caso.',
        category: 'legal_articles',
        complexity: 'high',
        min_response_length: 100,
        is_active: true,
        tags: ['legal', 'artigo', 'luos', 'eiv', 'art90', 'anexo7'],
        is_sql_related: false,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/qa_test_cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(newTestCase)
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`Erro ao criar caso de teste: ${error}`);
      }

      const created = await createResponse.json();
      console.log('✅ Novo caso de teste criado com sucesso!');
      console.log('   ID:', created[0]?.id);
      
    } else {
      console.log(`📝 Encontrado(s) ${testCases.length} caso(s) de teste sobre EIV`);
      
      // Atualizar cada caso encontrado
      for (const testCase of testCases) {
        console.log(`\n   Atualizando caso ID: ${testCase.id}`);
        console.log(`   Pergunta: ${testCase.question}`);
        console.log(`   Resposta atual: ${testCase.expected_answer?.substring(0, 50)}...`);
        
        const correctAnswer = 'No Art. 90 da LUOS o Estudo de Impacto de Vizinhança (EIV) é considerado como instrumento urbanístico destinado a avaliar os efeitos positivos e negativos de empreendimentos ou atividades sobre a qualidade de vida urbana, a infraestrutura urbana e o entorno imediato, visando compatibilizá-los com as condições da vizinhança consolidada, sendo exigido nos casos definidos no Anexo 7 desta Lei Complementar. Parágrafo único: O Estudo de Impacto de Vizinhança será exigido para as atividades e tipologias previstos no Anexo 7, e deverá ser requerido previamente à análise do projeto arquitetônico ou do projeto de parcelamento do solo, conforme o caso.';
        
        const expectedKeywords = ['artigo', '90', 'luos', 'estudo', 'impacto', 'vizinhança', 'eiv', 'instrumento', 'urbanístico', 'anexo'];
        
        const updateData = {
          query: testCase.question,
          expected_answer: correctAnswer,
          expected_response: correctAnswer,
          expected_keywords: expectedKeywords,
          tags: ['legal', 'artigo', 'luos', 'eiv', 'art90', 'anexo7'],
          category: 'legal_articles',
          complexity: 'high',
          version: (testCase.version || 0) + 1,
          updated_at: new Date().toISOString()
        };

        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/qa_test_cases?id=eq.${testCase.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify(updateData)
          }
        );

        if (!updateResponse.ok) {
          const error = await updateResponse.text();
          console.error(`   ❌ Erro ao atualizar: ${error}`);
        } else {
          console.log('   ✅ Caso de teste atualizado com sucesso!');
          console.log('   Nova resposta: Art. 90 da LUOS...');
        }
      }
    }
    
    // Verificar se há outros casos relacionados que mencionam Art. 89 incorretamente
    console.log('\n🔍 Verificando outros casos que possam estar incorretos...');
    
    const art89Response = await fetch(
      `${SUPABASE_URL}/rest/v1/qa_test_cases?expected_answer=ilike.%Art.%89%EIV%`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );
    
    if (art89Response.ok) {
      const art89Cases = await art89Response.json();
      if (art89Cases.length > 0) {
        console.log(`⚠️ Encontrados ${art89Cases.length} casos mencionando Art. 89 para EIV (incorreto)`);
        console.log('   Estes casos também precisam ser corrigidos para Art. 90');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar
fixArt90TestCase().then(() => {
  console.log('\n✨ Processo concluído!');
});