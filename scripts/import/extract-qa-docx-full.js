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

// Categorias baseadas em palavras-chave
const categoryKeywords = {
  'zonas': ['zona', 'zoneamento', 'ZOT', 'ZR', 'ZC', 'ZI', 'ZM'],
  'altura_maxima': ['altura', 'gabarito', 'pavimentos', 'andares', 'metros'],
  'coeficiente_aproveitamento': ['coeficiente', 'CA', 'aproveitamento', 'índice'],
  'taxa_permeabilidade': ['permeabilidade', 'permeável', 'área verde'],
  'recuos': ['recuo', 'afastamento', 'frontal', 'lateral', 'fundos'],
  'bairros': ['bairro', 'região', 'localização', 'distrito'],
  'conceitual': ['plano diretor', 'PDDUA', 'conceito', 'definição'],
  'geral': ['geral', 'informação', 'consulta']
};

function determineCategory(question) {
  const lowerQuestion = question.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
      return category;
    }
  }
  
  return 'geral';
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
    'cultural': 'cultural'
  };
  
  Object.entries(tagMapping).forEach(([keyword, tag]) => {
    if (lowerQuestion.includes(keyword)) {
      tags.push(tag);
    }
  });
  
  return [...new Set(tags)];
}

async function extractQAFromDocx() {
  console.log('📄 Processando arquivo PDPOA2025-QA.docx...\n');
  
  try {
    // Ler o arquivo
    const docxPath = path.join(__dirname, 'knowledgebase', 'PDPOA2025-QA.docx');
    const buffer = await fs.readFile(docxPath);
    
    // Converter para HTML para preservar formatação
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;
    
    // Converter HTML para texto, preservando quebras de linha
    const text = html
      .replace(/<p>/g, '\n')
      .replace(/<\/p>/g, '\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Salvar texto extraído para debug
    await fs.writeFile('extracted-text.txt', text);
    console.log('✅ Texto extraído salvo em extracted-text.txt\n');
    
    // Processar Q&A - Padrão mais flexível
    const qaItems = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentQuestion = null;
    let currentAnswer = [];
    let isInAnswer = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1] || '';
      
      // Detectar pergunta - padrões variados
      if (
        line.toLowerCase().includes('pergunta:') ||
        line.toLowerCase().includes('questão:') ||
        (line.endsWith('?') && nextLine.toLowerCase().includes('resposta:')) ||
        (line.endsWith('?') && line.length > 20 && !isInAnswer)
      ) {
        // Salvar Q&A anterior se existir
        if (currentQuestion && currentAnswer.length > 0) {
          qaItems.push({
            question: currentQuestion,
            answer: currentAnswer.join(' ').trim()
          });
        }
        
        // Nova pergunta
        currentQuestion = line
          .replace(/^(pergunta|questão|P|Q):\s*/i, '')
          .replace(/^\d+[\.\)]\s*/, '')
          .trim();
        currentAnswer = [];
        isInAnswer = false;
      }
      // Detectar resposta
      else if (
        line.toLowerCase().includes('resposta:') ||
        line.toLowerCase().includes('r:') ||
        (currentQuestion && !isInAnswer && line.length > 20)
      ) {
        isInAnswer = true;
        const answerText = line
          .replace(/^(resposta|R|A):\s*/i, '')
          .trim();
        if (answerText) {
          currentAnswer.push(answerText);
        }
      }
      // Continuação da resposta
      else if (isInAnswer && line) {
        currentAnswer.push(line);
      }
    }
    
    // Adicionar último Q&A
    if (currentQuestion && currentAnswer.length > 0) {
      qaItems.push({
        question: currentQuestion,
        answer: currentAnswer.join(' ').trim()
      });
    }
    
    console.log(`✅ Encontrados ${qaItems.length} pares de Q&A\n`);
    
    // Salvar Q&A extraídos para verificação
    await fs.writeFile(
      'extracted-qa.json', 
      JSON.stringify(qaItems, null, 2)
    );
    console.log('✅ Q&A extraídos salvos em extracted-qa.json\n');
    
    // Limpar casos existentes
    console.log('🧹 Limpando casos de teste existentes...');
    const { error: deleteError } = await supabase
      .from('qa_test_cases')
      .delete()
      .gte('id', 0);
    
    if (deleteError) {
      console.error('Erro ao limpar:', deleteError);
    }
    
    // Preparar casos para inserção
    const timestamp = Date.now();
    const testCases = qaItems.map((item, index) => {
      const category = determineCategory(item.question);
      const tags = generateTags(item.question, category);
      
      return {
        test_id: `pdpoa_${timestamp}_${index + 1}`,
        query: item.question,
        question: item.question,
        expected_answer: item.answer,
        expected_keywords: [category], // Campo obrigatório
        category: category,
        complexity: 'medium', // Usando valor válido
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
      } else {
        inserted += data?.length || 0;
        console.log(`✅ Lote ${Math.floor(i/batchSize) + 1}: ${data?.length || 0} casos inseridos`);
      }
      
      // Pequena pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n📊 Resumo Final:`);
    console.log(`   Total de Q&A extraídos: ${qaItems.length}`);
    console.log(`   Casos inseridos no banco: ${inserted}`);
    
    // Mostrar distribuição por categoria
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
    
  } catch (error) {
    console.error('❌ Erro ao processar:', error);
  }
}

// Executar
extractQAFromDocx();