import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  console.log('🚀 Executando migração SQL para criar novas tabelas...\n');

  try {
    // Ler arquivo de migração
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250131_create_regime_tables.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Arquivo de migração não encontrado:', migrationPath);
      return;
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Arquivo de migração carregado:', migrationPath);

    // Executar SQL
    console.log('\n🔧 Executando SQL...');
    
    // Dividir em comandos individuais (por ponto e vírgula)
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i] + ';';
      
      // Pular comentários
      if (command.trim().startsWith('--')) continue;
      
      try {
        // Extrair nome da operação para log
        const operation = command.match(/^(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|CREATE INDEX)/i)?.[0] || 'SQL';
        const target = command.match(/(TABLE|INDEX|POLICY|VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i)?.[2] || '';
        
        console.log(`  [${i+1}/${commands.length}] Executando ${operation} ${target}...`);
        
        const { error } = await supabase.rpc('execute_sql_query', { 
          query_text: command 
        });

        if (error) {
          console.error(`    ❌ Erro: ${error.message}`);
          errorCount++;
        } else {
          console.log(`    ✅ Sucesso`);
          successCount++;
        }
      } catch (err) {
        console.error(`    ❌ Erro ao executar comando: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n📊 Resumo da migração:');
    console.log(`  ✅ Comandos bem-sucedidos: ${successCount}`);
    console.log(`  ❌ Comandos com erro: ${errorCount}`);

    // Verificar se tabelas foram criadas
    console.log('\n🔍 Verificando tabelas criadas...');
    
    const { data: tables, error: tableError } = await supabase
      .rpc('execute_sql_query', { 
        query_text: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('regime_urbanistico', 'zots_bairros', 'bairros_risco_desastre')
          ORDER BY table_name
        ` 
      });

    if (tableError) {
      console.error('❌ Erro ao verificar tabelas:', tableError.message);
    } else if (tables && tables.length > 0) {
      console.log('✅ Tabelas encontradas:');
      tables.forEach(t => console.log(`   - ${t.table_name}`));
    } else {
      console.log('⚠️ Nenhuma tabela nova encontrada');
    }

    // Verificar contagem de registros
    console.log('\n📊 Verificando dados nas tabelas...');
    
    const tablesToCheck = ['regime_urbanistico', 'zots_bairros'];
    
    for (const tableName of tablesToCheck) {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ❌ ${tableName}: Erro ao verificar (${error.message})`);
      } else {
        console.log(`   📊 ${tableName}: ${count || 0} registros`);
      }
    }

    console.log('\n✅ Migração concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  }
}

// Executar
executeMigration();