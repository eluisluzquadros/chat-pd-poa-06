#!/usr/bin/env node

/**
 * APPLY REGIME URBANÍSTICO PATCH
 * Fixes the 80% failure rate by integrating the neighborhood-extractor module
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applyPatch() {
  console.log(chalk.bold.cyan('\n🔧 APPLYING REGIME URBANÍSTICO PATCH\n'));
  console.log(chalk.gray('=' .repeat(70)));
  
  const indexPath = path.join(__dirname, '..', 'supabase', 'functions', 'agentic-rag', 'index.ts');
  const backupPath = path.join(__dirname, '..', 'supabase', 'functions', 'agentic-rag', 'index.backup.ts');
  
  try {
    // Step 1: Create backup
    console.log(chalk.yellow('📋 Creating backup of index.ts...'));
    const originalContent = await fs.readFile(indexPath, 'utf8');
    await fs.writeFile(backupPath, originalContent);
    console.log(chalk.green('✅ Backup created: index.backup.ts'));
    
    // Step 2: Add import statement if not present
    console.log(chalk.yellow('\n📦 Adding neighborhood-extractor import...'));
    
    let content = originalContent;
    const importStatement = `import { 
  extractNeighborhoodFromQuery, 
  extractZOTFromQuery,
  buildOptimizedRegimeSearchConditions,
  buildRegimeFallbackSearch 
} from './neighborhood-extractor.ts';`;
    
    // Check if import already exists
    if (!content.includes('neighborhood-extractor')) {
      // Find the last import statement
      const lastImportIndex = content.lastIndexOf('import ');
      const lineEnd = content.indexOf('\n', lastImportIndex);
      
      // Insert our import after the last import
      content = content.slice(0, lineEnd + 1) + importStatement + '\n' + content.slice(lineEnd + 1);
      console.log(chalk.green('✅ Import statement added'));
    } else {
      console.log(chalk.blue('ℹ️ Import already exists'));
    }
    
    // Step 3: Replace the problematic regime search logic
    console.log(chalk.yellow('\n🔄 Replacing regime search logic...'));
    
    // Find the section to replace
    const startMarker = '// Search in regime_urbanistico_consolidado (structured urban planning data)';
    const endMarker = 'console.log(`🏗️ Found ${regimeData?.length || 0} regime urbanístico results`);';
    
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);
    
    if (startIndex === -1 || endIndex === -1) {
      throw new Error('Could not find the regime search section to replace');
    }
    
    // Find the actual end of the block (after the console.log)
    const actualEndIndex = content.indexOf('\n', endIndex) + 1;
    
    // New optimized code
    const newCode = `    // Search in regime_urbanistico_consolidado (structured urban planning data)
    console.log('🏗️ Searching regime urbanístico for:', query);
    
    // CRITICAL FIX: Use optimized extraction instead of searching with entire query
    const regimeSearchConditions = buildOptimizedRegimeSearchConditions(query);
    
    // Log what we're searching for debugging
    const extractedNeighborhood = extractNeighborhoodFromQuery(query);
    const extractedZOT = extractZOTFromQuery(query);
    
    if (extractedNeighborhood) {
      console.log(\`🏘️ Extracted neighborhood: \${extractedNeighborhood}\`);
    }
    if (extractedZOT) {
      console.log(\`📍 Extracted zone: \${extractedZOT}\`);
    }
    
    let regimeData = null;
    let regimeFallbackData = null;
    
    // Only search if we have valid conditions
    if (regimeSearchConditions.length > 0) {
      const { data: regimeResults } = await supabase
        .from('regime_urbanistico_consolidado')
        .select('*')
        .or(regimeSearchConditions.join(','))
        .limit(15);
      
      regimeData = regimeResults;
      console.log(\`🏗️ Found \${regimeData?.length || 0} regime urbanístico results\`);
    }
    
    // If no results from structured data, try REGIME_FALLBACK
    if ((!regimeData || regimeData.length === 0) && (extractedNeighborhood || extractedZOT)) {
      console.log('🔄 Trying REGIME_FALLBACK documents...');
      
      const fallbackKeywords = buildRegimeFallbackSearch(query);
      
      if (fallbackKeywords.length > 0) {
        const { data: fallbackResults } = await supabase
          .from('legal_articles')
          .select('*')
          .eq('document_type', 'REGIME_FALLBACK')
          .contains('keywords', fallbackKeywords)
          .limit(5);
        
        regimeFallbackData = fallbackResults;
        console.log(\`📦 Found \${regimeFallbackData?.length || 0} fallback results\`);
      }
    }
    
    // Combine regime data and fallback data for processing
    const allRegimeData = [
      ...(regimeData || []),
      ...(regimeFallbackData || [])
    ];
    
    console.log(\`🏗️ Total regime results: \${allRegimeData.length}\`);
`;
    
    // Replace the old code with the new code
    content = content.slice(0, startIndex) + newCode + content.slice(actualEndIndex);
    
    console.log(chalk.green('✅ Regime search logic replaced'));
    
    // Step 4: Update the reference to regimeData later in the code
    console.log(chalk.yellow('\n🔄 Updating regime data references...'));
    
    // Replace references to regimeData with allRegimeData where needed
    content = content.replace(
      /if \(regimeData && regimeData\.length > 0\) \{/g,
      'if (allRegimeData && allRegimeData.length > 0) {'
    );
    
    content = content.replace(
      /regimeRecordsFound = regimeData\.length;/g,
      'regimeRecordsFound = allRegimeData.length;'
    );
    
    content = content.replace(
      /regimeData \|\| \[\]/g,
      'allRegimeData || []'
    );
    
    console.log(chalk.green('✅ References updated'));
    
    // Step 5: Write the patched file
    console.log(chalk.yellow('\n💾 Writing patched file...'));
    await fs.writeFile(indexPath, content);
    console.log(chalk.green('✅ Patch applied successfully!'));
    
    // Step 6: Verify the patch
    console.log(chalk.yellow('\n🔍 Verifying patch...'));
    const patchedContent = await fs.readFile(indexPath, 'utf8');
    
    const checks = [
      { name: 'Import statement', test: patchedContent.includes('neighborhood-extractor') },
      { name: 'buildOptimizedRegimeSearchConditions', test: patchedContent.includes('buildOptimizedRegimeSearchConditions') },
      { name: 'extractNeighborhoodFromQuery', test: patchedContent.includes('extractNeighborhoodFromQuery') },
      { name: 'REGIME_FALLBACK handling', test: patchedContent.includes('REGIME_FALLBACK') },
      { name: 'allRegimeData variable', test: patchedContent.includes('allRegimeData') }
    ];
    
    let allPassed = true;
    for (const check of checks) {
      if (check.test) {
        console.log(chalk.green(`  ✅ ${check.name}`));
      } else {
        console.log(chalk.red(`  ❌ ${check.name}`));
        allPassed = false;
      }
    }
    
    if (allPassed) {
      console.log(chalk.bold.green('\n🎉 PATCH SUCCESSFULLY APPLIED!'));
      console.log(chalk.cyan('\nNext steps:'));
      console.log(chalk.gray('1. Deploy the Edge Function:'));
      console.log(chalk.white('   npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs'));
      console.log(chalk.gray('2. Run the 94-bairros test:'));
      console.log(chalk.white('   node scripts/test-94-bairros-complete.mjs'));
      console.log(chalk.gray('3. Validate QA test cases:'));
      console.log(chalk.white('   npm run test:qa'));
    } else {
      console.log(chalk.bold.red('\n⚠️ PATCH PARTIALLY APPLIED - Manual review needed'));
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error applying patch:'), error);
    
    // Try to restore backup if exists
    try {
      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
      if (backupExists) {
        console.log(chalk.yellow('\n🔄 Restoring from backup...'));
        const backup = await fs.readFile(backupPath, 'utf8');
        await fs.writeFile(indexPath, backup);
        console.log(chalk.green('✅ Backup restored'));
      }
    } catch (restoreError) {
      console.error(chalk.red('❌ Could not restore backup:'), restoreError);
    }
    
    process.exit(1);
  }
}

// Execute
applyPatch().catch(error => {
  console.error(chalk.red('❌ Fatal error:'), error);
  process.exit(1);
});