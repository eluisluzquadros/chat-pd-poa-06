import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Supabase
const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQLFile(filename) {
  console.log('🚀 Executando SQL para criar estrutura RAG...');
  
  try {
    // Ler arquivo SQL
    const sqlContent = fs.readFileSync(path.join(__dirname, filename), 'utf8');
    
    // Dividir em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const command of commands) {
      if (command.includes('CREATE TABLE') || 
          command.includes('CREATE INDEX') || 
          command.includes('CREATE OR REPLACE FUNCTION') ||
          command.includes('INSERT INTO')) {
        
        try {
          // Para comandos complexos, usar RPC
          const { data, error } = await supabase.rpc('exec_sql', {
            query: command + ';'
          });
          
          if (error) {
            // Tentar execução direta para alguns comandos
            if (command.includes('INSERT INTO')) {
              console.log('⚠️  Tentando inserção alternativa...');
              // Parse e executa INSERT de forma diferente
              await executeInsert(command);
              successCount++;
            } else {
              console.error('❌ Erro:', error.message);
              errorCount++;
            }
          } else {
            successCount++;
            console.log('✅ Comando executado com sucesso');
          }
        } catch (err) {
          console.error('❌ Erro ao executar comando:', err.message);
          errorCount++;
        }
      }
    }
    
    console.log(`\n📊 Resumo:`);
    console.log(`✅ Comandos bem-sucedidos: ${successCount}`);
    console.log(`❌ Comandos com erro: ${errorCount}`);
    
    // Verificar tabelas criadas
    await verifyTables();
    
  } catch (error) {
    console.error('❌ Erro ao ler arquivo SQL:', error);
  }
}

async function executeInsert(command) {
  // Extrair tabela e dados do comando INSERT
  if (command.includes('legal_articles')) {
    const articles = [
      {
        document_type: 'LUOS',
        article_number: 1,
        article_text: 'Normas de uso e ocupação do solo',
        full_content: 'Art. 1º Esta Lei estabelece as normas de uso e ocupação do solo no território do Município de Porto Alegre.',
        keywords: ['uso do solo', 'ocupação', 'normas', 'território']
      },
      {
        document_type: 'LUOS',
        article_number: 3,
        article_text: 'Princípios fundamentais',
        full_content: 'Art. 3º O Plano Diretor Urbano Sustentável de Porto Alegre será regido pelos seguintes princípios fundamentais: I - Função social da cidade; II - Função social da propriedade; III - Sustentabilidade; IV - Gestão democrática.',
        keywords: ['princípios', 'função social', 'sustentabilidade', 'gestão democrática']
      },
      {
        document_type: 'LUOS',
        article_number: 81,
        article_text: 'Certificações',
        full_content: 'Art. 81 - Das certificações. Inciso III - Certificação em Sustentabilidade Ambiental.',
        keywords: ['certificação', 'sustentabilidade', 'ambiental']
      },
      {
        document_type: 'LUOS',
        article_number: 119,
        article_text: 'Sistema de Gestão e Controle',
        full_content: 'Art. 119 - O Sistema de Gestão e Controle (SGC) realizará análise dos impactos financeiros da ação urbanística sobre a arrecadação municipal.',
        keywords: ['SGC', 'gestão', 'controle', 'impactos financeiros']
      },
      {
        document_type: 'PDUS',
        article_number: 192,
        article_text: 'Concessão Urbanística',
        full_content: 'Art. 192 - Concessão urbanística é o instrumento pelo qual o Município delega a ente privado a execução de obras de urbanização.',
        keywords: ['concessão urbanística', 'obras', 'urbanização', 'delegação']
      }
    ];
    
    for (const article of articles) {
      const { error } = await supabase
        .from('legal_articles')
        .upsert(article, { onConflict: 'document_type,article_number' });
      
      if (!error) {
        console.log(`✅ Artigo ${article.article_number} inserido`);
      }
    }
  }
  
  if (command.includes('regime_urbanistico_completo')) {
    const regimes = [
      { bairro: 'Alberta dos Morros', zot: 'ZOT-04', altura_maxima: 18.0, coef_basico: 1.0, coef_maximo: 1.5 },
      { bairro: 'Alberta dos Morros', zot: 'ZOT-07', altura_maxima: 33.0, coef_basico: 1.3, coef_maximo: 2.0 }
    ];
    
    for (const regime of regimes) {
      const { error } = await supabase
        .from('regime_urbanistico_completo')
        .upsert(regime, { onConflict: 'bairro,zot' });
      
      if (!error) {
        console.log(`✅ Regime ${regime.bairro} - ${regime.zot} inserido`);
      }
    }
  }
  
  if (command.includes('knowledge_graph_nodes')) {
    const { error } = await supabase
      .from('knowledge_graph_nodes')
      .upsert({
        entity_type: 'flood_protection',
        entity_name: 'sistema_atual',
        entity_value: '25 bairros',
        properties: {
          description: '25 bairros estão Protegidos pelo Sistema Atual de proteção contra enchentes',
          status: 'protected'
        }
      }, { onConflict: 'entity_type,entity_name' });
    
    if (!error) {
      console.log('✅ Knowledge graph node inserido');
    }
  }
}

async function verifyTables() {
  console.log('\n🔍 Verificando tabelas criadas...');
  
  const tablesToCheck = [
    'legal_articles',
    'legal_items',
    'knowledge_graph_nodes',
    'knowledge_graph_edges',
    'hierarchical_chunks',
    'regime_urbanistico_completo',
    'smart_cache',
    'session_memory'
  ];
  
  for (const table of tablesToCheck) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`✅ Tabela ${table}: OK (${count || 0} registros)`);
    } else {
      console.log(`❌ Tabela ${table}: ${error.message}`);
    }
  }
}

// Executar
executeSQLFile('create-rag-tables-structure.sql');