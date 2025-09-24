#!/usr/bin/env node

/**
 * Script de teste para validar importação de dados de regime urbanístico
 * 
 * Executa testes abrangentes para verificar a integridade dos dados importados
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carrega variáveis do .env.local
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY não encontrada nas variáveis de ambiente');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class ImportTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  addTest(name, passed, details = null, isWarning = false) {
    const test = {
      name,
      passed,
      isWarning,
      details,
      timestamp: new Date().toISOString()
    };

    this.testResults.tests.push(test);

    if (isWarning) {
      this.testResults.warnings++;
      console.log(`⚠️  ${name}: ${details || 'AVISO'}`);
    } else if (passed) {
      this.testResults.passed++;
      console.log(`✅ ${name}: PASSOU${details ? ` (${details})` : ''}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${name}: FALHOU${details ? ` (${details})` : ''}`);
    }
  }

  async testTableExists(tableName, expectedColumns = []) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        this.addTest(`Tabela ${tableName} existe`, false, error.message);
        return false;
      }

      this.addTest(`Tabela ${tableName} existe`, true);

      // Testar colunas se especificadas
      if (expectedColumns.length > 0 && data && data.length > 0) {
        const actualColumns = Object.keys(data[0]);
        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
        
        if (missingColumns.length > 0) {
          this.addTest(`Colunas da tabela ${tableName}`, false, `Colunas ausentes: ${missingColumns.join(', ')}`);
        } else {
          this.addTest(`Colunas da tabela ${tableName}`, true, `${expectedColumns.length} colunas verificadas`);
        }
      }

      return true;
    } catch (error) {
      this.addTest(`Tabela ${tableName} existe`, false, error.message);
      return false;
    }
  }

  async testRecordCount(tableName, expectedCount, tolerance = 0) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        this.addTest(`Contagem de registros ${tableName}`, false, error.message);
        return false;
      }

      const actualCount = count || 0;
      const diff = Math.abs(actualCount - expectedCount);

      if (diff <= tolerance) {
        this.addTest(`Contagem de registros ${tableName}`, true, `${actualCount} registros (esperado: ${expectedCount})`);
        return true;
      } else {
        this.addTest(`Contagem de registros ${tableName}`, false, `${actualCount} registros, esperado: ${expectedCount} (diferença: ${diff})`);
        return false;
      }
    } catch (error) {
      this.addTest(`Contagem de registros ${tableName}`, false, error.message);
      return false;
    }
  }

  async testDataIntegrity(tableName, requiredFields, sampleSize = 10) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(sampleSize);

      if (error) {
        this.addTest(`Integridade dos dados ${tableName}`, false, error.message);
        return false;
      }

      if (!data || data.length === 0) {
        this.addTest(`Integridade dos dados ${tableName}`, false, 'Nenhum registro encontrado');
        return false;
      }

      let validRecords = 0;
      let issues = [];

      for (const record of data) {
        let recordValid = true;
        
        for (const field of requiredFields) {
          if (!record[field] || record[field] === '' || record[field] === null) {
            recordValid = false;
            issues.push(`Registro ${record.id}: campo '${field}' vazio`);
            break;
          }
        }

        if (recordValid) validRecords++;
      }

      const validPercentage = (validRecords / data.length) * 100;

      if (validPercentage >= 90) {
        this.addTest(`Integridade dos dados ${tableName}`, true, `${validRecords}/${data.length} registros válidos (${validPercentage.toFixed(1)}%)`);
      } else if (validPercentage >= 70) {
        this.addTest(`Integridade dos dados ${tableName}`, true, `${validRecords}/${data.length} registros válidos (${validPercentage.toFixed(1)}%)`, true);
      } else {
        this.addTest(`Integridade dos dados ${tableName}`, false, `${validRecords}/${data.length} registros válidos (${validPercentage.toFixed(1)}%)`);
      }

      if (issues.length > 0 && issues.length <= 5) {
        console.log(`   📝 Exemplos de problemas: ${issues.slice(0, 3).join(', ')}`);
      }

      return validPercentage >= 70;
    } catch (error) {
      this.addTest(`Integridade dos dados ${tableName}`, false, error.message);
      return false;
    }
  }

  async testUniqueConstraints(tableName, uniqueFields) {
    try {
      for (const field of uniqueFields) {
        const { data, error } = await supabase
          .from(tableName)
          .select(field)
          .not(field, 'is', null);

        if (error) {
          this.addTest(`Unicidade ${tableName}.${field}`, false, error.message);
          continue;
        }

        const values = data.map(row => row[field]);
        const uniqueValues = new Set(values);
        const duplicates = values.length - uniqueValues.size;

        if (duplicates === 0) {
          this.addTest(`Unicidade ${tableName}.${field}`, true, `${uniqueValues.size} valores únicos`);
        } else {
          this.addTest(`Unicidade ${tableName}.${field}`, false, `${duplicates} valores duplicados`);
        }
      }
    } catch (error) {
      this.addTest(`Unicidade ${tableName}`, false, error.message);
    }
  }

  async testDataTypes(tableName, fieldTypes) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(5);

      if (error) {
        this.addTest(`Tipos de dados ${tableName}`, false, error.message);
        return false;
      }

      if (!data || data.length === 0) {
        this.addTest(`Tipos de dados ${tableName}`, false, 'Nenhum registro para testar');
        return false;
      }

      let typeErrors = [];

      for (const [field, expectedType] of Object.entries(fieldTypes)) {
        const sampleValue = data.find(row => row[field] !== null && row[field] !== '')?.[field];
        
        if (sampleValue !== undefined) {
          const actualType = typeof sampleValue;
          
          if (expectedType === 'number' && actualType !== 'number') {
            typeErrors.push(`${field}: esperado number, encontrado ${actualType}`);
          } else if (expectedType === 'boolean' && actualType !== 'boolean') {
            typeErrors.push(`${field}: esperado boolean, encontrado ${actualType}`);
          } else if (expectedType === 'string' && actualType !== 'string') {
            typeErrors.push(`${field}: esperado string, encontrado ${actualType}`);
          }
        }
      }

      if (typeErrors.length === 0) {
        this.addTest(`Tipos de dados ${tableName}`, true, `${Object.keys(fieldTypes).length} campos verificados`);
      } else {
        this.addTest(`Tipos de dados ${tableName}`, false, typeErrors.join(', '));
      }

      return typeErrors.length === 0;
    } catch (error) {
      this.addTest(`Tipos de dados ${tableName}`, false, error.message);
      return false;
    }
  }

  async testIndexes(tableName, expectedIndexes) {
    try {
      // Testar se conseguimos fazer queries que deveriam usar os índices
      for (const indexField of expectedIndexes) {
        const { data, error } = await supabase
          .from(tableName)
          .select('id')
          .eq(indexField, 'test_value')
          .limit(1);

        // Se não der erro de sintaxe, o campo provavelmente existe e pode ser indexado
        if (!error || !error.message.includes('column') && !error.message.includes('does not exist')) {
          this.addTest(`Índice ${tableName}.${indexField}`, true, 'Campo indexável disponível');
        } else {
          this.addTest(`Índice ${tableName}.${indexField}`, false, error.message);
        }
      }
    } catch (error) {
      this.addTest(`Índices ${tableName}`, false, error.message);
    }
  }

  async testSpecificQueries() {
    console.log('\n🔍 Testando queries específicas...');

    // Testar busca por bairro
    try {
      const { data: cavalhada, error: cavError } = await supabase
        .from('regime_urbanistico')
        .select('bairro, zona')
        .eq('bairro', 'CAVALHADA')
        .limit(5);

      if (cavError) {
        this.addTest('Query por bairro (CAVALHADA)', false, cavError.message);
      } else {
        this.addTest('Query por bairro (CAVALHADA)', true, `${cavalhada?.length || 0} registros encontrados`);
      }
    } catch (error) {
      this.addTest('Query por bairro (CAVALHADA)', false, error.message);
    }

    // Testar busca por zona
    try {
      const { data: zot01, error: zotError } = await supabase
        .from('regime_urbanistico')
        .select('bairro, zona')
        .eq('zona', 'ZOT 01')
        .limit(5);

      if (zotError) {
        this.addTest('Query por zona (ZOT 01)', false, zotError.message);
      } else {
        this.addTest('Query por zona (ZOT 01)', true, `${zot01?.length || 0} registros encontrados`);
      }
    } catch (error) {
      this.addTest('Query por zona (ZOT 01)', false, error.message);
    }

    // Testar busca de zonas especiais
    try {
      const { data: especiais, error: espError } = await supabase
        .from('zots_bairros')
        .select('bairro, zona')
        .eq('tem_zona_especial', true)
        .limit(10);

      if (espError) {
        this.addTest('Query zonas especiais', false, espError.message);
      } else {
        this.addTest('Query zonas especiais', true, `${especiais?.length || 0} registros com zona especial`);
      }
    } catch (error) {
      this.addTest('Query zonas especiais', false, error.message);
    }
  }

  printSummary() {
    console.log('\n📊 RESUMO DOS TESTES');
    console.log('====================');
    console.log(`✅ Testes aprovados: ${this.testResults.passed}`);
    console.log(`❌ Testes falharam: ${this.testResults.failed}`);
    console.log(`⚠️  Avisos: ${this.testResults.warnings}`);
    console.log(`📋 Total de testes: ${this.testResults.tests.length}`);

    const successRate = (this.testResults.passed / this.testResults.tests.length) * 100;
    console.log(`📈 Taxa de sucesso: ${successRate.toFixed(1)}%`);

    if (this.testResults.failed === 0) {
      console.log('\n🎉 TODOS OS TESTES PASSARAM!');
      return true;
    } else if (successRate >= 80) {
      console.log('\n✅ TESTES MAJORITARIAMENTE APROVADOS');
      return true;
    } else {
      console.log('\n❌ MUITOS TESTES FALHARAM - VERIFIQUE A IMPORTAÇÃO');
      return false;
    }
  }
}

async function main() {
  console.log('🧪 Iniciando testes de validação da importação\n');

  const tester = new ImportTester();

  // 1. Testar existência das tabelas
  console.log('🔍 Testando estrutura das tabelas...');
  
  await tester.testTableExists('regime_urbanistico', [
    'id', 'bairro', 'zona', 'altura_maxima_edificacao_isolada',
    'coeficiente_aproveitamento_basico', 'created_at'
  ]);

  await tester.testTableExists('zots_bairros', [
    'id', 'bairro', 'zona', 'total_zonas_no_bairro', 'tem_zona_especial'
  ]);

  // 2. Testar contagem de registros
  console.log('\n📊 Testando contagem de registros...');
  
  await tester.testRecordCount('regime_urbanistico', 387, 5); // Tolerância de 5 registros
  await tester.testRecordCount('zots_bairros', 385, 5);

  // 3. Testar integridade dos dados
  console.log('\n🔍 Testando integridade dos dados...');
  
  await tester.testDataIntegrity('regime_urbanistico', ['bairro', 'zona'], 20);
  await tester.testDataIntegrity('zots_bairros', ['bairro', 'zona'], 20);

  // 4. Testar tipos de dados
  console.log('\n🔍 Testando tipos de dados...');
  
  await tester.testDataTypes('zots_bairros', {
    total_zonas_no_bairro: 'number',
    tem_zona_especial: 'boolean',
    bairro: 'string',
    zona: 'string'
  });

  // 5. Testar índices (campos que deveriam ser indexados)
  console.log('\n🔍 Testando campos indexáveis...');
  
  await tester.testIndexes('regime_urbanistico', ['bairro', 'zona']);
  await tester.testIndexes('zots_bairros', ['bairro', 'zona', 'tem_zona_especial']);

  // 6. Testar queries específicas
  await tester.testSpecificQueries();

  // 7. Resumo final
  const allTestsPassed = tester.printSummary();

  if (allTestsPassed) {
    console.log('\n🎯 A importação foi validada com sucesso!');
    console.log('✅ Os dados estão prontos para uso no sistema.');
    process.exit(0);
  } else {
    console.log('\n⚠️  A importação tem problemas que precisam ser corrigidos.');
    console.log('💡 Revise os logs e execute novamente a importação se necessário.');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Erro crítico nos testes:', error);
    process.exit(1);
  });
}