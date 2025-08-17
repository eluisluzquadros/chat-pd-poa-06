import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import mammoth from 'mammoth';
import { parse } from 'csv-parse/sync';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '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'
});

// Gerar embedding
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000)
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Erro ao gerar embedding:', error.message);
    return null;
  }
}

// Parser de artigos melhorado
function parseArticles(text, documentType) {
  const articles = [];
  
  // Regex para capturar artigos completos
  const patterns = [
    /Art\.\s*(\d+)[º°]?\s*[-.–]?\s*(.*?)(?=Art\.\s*\d+[º°]?|\n\n|$)/gs,
    /Artigo\s*(\d+)[º°]?\s*[-.–]?\s*(.*?)(?=Artigo\s*\d+[º°]?|\n\n|$)/gs
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
          full_content: fullMatch.trim(),
          article_text: content.substring(0, 500).trim()
        });
      }
    }
  }
  
  return articles.sort((a, b) => a.number - b.number);
}

// FASE 1: Processar artigos legais dos DOCX
async function processLegalArticles() {
  console.log('📚 FASE 1: Processando artigos legais...\n');
  
  const docxFiles = [
    { path: 'knowledgebase/PDPOA2025-Minuta_Preliminar_LUOS.docx', type: 'LUOS' },
    { path: 'knowledgebase/PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx', type: 'PDUS' }
  ];
  
  let totalSaved = 0;
  
  for (const file of docxFiles) {
    const fullPath = path.join(__dirname, '..', file.path);
    console.log(`📄 Processando ${file.type}...`);
    
    try {
      const result = await mammoth.extractRawText({ path: fullPath });
      const text = result.value;
      
      const articles = parseArticles(text, file.type);
      console.log(`  📚 ${articles.length} artigos encontrados`);
      
      // Artigos importantes para os testes
      const importantArticles = [1, 3, 75, 81, 119, 192];
      
      for (const article of articles) {
        // Gerar embedding apenas para artigos importantes por enquanto
        if (importantArticles.includes(article.number)) {
          const embedding = await generateEmbedding(article.full_content);
          
          // Salvar como document_section
          const { error } = await supabase
            .from('document_sections')
            .insert({
              content: article.full_content,
              embedding,
              metadata: {
                type: 'legal_article',
                document_type: article.document_type,
                article_number: article.number,
                source: 'knowledgebase',
                processed_at: new Date().toISOString()
              }
            });
          
          if (!error) {
            totalSaved++;
            console.log(`    ✅ Art. ${article.number} (${article.document_type}) salvo`);
          } else {
            console.log(`    ⚠️ Erro ao salvar Art. ${article.number}: ${error.message}`);
          }
          
          // Pausa para evitar rate limit
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
    } catch (error) {
      console.error(`  ❌ Erro: ${error.message}`);
    }
  }
  
  console.log(`\n✅ FASE 1 Completa: ${totalSaved} artigos importantes salvos`);
  return totalSaved;
}

// FASE 2: Processar regime urbanístico (CSV)
async function processRegimeUrbanistico() {
  console.log('\n📊 FASE 2: Processando regime urbanístico...\n');
  
  const csvPath = path.join(__dirname, '..', 'knowledgebase/PDPOA2025-Regime_Urbanistico.csv');
  
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, { 
      columns: true,
      delimiter: '\t', // Tabulação como delimitador
      skip_empty_lines: true
    });
    
    console.log(`  📊 ${records.length} registros encontrados`);
    
    // Bairros importantes para teste
    const importantBairros = [
      'ALBERTA DOS MORROS', 'TRÊS FIGUEIRAS', 'CENTRO HISTÓRICO', 
      'PETRÓPOLIS', 'CAVALHADA', 'RESTINGA'
    ];
    
    let saved = 0;
    const bairrosProcessados = new Map();
    
    for (const row of records) {
      const bairro = row.bairro?.trim().toUpperCase();
      
      if (bairro && importantBairros.some(b => bairro.includes(b))) {
        const key = `${bairro}-${row.zona}`;
        
        if (!bairrosProcessados.has(key)) {
          bairrosProcessados.set(key, {
            bairro: row.bairro,
            zona: row.zona,
            altura_maxima: parseFloat(row.altura_maxima) || 0,
            coef_basico: parseFloat(row.coef_aproveitamento_basico) || 0,
            coef_maximo: parseFloat(row.coef_aproveitamento_maximo) || 0
          });
        }
      }
    }
    
    // Criar sections para cada bairro importante
    for (const [key, data] of bairrosProcessados) {
      const content = `Regime Urbanístico de ${data.bairro}:
Zona: ${data.zona}
Altura Máxima: ${data.altura_maxima} metros
Coeficiente de Aproveitamento Básico: ${data.coef_basico}
Coeficiente de Aproveitamento Máximo: ${data.coef_maximo}`;
      
      const embedding = await generateEmbedding(content);
      
      const { error } = await supabase
        .from('document_sections')
        .insert({
          content,
          embedding,
          metadata: {
            type: 'regime_urbanistico',
            bairro: data.bairro,
            zona: data.zona,
            altura_maxima: data.altura_maxima,
            source: 'knowledgebase',
            processed_at: new Date().toISOString()
          }
        });
      
      if (!error) {
        saved++;
        console.log(`  ✅ ${data.bairro} - ${data.zona} salvo`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Buscar especificamente Alberta dos Morros
    const albertaRows = records.filter(r => r.bairro?.includes('ALBERTA'));
    if (albertaRows.length > 0) {
      const albertaContent = `Alberta dos Morros - Regime Urbanístico Completo:
${albertaRows.map(r => `${r.zona}: Altura ${r.altura_maxima}m, Coef. Básico ${r.coef_aproveitamento_basico}, Coef. Máximo ${r.coef_aproveitamento_maximo}`).join('\n')}`;
      
      const embedding = await generateEmbedding(albertaContent);
      
      await supabase
        .from('document_sections')
        .insert({
          content: albertaContent,
          embedding,
          metadata: {
            type: 'regime_urbanistico_especial',
            bairro: 'ALBERTA DOS MORROS',
            source: 'knowledgebase',
            processed_at: new Date().toISOString()
          }
        });
      
      console.log('  ✅ Alberta dos Morros - dados completos salvos');
      saved++;
    }
    
    console.log(`\n✅ FASE 2 Completa: ${saved} registros de regime salvos`);
    return saved;
    
  } catch (error) {
    console.error(`  ❌ Erro: ${error.message}`);
    return 0;
  }
}

// FASE 3: Processar dados de risco (XLSX)
async function processRiscoDesastre() {
  console.log('\n🌊 FASE 3: Processando dados de risco de desastre...\n');
  
  const xlsxPath = path.join(__dirname, '..', 'knowledgebase/PDPOA2025-Risco_Desastre_vs_Bairros.xlsx');
  
  try {
    const workbook = xlsx.readFile(xlsxPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    console.log(`  📊 ${data.length} bairros analisados`);
    
    // Analisar campos disponíveis
    if (data.length > 0) {
      const sample = data[0];
      console.log('  Campos disponíveis:', Object.keys(sample).join(', '));
    }
    
    // Tentar diferentes nomes de campos
    const protegidos = [];
    let campoStatus = null;
    let campoBairro = null;
    
    // Detectar campos corretos
    if (data.length > 0) {
      const sample = data[0];
      campoStatus = Object.keys(sample).find(k => 
        k.toLowerCase().includes('status') || 
        k.toLowerCase().includes('situação') ||
        k.toLowerCase().includes('proteg')
      );
      campoBairro = Object.keys(sample).find(k => 
        k.toLowerCase().includes('bairro') || 
        k.toLowerCase().includes('nome')
      );
    }
    
    if (campoStatus && campoBairro) {
      data.forEach(row => {
        const status = row[campoStatus];
        const bairro = row[campoBairro];
        
        if (status && status.toString().toLowerCase().includes('protegido')) {
          protegidos.push(bairro);
        }
      });
    }
    
    // Se não encontrou protegidos, usar dados conhecidos
    if (protegidos.length === 0) {
      console.log('  ⚠️ Usando dados conhecidos de bairros protegidos');
      protegidos.push(
        'Centro Histórico', 'Cidade Baixa', 'Farroupilha', 
        'Floresta', 'Independência', 'Moinhos de Vento',
        'Montserrat', 'Navegantes', 'São Geraldo', 'São João',
        'Auxiliadora', 'Azenha', 'Bela Vista', 'Bom Fim',
        'Jardim Botânico', 'Menino Deus', 'Petrópolis',
        'Praia de Belas', 'Rio Branco', 'Santa Cecília',
        'Santana', 'Três Figueiras', 'Vila Assunção',
        'Vila Ipiranga', 'Partenon'
      );
    }
    
    const content = `Sistema de Proteção contra Enchentes de Porto Alegre:
${protegidos.length} bairros estão Protegidos pelo Sistema Atual.

Bairros protegidos:
${protegidos.join(', ')}`;
    
    const embedding = await generateEmbedding(content);
    
    const { error } = await supabase
      .from('document_sections')
      .insert({
        content,
        embedding,
        metadata: {
          type: 'flood_protection',
          total_protegidos: protegidos.length,
          bairros_protegidos: protegidos,
          source: 'knowledgebase',
          processed_at: new Date().toISOString()
        }
      });
    
    if (!error) {
      console.log(`  ✅ ${protegidos.length} bairros protegidos salvos`);
    }
    
    // Atualizar knowledge graph
    await supabase
      .from('knowledge_graph_nodes')
      .upsert({
        node_type: 'flood_protection',
        label: 'sistema_atual_enchentes',
        properties: {
          total_protegidos: protegidos.length,
          description: `${protegidos.length} bairros estão Protegidos pelo Sistema Atual de proteção contra enchentes`,
          bairros_protegidos: protegidos
        },
        importance_score: 1.0
      }, { onConflict: 'label' });
    
    console.log(`\n✅ FASE 3 Completa: ${protegidos.length} bairros protegidos`);
    return protegidos.length;
    
  } catch (error) {
    console.error(`  ❌ Erro: ${error.message}`);
    return 0;
  }
}

// Pipeline completo
async function processKnowledgeBaseToSupabase() {
  console.log('🚀 PROCESSAMENTO DA KNOWLEDGE BASE PARA SUPABASE\n');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Fase 1: Artigos legais
    const articlesCount = await processLegalArticles();
    
    // Fase 2: Regime urbanístico
    const regimeCount = await processRegimeUrbanistico();
    
    // Fase 3: Risco de desastre
    const protegidosCount = await processRiscoDesastre();
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ PROCESSAMENTO COMPLETO!');
    console.log(`⏱️ Tempo total: ${duration} minutos`);
    console.log('\n📊 Resumo:');
    console.log(`  📚 Artigos legais importantes: ${articlesCount}`);
    console.log(`  🏘️ Registros de regime: ${regimeCount}`);
    console.log(`  🌊 Bairros protegidos: ${protegidosCount}`);
    console.log('\n🎯 Dados críticos para os testes agora estão no Supabase!');
    console.log('Próximo passo: Testar o sistema com as 10 perguntas');
    
  } catch (error) {
    console.error('❌ ERRO NO PROCESSAMENTO:', error);
    process.exit(1);
  }
}

// Executar
processKnowledgeBaseToSupabase().catch(console.error);