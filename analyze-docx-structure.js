import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeDocxStructure() {
  console.log('📄 Analisando estrutura do arquivo PDPOA2025-QA.docx...\n');
  
  try {
    // Ler o arquivo
    const docxPath = path.join(__dirname, 'knowledgebase', 'PDPOA2025-QA.docx');
    const buffer = await fs.readFile(docxPath);
    
    // Converter para HTML com opções para preservar mais detalhes
    const result = await mammoth.convertToHtml({
      buffer,
      options: {
        includeDefaultStyleMap: true
      }
    });
    
    const html = result.value;
    
    // Salvar HTML para análise
    await fs.writeFile('docx-as-html.html', html);
    console.log('✅ HTML salvo em docx-as-html.html\n');
    
    // Converter para texto bruto também
    const textResult = await mammoth.extractRawText({ buffer });
    const rawText = textResult.value;
    
    // Analisar padrões
    console.log('📊 Análise de padrões:\n');
    
    // Contar perguntas potenciais
    const questionPatterns = [
      /\?/g,
      /pergunta:/gi,
      /questão:/gi,
      /P:/g,
      /Q:/g,
      /^\d+\./gm
    ];
    
    questionPatterns.forEach(pattern => {
      const matches = rawText.match(pattern) || [];
      console.log(`Pattern "${pattern.source}": ${matches.length} ocorrências`);
    });
    
    // Buscar padrões específicos do documento
    const lines = rawText.split('\n');
    console.log(`\nTotal de linhas: ${lines.length}`);
    
    // Primeiras 50 linhas para entender estrutura
    console.log('\n📄 Primeiras 50 linhas do documento:');
    console.log('=' .repeat(80));
    lines.slice(0, 50).forEach((line, idx) => {
      if (line.trim()) {
        console.log(`${idx + 1}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
      }
    });
    
    // Procurar padrões Q&A específicos
    console.log('\n🔍 Buscando padrões Q&A...\n');
    
    let qaCount = 0;
    let inQuestion = false;
    let inAnswer = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const nextLine = lines[i + 1]?.trim() || '';
      
      // Detectar possível pergunta
      if (line.endsWith('?')) {
        qaCount++;
        if (qaCount <= 10) {
          console.log(`Pergunta ${qaCount}: ${line.substring(0, 80)}...`);
          if (nextLine) {
            console.log(`  Próxima linha: ${nextLine.substring(0, 80)}...`);
          }
          console.log('');
        }
      }
    }
    
    console.log(`\n📊 Total de perguntas encontradas (linhas terminando com ?): ${qaCount}`);
    
    // Analisar estrutura de parágrafos
    const paragraphs = html.split('</p>').map(p => p.replace(/<[^>]*>/g, '').trim()).filter(p => p);
    console.log(`\nTotal de parágrafos: ${paragraphs.length}`);
    
    // Salvar análise detalhada
    const analysis = {
      totalLines: lines.length,
      totalParagraphs: paragraphs.length,
      questionMarks: (rawText.match(/\?/g) || []).length,
      possibleQA: qaCount,
      firstLines: lines.slice(0, 100).filter(l => l.trim()),
      sampleParagraphs: paragraphs.slice(0, 20)
    };
    
    await fs.writeFile('docx-analysis.json', JSON.stringify(analysis, null, 2));
    console.log('\n✅ Análise completa salva em docx-analysis.json');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

analyzeDocxStructure();