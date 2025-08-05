import { createClient } from '@supabase/supabase-js';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Categorias expandidas baseadas no conteúdo real
const categoryKeywords = {
  'zonas': ['zona', 'zoneamento', 'ZOT', 'ZR', 'ZC', 'ZI', 'ZM', 'ZEIS', 'AEIS'],
  'altura_maxima': ['altura', 'gabarito', 'pavimentos', 'andares', 'metros', 'verticalização'],
  'coeficiente_aproveitamento': ['coeficiente', 'CA', 'aproveitamento', 'índice', 'outorga onerosa', 'solo criado'],
  'taxa_permeabilidade': ['permeabilidade', 'permeável', 'área verde', 'drenagem'],
  'recuos': ['recuo', 'afastamento', 'frontal', 'lateral', 'fundos'],
  'bairros': ['bairro', 'região', 'localização', 'distrito', 'três figueiras', 'petrópolis', 'cristal'],
  'conceitual': ['plano diretor', 'PDDUA', 'PDUS', 'conceito', 'definição', 'o que é', 'LUOS'],
  'habitacao': ['habitação', 'moradia', 'HIS', 'interesse social', 'déficit habitacional'],
  'mobilidade': ['mobilidade', 'transporte', 'trânsito', 'deslocamento', 'ônibus'],
  'ambiental': ['clima', 'ambiental', 'sustentável', 'resiliência', 'enchente', 'inundação', 'guaíba'],
  'gestao': ['gestão', 'CIT', 'monitoramento', 'governança', 'participação'],
  'geral': ['geral', 'informação', 'consulta']
};

function determineCategory(question) {
  const lowerQuestion = question.toLowerCase();
  let bestMatch = 'geral';
  let maxScore = 0;
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const score = keywords.filter(keyword => lowerQuestion.includes(keyword)).length;
    if (score > maxScore) {
      maxScore = score;
      bestMatch = category;
    }
  }
  
  return bestMatch;
}

function generateTags(question, category) {
  const tags = [category];
  const lowerQuestion = question.toLowerCase();
  
  const tagMapping = {
    'zona sul': 'zona_sul',
    'zona norte': 'zona_norte',
    'centro': 'centro',
    'comercial': 'comercial',
    'residencial': 'residencial',
    'industrial': 'industrial',
    'proteção': 'protecao',
    'ambiental': 'ambiental',
    'histórico': 'historico',
    'cultural': 'cultural',
    'enchente': 'enchentes_2024',
    'inundação': 'enchentes_2024',
    'regularização': 'regularizacao',
    'favelas': 'areas_irregulares',
    'risco': 'areas_risco',
    'público': 'espaco_publico',
    'privado': 'setor_privado'
  };
  
  Object.entries(tagMapping).forEach(([keyword, tag]) => {
    if (lowerQuestion.includes(keyword)) {
      tags.push(tag);
    }
  });
  
  return [...new Set(tags)];
}

async function extractAllQAFromDocx() {
  console.log('📄 Processando arquivo PDPOA2025-QA.docx para extrair TODAS as Q&As...\n');
  
  try {
    // Ler o arquivo
    const docxPath = path.join(__dirname, 'knowledgebase', 'PDPOA2025-QA.docx');
    const buffer = await fs.readFile(docxPath);
    
    // Extrair texto bruto
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    
    // Dividir em linhas
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    // Processar Q&A com padrão específico do documento
    const qaItems = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Verificar se é uma pergunta (termina com ?)
      if (line.endsWith('?')) {
        const question = line;
        const answerLines = [];
        
        // Coletar resposta
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          
          // Se encontrar próxima pergunta, parar
          if (nextLine.endsWith('?')) {
            break;
          }
          
          // Se a linha começa com "Resposta:", remover o prefixo
          if (nextLine.toLowerCase().startsWith('resposta:')) {
            answerLines.push(nextLine.substring(9).trim());
          } else if (nextLine.length > 0) {
            // Adicionar outras linhas que fazem parte da resposta
            answerLines.push(nextLine);
          }
          
          j++;
        }
        
        // Se encontrou resposta, adicionar ao array
        if (answerLines.length > 0) {
          qaItems.push({
            question: question,
            answer: answerLines.join(' ').trim()
          });
        }
        
        // Avançar índice
        i = j - 1;
      }
    }
    
    console.log(`✅ Encontrados ${qaItems.length} pares de Q&A\n`);
    
    // Salvar Q&A extraídos
    await fs.writeFile(
      'all-qa-extracted.json', 
      JSON.stringify(qaItems, null, 2)
    );
    console.log('✅ Todos os Q&A salvos em all-qa-extracted.json\n');
    
    // Limpar tabela
    console.log('🧹 Limpando casos de teste existentes...');
    const { error: deleteError } = await supabase
      .from('qa_test_cases')
      .delete()
      .gte('id', 0);
    
    if (deleteError) {
      console.error('Erro ao limpar:', deleteError);
      return;
    }
    
    // Preparar casos para inserção
    const timestamp = Date.now();
    const testCases = qaItems.map((item, index) => {
      const category = determineCategory(item.question);
      const tags = generateTags(item.question, category);
      
      // Determinar complexidade baseada no tamanho da resposta
      const complexity = item.answer.length > 500 ? 'high' : 'medium';
      
      return {
        test_id: `pdpoa_full_${timestamp}_${index + 1}`,
        query: item.question,
        question: item.question,
        expected_answer: item.answer,
        expected_keywords: [category],
        category: category,
        complexity: complexity,
        is_active: true,
        is_sql_related: false,
        tags: tags,
        version: 1
      };
    });
    
    // Inserir em lotes
    const batchSize = 10;
    let inserted = 0;
    
    console.log('📝 Inserindo casos de teste...\n');
    
    for (let i = 0; i < testCases.length; i += batchSize) {
      const batch = testCases.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('qa_test_cases')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`❌ Erro no lote ${Math.floor(i/batchSize) + 1}:`, error.message);
        console.error('Primeiro item do lote:', batch[0].question.substring(0, 50));
      } else {
        inserted += data?.length || 0;
        console.log(`✅ Lote ${Math.floor(i/batchSize) + 1}: ${data?.length || 0} casos inseridos`);
      }
      
      // Pequena pausa
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 Resumo Final:`);
    console.log(`   Total de Q&A extraídos: ${qaItems.length}`);
    console.log(`   Casos inseridos no banco: ${inserted}`);
    
    // Distribuição por categoria
    const categoryCount = {};
    testCases.forEach(tc => {
      categoryCount[tc.category] = (categoryCount[tc.category] || 0) + 1;
    });
    
    console.log('\n📊 Distribuição por categoria:');
    Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count} casos`);
      });
    
    // Mostrar alguns exemplos
    console.log('\n📝 Primeiros 5 casos inseridos:');
    testCases.slice(0, 5).forEach((tc, idx) => {
      console.log(`\n${idx + 1}. ${tc.question}`);
      console.log(`   Categoria: ${tc.category}`);
      console.log(`   Tags: ${tc.tags.join(', ')}`);
      console.log(`   Complexidade: ${tc.complexity}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar:', error);
  }
}

// Executar
extractAllQAFromDocx();