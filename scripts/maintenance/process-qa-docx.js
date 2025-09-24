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

// Categorias e suas palavras-chave
const categoryKeywords = {
  'zonas': ['zona', 'zoneamento', 'ZR', 'ZC', 'ZI', 'ZM', 'ZOT'],
  'altura_maxima': ['altura', 'gabarito', 'pavimentos', 'andares', 'metros'],
  'coeficiente_aproveitamento': ['coeficiente', 'CA', 'aproveitamento', 'índice construtivo'],
  'taxa_permeabilidade': ['permeabilidade', 'permeável', 'área verde', 'infiltração'],
  'recuos': ['recuo', 'afastamento', 'frontal', 'lateral', 'fundos'],
  'bairros': ['bairro', 'região', 'localização', 'distrito'],
  'conceitual': ['plano diretor', 'PDDUA', 'conceito', 'definição', 'o que é'],
  'geral': ['geral', 'informação', 'consulta']
};

// Função para determinar a categoria
function determineCategory(question) {
  const lowerQuestion = question.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
      return category;
    }
  }
  
  return 'geral';
}

// Função para determinar se é relacionado a SQL
function isSqlRelated(question) {
  const sqlKeywords = ['listar', 'liste', 'quais são todos', 'mostrar todos', 'tabela', 'dados de'];
  return sqlKeywords.some(keyword => question.toLowerCase().includes(keyword));
}

// Função para gerar tags
function generateTags(question, category) {
  const tags = [category];
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('zona sul')) tags.push('zona_sul');
  if (lowerQuestion.includes('zona norte')) tags.push('zona_norte');
  if (lowerQuestion.includes('centro')) tags.push('centro');
  if (lowerQuestion.includes('comercial')) tags.push('comercial');
  if (lowerQuestion.includes('residencial')) tags.push('residencial');
  if (lowerQuestion.includes('industrial')) tags.push('industrial');
  if (lowerQuestion.includes('sql')) tags.push('sql');
  if (lowerQuestion.includes('básico')) tags.push('basico');
  
  return tags;
}

async function processQADocument() {
  console.log('📄 Processando arquivo PDPOA2025-QA.docx...\n');
  
  try {
    // Ler o arquivo
    const docxPath = path.join(__dirname, 'knowledgebase', 'PDPOA2025-QA.docx');
    const buffer = await fs.readFile(docxPath);
    
    // Converter para texto
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    
    // Processar o texto para extrair Q&A
    const lines = text.split('\n').filter(line => line.trim());
    const qaItems = [];
    
    let currentQuestion = null;
    let currentAnswer = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detectar pergunta (começa com P: ou Q: ou número seguido de .)
      if (trimmedLine.match(/^[PQ]:|^\d+\.\s/)) {
        // Se já temos uma pergunta anterior, salvá-la
        if (currentQuestion && currentAnswer.length > 0) {
          qaItems.push({
            question: currentQuestion,
            answer: currentAnswer.join(' ').trim()
          });
        }
        
        // Nova pergunta
        currentQuestion = trimmedLine.replace(/^[PQ]:|^\d+\.\s/, '').trim();
        currentAnswer = [];
      }
      // Detectar resposta (começa com R: ou A:)
      else if (trimmedLine.match(/^[RA]:/)) {
        const answer = trimmedLine.replace(/^[RA]:/, '').trim();
        currentAnswer.push(answer);
      }
      // Continuação da resposta
      else if (currentQuestion && trimmedLine) {
        currentAnswer.push(trimmedLine);
      }
    }
    
    // Adicionar o último item
    if (currentQuestion && currentAnswer.length > 0) {
      qaItems.push({
        question: currentQuestion,
        answer: currentAnswer.join(' ').trim()
      });
    }
    
    console.log(`✅ Encontrados ${qaItems.length} pares de Q&A\n`);
    
    // Limpar casos de teste existentes
    console.log('🧹 Limpando casos de teste existentes...');
    const { error: deleteError } = await supabase
      .from('qa_test_cases')
      .delete()
      .gte('id', 0); // Deletar todos
    
    if (deleteError) {
      console.error('Erro ao limpar casos existentes:', deleteError);
    }
    
    // Preparar casos de teste para inserção
    const testCases = qaItems.map((item, index) => {
      const category = determineCategory(item.question);
      const isSQL = isSqlRelated(item.question);
      const tags = generateTags(item.question, category);
      
      return {
        test_id: `qa_${Date.now()}_${index + 1}`,
        query: item.question, // Campo obrigatório
        question: item.question,
        expected_answer: item.answer,
        category: category,
        is_active: true,
        is_sql_related: isSQL,
        tags: tags,
        version: 1
      };
    });
    
    // Inserir em lotes de 10
    const batchSize = 10;
    let inserted = 0;
    
    for (let i = 0; i < testCases.length; i += batchSize) {
      const batch = testCases.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('qa_test_cases')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`❌ Erro ao inserir lote ${i/batchSize + 1}:`, error);
        console.error('Batch que falhou:', batch[0]);
      } else {
        inserted += data?.length || 0;
        console.log(`✅ Lote ${i/batchSize + 1}: ${data?.length || 0} casos inseridos`);
      }
      
      // Aguardar um pouco entre lotes
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n📊 Resumo:`);
    console.log(`   Total de Q&A encontrados: ${qaItems.length}`);
    console.log(`   Casos de teste inseridos: ${inserted}`);
    
    // Verificar alguns exemplos
    const { data: examples } = await supabase
      .from('qa_test_cases')
      .select('*')
      .limit(5);
    
    if (examples && examples.length > 0) {
      console.log('\n📝 Exemplos de casos inseridos:');
      examples.forEach((ex, idx) => {
        console.log(`\n${idx + 1}. ${ex.question}`);
        console.log(`   Categoria: ${ex.category}`);
        console.log(`   Tags: ${ex.tags?.join(', ') || 'Nenhuma'}`);
        console.log(`   SQL: ${ex.is_sql_related ? 'Sim' : 'Não'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar documento:', error);
  }
}

// Executar
processQADocument();