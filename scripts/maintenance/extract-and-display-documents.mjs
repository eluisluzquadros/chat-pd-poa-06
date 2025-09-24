import mammoth from 'mammoth';
import { parse } from 'csv-parse/sync';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parser de artigos
function parseArticles(text, documentType) {
  const articles = [];
  
  // Regex para capturar artigos
  const patterns = [
    /Art\.\s*(\d+)[º°]?\s*[-.–]?\s*(.*?)(?=Art\.\s*\d+[º°]?|$)/gs,
    /Artigo\s*(\d+)[º°]?\s*[-.–]?\s*(.*?)(?=Artigo\s*\d+[º°]?|$)/gs
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const [fullMatch, number, content] = match;
      const articleNum = parseInt(number);
      
      if (articleNum && !articles.find(a => a.number === articleNum)) {
        articles.push({
          number: articleNum,
          document_type: documentType,
          full_content: fullMatch.trim().substring(0, 1000),
          preview: content.substring(0, 100).trim()
        });
      }
    }
  }
  
  return articles.sort((a, b) => a.number - b.number);
}

// Processar DOCX
async function extractDocxContent() {
  console.log('📚 EXTRAINDO CONTEÚDO DOS DOCUMENTOS DOCX\n');
  console.log('=' .repeat(60));
  
  const docxFiles = [
    { path: 'knowledgebase/PDPOA2025-Minuta_Preliminar_LUOS.docx', type: 'LUOS' },
    { path: 'knowledgebase/PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx', type: 'PDUS' }
  ];
  
  const allArticles = [];
  
  for (const file of docxFiles) {
    const fullPath = path.join(__dirname, '..', file.path);
    console.log(`\n📄 Processando ${file.type}...`);
    
    try {
      const result = await mammoth.extractRawText({ path: fullPath });
      const text = result.value;
      
      console.log(`  📝 Texto extraído: ${text.length} caracteres`);
      
      const articles = parseArticles(text, file.type);
      console.log(`  📚 ${articles.length} artigos encontrados`);
      
      // Mostrar primeiros e últimos artigos
      if (articles.length > 0) {
        console.log('\n  Primeiros artigos:');
        articles.slice(0, 3).forEach(art => {
          console.log(`    Art. ${art.number}: ${art.preview}...`);
        });
        
        if (articles.length > 6) {
          console.log('\n  Últimos artigos:');
          articles.slice(-3).forEach(art => {
            console.log(`    Art. ${art.number}: ${art.preview}...`);
          });
        }
      }
      
      // Procurar artigos específicos dos testes
      const targetArticles = [1, 3, 75, 81, 119, 192];
      console.log('\n  Artigos-chave para testes:');
      for (const num of targetArticles) {
        const found = articles.find(a => a.number === num);
        if (found) {
          console.log(`    ✅ Art. ${num} encontrado: ${found.preview}...`);
        } else {
          console.log(`    ❌ Art. ${num} não encontrado`);
        }
      }
      
      allArticles.push(...articles);
      
    } catch (error) {
      console.error(`  ❌ Erro: ${error.message}`);
    }
  }
  
  return allArticles;
}

// Processar CSV
async function extractCsvContent() {
  console.log('\n\n📊 EXTRAINDO CONTEÚDO DO CSV (Regime Urbanístico)\n');
  console.log('=' .repeat(60));
  
  const csvPath = path.join(__dirname, '..', 'knowledgebase/PDPOA2025-Regime_Urbanistico.csv');
  
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, { 
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`📊 ${records.length} registros encontrados`);
    
    // Análise de bairros
    const bairros = new Set();
    const zonas = new Set();
    
    records.forEach(row => {
      if (row.bairro) bairros.add(row.bairro);
      if (row.zona) zonas.add(row.zona);
    });
    
    console.log(`🏘️ ${bairros.size} bairros únicos`);
    console.log(`📍 ${zonas.size} zonas únicas`);
    
    // Buscar Alberta dos Morros
    console.log('\n🔍 Buscando Alberta dos Morros:');
    const alberta = records.filter(r => r.bairro?.includes('Alberta'));
    if (alberta.length > 0) {
      alberta.forEach(row => {
        console.log(`  ✅ ${row.bairro} - ${row.zona}: Altura ${row.altura_maxima}m`);
      });
    } else {
      console.log('  ❌ Alberta dos Morros não encontrado');
    }
    
    // Mostrar algumas amostras
    console.log('\nAmostras de dados:');
    records.slice(0, 5).forEach(row => {
      console.log(`  ${row.bairro} - ${row.zona}: ${row.altura_maxima}m`);
    });
    
    return records;
    
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    return [];
  }
}

// Processar XLSX
async function extractXlsxContent() {
  console.log('\n\n🌊 EXTRAINDO CONTEÚDO DO XLSX (Risco de Desastre)\n');
  console.log('=' .repeat(60));
  
  const xlsxPath = path.join(__dirname, '..', 'knowledgebase/PDPOA2025-Risco_Desastre_vs_Bairros.xlsx');
  
  try {
    const workbook = xlsx.readFile(xlsxPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    console.log(`📊 ${data.length} bairros analisados`);
    
    // Contar por status
    const statusCount = {};
    const protegidos = [];
    
    data.forEach(row => {
      // Tentar diferentes campos possíveis
      const status = row.Status || row.status || row.Situação || row.situacao || 'Desconhecido';
      const bairro = row.Bairro || row.bairro || row.Nome || row.nome;
      
      statusCount[status] = (statusCount[status] || 0) + 1;
      
      if (status.toLowerCase().includes('protegido')) {
        protegidos.push(bairro);
      }
    });
    
    console.log('\n📊 Categorias de proteção:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} bairros`);
    });
    
    console.log(`\n✅ Total de bairros protegidos: ${protegidos.length}`);
    
    if (protegidos.length > 0) {
      console.log('\nPrimeiros bairros protegidos:');
      protegidos.slice(0, 10).forEach(b => {
        console.log(`  - ${b}`);
      });
    }
    
    return data;
    
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
    return [];
  }
}

// Pipeline principal
async function extractAllDocuments() {
  console.log('🚀 EXTRAÇÃO E ANÁLISE DE DOCUMENTOS\n');
  
  const startTime = Date.now();
  
  try {
    // Extrair DOCX
    const articles = await extractDocxContent();
    
    // Extrair CSV
    const regime = await extractCsvContent();
    
    // Extrair XLSX
    const risco = await extractXlsxContent();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ EXTRAÇÃO COMPLETA!');
    console.log(`⏱️ Tempo: ${duration} segundos`);
    console.log('\n📊 Resumo:');
    console.log(`  📚 Artigos legais: ${articles.length}`);
    console.log(`  🏘️ Registros de regime: ${regime.length}`);
    console.log(`  🌊 Dados de risco: ${risco.length}`);
    
    console.log('\n🎯 Próximos passos:');
    console.log('  1. Criar tabela legal_articles no Supabase');
    console.log('  2. Gerar embeddings para cada artigo');
    console.log('  3. Salvar dados estruturados');
    console.log('  4. Testar busca semântica');
    
  } catch (error) {
    console.error('❌ ERRO:', error);
  }
}

// Executar
extractAllDocuments().catch(console.error);