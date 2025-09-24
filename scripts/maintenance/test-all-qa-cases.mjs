#\!/usr/bin/env node

/**
 * Script para testar automaticamente todos os casos de teste QA
 * Valida a nova base de conhecimento contra os 121 casos de teste
 */

import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class QATestRunner {
  constructor() {
    this.results = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      partial: 0,
      avgConfidence: 0,
      avgTime: 0,
      categories: {}
    };
  }

  calculateSimilarity(str1, str2) {
    if (\!str1 || \!str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    const keywords = ["zeis", "zot", "coeficiente", "altura", "outorga", "taxa", "ocupação", 
                     "aproveitamento", "básico", "máximo", "metros", "pavimentos"];
    
    let keywordMatches = 0;
    for (const keyword of keywords) {
      if (s1.includes(keyword) && s2.includes(keyword)) {
        keywordMatches++;
      }
    }
    
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w));
    const wordSimilarity = commonWords.length / Math.max(words1.length, words2.length);
    
    const keywordBonus = keywordMatches * 0.1;
    return Math.min(1, wordSimilarity + keywordBonus);
  }

  async runTest(testCase) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: testCase.question,
          sessionId: "qa-test",
          bypassCache: true
        })
      });

      const result = await response.json();
      const executionTime = Date.now() - startTime;
      
      const similarity = this.calculateSimilarity(result.response, testCase.expected_answer);
      const passed = similarity >= 0.6;
      
      return {
        id: testCase.id,
        question: testCase.question,
        category: testCase.category,
        status: passed ? "passed" : "failed",
        score: similarity,
        confidence: result.confidence || 0,
        executionTime
      };
      
    } catch (error) {
      return {
        id: testCase.id,
        question: testCase.question,
        category: testCase.category,
        status: "error",
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  async runAllTests(limit = 10) {
    console.log("🚀 === TESTE AUTOMÁTICO DE QA ===");
    console.log(`📅 ${new Date().toLocaleString("pt-BR")}\n`);
    
    const { data: testCases, error } = await supabase
      .from("qa_test_cases")
      .select("*")
      .limit(limit);
    
    if (error) {
      console.error("❌ Erro ao buscar casos de teste:", error);
      return;
    }
    
    console.log(`📝 ${testCases.length} casos de teste encontrados\n`);
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      process.stdout.write(`  ${i + 1}/${testCases.length} - ${testCase.question.substring(0, 40)}... `);
      
      const result = await this.runTest(testCase);
      this.results.push(result);
      
      this.stats.total++;
      if (result.status === "passed") {
        this.stats.passed++;
        process.stdout.write("✅\n");
      } else {
        this.stats.failed++;
        process.stdout.write("❌\n");
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  generateReport() {
    console.log("\n\n📊 === RELATÓRIO FINAL ===\n");
    
    const passRate = (this.stats.passed / this.stats.total) * 100;
    
    console.log(`Total de testes: ${this.stats.total}`);
    console.log(`✅ Passou: ${this.stats.passed} (${passRate.toFixed(1)}%)`);
    console.log(`❌ Falhou: ${this.stats.failed}`);
    
    if (passRate >= 80) {
      console.log("\n✅ EXCELENTE - Base de conhecimento está muito boa\!");
    } else if (passRate >= 60) {
      console.log("\n🟡 BOM - Base funcional mas precisa melhorias");
    } else {
      console.log("\n❌ CRÍTICO - Base precisa ser revista");
    }
  }
}

// Executar testes
async function main() {
  const runner = new QATestRunner();
  await runner.runAllTests(10); // Testar apenas 10 casos inicialmente
  runner.generateReport();
}

main().catch(console.error);
