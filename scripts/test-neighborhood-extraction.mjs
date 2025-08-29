#!/usr/bin/env node

/**
 * Test neighborhood extraction logic from agentic-rag
 */

import chalk from 'chalk';

function extractNeighborhoods(query) {
  const regimeSearchConditions = [];
  
  // Direct search
  regimeSearchConditions.push(`"Bairro".ilike.%${query}%`);
  regimeSearchConditions.push(`"Zona".ilike.%${query}%`);
  
  // Extract potential neighborhood names from query
  const neighborhoodPatterns = [
    /bairro\s+([^,\s]+(?:\s+[^,\s]+)*)/gi,  // "bairro XYZ"
    /no\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç\s]+)/gi, // "no Petrópolis"
    /(centro|petrópolis|jardim\s+são\s+pedro|restinga|agronomia|menino\s+deus|cidade\s+baixa|auxiliadora|moinhos\s+de\s+vento)/gi // Common neighborhoods
  ];
  
  const extractedNeighborhoods = [];
  
  for (const pattern of neighborhoodPatterns) {
    const matches = [...query.matchAll(pattern)];
    for (const match of matches) {
      const neighborhood = match[1] || match[0];
      if (neighborhood && neighborhood.length > 3) {
        // Add various normalizations
        const cleanNeighborhood = neighborhood.trim().toUpperCase()
          .replace(/PETROPOLIS/g, 'PETRÓPOLIS')
          .replace(/SAO/g, 'SÃO');
        
        extractedNeighborhoods.push(cleanNeighborhood);
        regimeSearchConditions.push(`"Bairro".ilike.%${cleanNeighborhood}%`);
        
        // Also try without accents
        const withoutAccents = cleanNeighborhood
          .replace(/PETRÓPOLIS/g, 'PETROPOLIS')
          .replace(/SÃO/g, 'SAO');
        
        if (withoutAccents !== cleanNeighborhood) {
          regimeSearchConditions.push(`"Bairro".ilike.%${withoutAccents}%`);
        }
      }
    }
  }
  
  return { extractedNeighborhoods, regimeSearchConditions };
}

// Test queries
const testQueries = [
  "altura máxima no bairro PETRÓPOLIS",
  "altura máxima no bairro Petrópolis", 
  "o que posso construir no bairro Petrópolis",
  "altura máxima PETRÓPOLIS",
  "regime urbanístico de PETRÓPOLIS",
  "altura máxima em Petrópolis",
  "bairro petropolis altura",
  "no Petrópolis qual altura máxima"
];

console.log(chalk.cyan.bold('\n🔍 TESTE DE EXTRAÇÃO DE BAIRROS\n'));

for (const query of testQueries) {
  console.log(chalk.blue(`Query: "${query}"`));
  const { extractedNeighborhoods, regimeSearchConditions } = extractNeighborhoods(query);
  
  if (extractedNeighborhoods.length > 0) {
    console.log(chalk.green(`✅ Bairros extraídos: ${extractedNeighborhoods.join(', ')}`));
    console.log(chalk.gray(`   Condições geradas: ${regimeSearchConditions.length}`));
    
    // Check if PETRÓPOLIS was found
    const foundPetropolis = regimeSearchConditions.some(c => 
      c.includes('PETRÓ') || c.includes('PETRO')
    );
    
    if (foundPetropolis) {
      console.log(chalk.green('   ✅ PETRÓPOLIS será buscado'));
    } else {
      console.log(chalk.red('   ❌ PETRÓPOLIS NÃO será buscado'));
    }
  } else {
    console.log(chalk.red('❌ Nenhum bairro extraído'));
    
    // Check if at least the direct search would work
    const directSearch = regimeSearchConditions.some(c => 
      c.includes('PETRÓ') || c.includes('PETRO')
    );
    
    if (directSearch) {
      console.log(chalk.yellow('   ⚠️ Mas busca direta encontraria'));
    }
  }
  
  console.log(chalk.gray('─'.repeat(60)));
}

console.log(chalk.cyan('\n📋 ANÁLISE:\n'));

// Check problematic patterns
const problematicQuery = "altura máxima no bairro PETRÓPOLIS";
console.log(chalk.yellow(`Testando query problemática: "${problematicQuery}"`));

// Test individual patterns
const patterns = [
  { name: 'Pattern 1 (bairro X)', pattern: /bairro\s+([^,\s]+(?:\s+[^,\s]+)*)/gi },
  { name: 'Pattern 2 (no X)', pattern: /no\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç\s]+)/gi },
  { name: 'Pattern 3 (hardcoded)', pattern: /(centro|petrópolis|jardim\s+são\s+pedro|restinga|agronomia|menino\s+deus|cidade\s+baixa|auxiliadora|moinhos\s+de\s+vento)/gi }
];

for (const { name, pattern } of patterns) {
  const matches = [...problematicQuery.matchAll(pattern)];
  if (matches.length > 0) {
    console.log(chalk.green(`✅ ${name}: Encontrou "${matches[0][1] || matches[0][0]}"`));
  } else {
    console.log(chalk.red(`❌ ${name}: Não encontrou`));
  }
}

// Test fix suggestion
console.log(chalk.cyan('\n💡 SUGESTÃO DE CORREÇÃO:\n'));

const improvedPattern = /bairro\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-Za-záàâãéêíóôõúç\s]*)/gi;
const matches = [...problematicQuery.matchAll(improvedPattern)];
if (matches.length > 0) {
  console.log(chalk.green(`✅ Pattern melhorado encontrou: "${matches[0][1]}"`));
} else {
  console.log(chalk.red('❌ Pattern melhorado também falhou'));
}