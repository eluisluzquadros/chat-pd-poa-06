#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: SUPABASE_ANON_KEY not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Statistics
const stats = {
  total: 0,
  new: 0,
  updated: 0,
  unchanged: 0,
  errors: 0
};

async function readAndValidateCSV(filePath) {
  console.log('📖 Reading CSV file...');
  
  const csvContent = fs.readFileSync(filePath, 'utf-8');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // Handle UTF-8 BOM
    relax_column_count: true
  });

  console.log(`✅ Successfully parsed ${records.length} records from CSV`);
  
  // Validate structure
  const requiredColumns = ['Bairro', 'Zona'];
  const firstRecord = records[0];
  const missingColumns = requiredColumns.filter(col => !(col in firstRecord));
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  return records;
}

async function getCurrentData() {
  console.log('📊 Fetching current database records...');
  
  const { data, error } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*');

  if (error) {
    throw new Error(`Error fetching current data: ${error.message}`);
  }

  console.log(`✅ Found ${data.length} records in database`);
  return data;
}

function normalizeValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return value;
}

function recordsAreEqual(record1, record2) {
  const keys = Object.keys(record1).filter(key => key !== 'created_at' && key !== 'updated_at');
  
  for (const key of keys) {
    const val1 = normalizeValue(record1[key]);
    const val2 = normalizeValue(record2[key]);
    
    if (val1 !== val2) {
      return false;
    }
  }
  
  return true;
}

async function upsertRecord(record, currentData) {
  const existing = currentData.find(
    r => normalizeValue(r.Bairro) === normalizeValue(record.Bairro) && 
         normalizeValue(r.Zona) === normalizeValue(record.Zona)
  );

  // Normalize all values in the record
  const normalizedRecord = {};
  for (const [key, value] of Object.entries(record)) {
    normalizedRecord[key] = normalizeValue(value);
  }

  try {
    if (existing) {
      // Check if data actually changed
      if (recordsAreEqual(existing, normalizedRecord)) {
        stats.unchanged++;
        return { status: 'unchanged', bairro: record.Bairro, zona: record.Zona };
      }

      // Update existing record
      const { error } = await supabase
        .from('regime_urbanistico_consolidado')
        .update(normalizedRecord)
        .eq('Bairro', record.Bairro)
        .eq('Zona', record.Zona);

      if (error) throw error;
      
      stats.updated++;
      return { status: 'updated', bairro: record.Bairro, zona: record.Zona };
    } else {
      // Insert new record
      const { error } = await supabase
        .from('regime_urbanistico_consolidado')
        .insert(normalizedRecord);

      if (error) throw error;
      
      stats.new++;
      return { status: 'new', bairro: record.Bairro, zona: record.Zona };
    }
  } catch (error) {
    stats.errors++;
    console.error(`❌ Error processing ${record.Bairro} - ${record.Zona}:`, error.message);
    return { status: 'error', bairro: record.Bairro, zona: record.Zona, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting Regime Urbanístico 2025 Update\n');
  
  try {
    // 1. Read and validate CSV
    const csvPath = path.join(__dirname, '../data/regime-urbanistico-2025.csv');
    const csvRecords = await readAndValidateCSV(csvPath);
    stats.total = csvRecords.length;

    // 2. Get current database state
    const currentData = await getCurrentData();

    // 3. Process records
    console.log('\n📝 Processing records...\n');
    const results = [];
    
    for (let i = 0; i < csvRecords.length; i++) {
      const record = csvRecords[i];
      const result = await upsertRecord(record, currentData);
      results.push(result);
      
      if ((i + 1) % 50 === 0) {
        console.log(`Progress: ${i + 1}/${csvRecords.length} records processed`);
      }
    }

    // 4. Generate report
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total records in CSV: ${stats.total}`);
    console.log(`New records created: ${stats.new}`);
    console.log(`Records updated: ${stats.updated}`);
    console.log(`Records unchanged: ${stats.unchanged}`);
    console.log(`Errors: ${stats.errors}`);
    console.log('='.repeat(60));

    // 5. Verify final count
    const { count, error: countError } = await supabase
      .from('regime_urbanistico_consolidado')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error getting final count:', countError);
    } else {
      console.log(`\n✅ Final database count: ${count} records`);
      
      if (count !== stats.total) {
        console.warn(`⚠️  Warning: Final count (${count}) differs from CSV total (${stats.total})`);
      }
    }

    // 6. Show detailed changes if any
    if (stats.new > 0) {
      console.log('\n📌 New records:');
      results.filter(r => r.status === 'new').forEach(r => {
        console.log(`  - ${r.bairro} / ${r.zona}`);
      });
    }

    if (stats.updated > 0) {
      console.log('\n🔄 Updated records:');
      results.filter(r => r.status === 'updated').slice(0, 10).forEach(r => {
        console.log(`  - ${r.bairro} / ${r.zona}`);
      });
      if (stats.updated > 10) {
        console.log(`  ... and ${stats.updated - 10} more`);
      }
    }

    if (stats.errors > 0) {
      console.log('\n❌ Errors:');
      results.filter(r => r.status === 'error').forEach(r => {
        console.log(`  - ${r.bairro} / ${r.zona}: ${r.error}`);
      });
    }

    console.log('\n✅ Import completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error during import:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
