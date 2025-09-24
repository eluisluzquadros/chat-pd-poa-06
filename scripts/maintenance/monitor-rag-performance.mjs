#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test queries for continuous monitoring
const testQueries = [
  { query: 'O que diz o artigo 75?', category: 'Artigos' },
  { query: 'Altura máxima em Petrópolis', category: 'Regime' },
  { query: 'Bairros com proteção contra enchentes', category: 'Proteção' },
  { query: 'O que é ZOT-08?', category: 'Zonas' },
  { query: 'O que é concessão urbanística?', category: 'Conceitos' }
];

class PerformanceMonitor {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
    this.testCount = 0;
    this.successCount = 0;
    this.totalResponseTime = 0;
    this.totalConfidence = 0;
  }

  async testQuery(query, category) {
    const spinner = ora(`Testing: ${query}`).start();
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: query,
          bypassCache: true
        })
      });

      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        spinner.fail(chalk.red(`HTTP ${response.status}`));
        this.results.push({
          query,
          category,
          success: false,
          responseTime,
          confidence: 0,
          error: `HTTP ${response.status}`
        });
        return;
      }

      const data = await response.json();
      
      const success = data.confidence >= 0.7 && data.response && data.response.length > 50;
      
      this.testCount++;
      if (success) this.successCount++;
      this.totalResponseTime += responseTime;
      this.totalConfidence += data.confidence || 0;
      
      this.results.push({
        query,
        category,
        success,
        responseTime,
        confidence: data.confidence || 0,
        responseLength: data.response ? data.response.length : 0,
        usingRAG: data.agentTrace && data.agentTrace.some(t => t.type === 'rag-pipeline')
      });
      
      if (success) {
        spinner.succeed(chalk.green(`✅ ${responseTime}ms | Conf: ${data.confidence}`));
      } else {
        spinner.warn(chalk.yellow(`⚠️ ${responseTime}ms | Conf: ${data.confidence}`));
      }
      
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
      this.results.push({
        query,
        category,
        success: false,
        responseTime: Date.now() - startTime,
        confidence: 0,
        error: error.message
      });
    }
  }

  async runContinuousTests() {
    console.clear();
    console.log(chalk.cyan.bold('🔍 RAG Performance Monitor\n'));
    
    let iteration = 0;
    
    while (true) {
      iteration++;
      console.log(chalk.blue(`\n📊 Test Iteration #${iteration} - ${new Date().toLocaleTimeString()}`));
      console.log('─'.repeat(60));
      
      // Run all test queries
      for (const test of testQueries) {
        await this.testQuery(test.query, test.category);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay between queries
      }
      
      // Display summary
      this.displaySummary();
      
      // Check system health
      await this.checkSystemHealth();
      
      // Wait before next iteration
      console.log(chalk.gray(`\n⏳ Next test in 60 seconds...`));
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute between iterations
    }
  }

  displaySummary() {
    const avgResponseTime = this.totalResponseTime / this.testCount;
    const avgConfidence = this.totalConfidence / this.testCount;
    const successRate = (this.successCount / this.testCount) * 100;
    
    const table = new Table({
      head: ['Metric', 'Value', 'Status'],
      colWidths: [25, 20, 15]
    });
    
    table.push(
      ['Success Rate', `${successRate.toFixed(1)}%`, this.getStatusBadge(successRate >= 80)],
      ['Avg Response Time', `${avgResponseTime.toFixed(0)}ms`, this.getStatusBadge(avgResponseTime < 3000)],
      ['Avg Confidence', avgConfidence.toFixed(2), this.getStatusBadge(avgConfidence >= 0.7)],
      ['Total Tests', this.testCount, '📊'],
      ['Uptime', this.getUptime(), '⏱️']
    );
    
    console.log('\n' + table.toString());
    
    // Category breakdown
    const categoryStats = {};
    this.results.forEach(r => {
      if (!categoryStats[r.category]) {
        categoryStats[r.category] = { total: 0, success: 0 };
      }
      categoryStats[r.category].total++;
      if (r.success) categoryStats[r.category].success++;
    });
    
    const catTable = new Table({
      head: ['Category', 'Success Rate', 'Tests'],
      colWidths: [20, 20, 15]
    });
    
    Object.entries(categoryStats).forEach(([cat, stats]) => {
      const rate = (stats.success / stats.total) * 100;
      catTable.push([
        cat,
        `${rate.toFixed(1)}%`,
        `${stats.success}/${stats.total}`
      ]);
    });
    
    console.log('\n📂 Category Performance:\n' + catTable.toString());
  }

  async checkSystemHealth() {
    console.log('\n🏥 System Health Check:');
    
    // Check database connection
    try {
      const { count } = await supabase
        .from('document_sections')
        .select('*', { count: 'exact', head: true });
      
      console.log(chalk.green(`✅ Database: Connected (${count} documents)`));
    } catch (error) {
      console.log(chalk.red(`❌ Database: Error - ${error.message}`));
    }
    
    // Check cache performance
    try {
      const { data: cacheData } = await supabase
        .from('query_cache')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
        .limit(100);
      
      const cacheHits = cacheData ? cacheData.length : 0;
      console.log(chalk.yellow(`⚡ Cache: ${cacheHits} hits in last hour`));
    } catch (error) {
      console.log(chalk.red(`❌ Cache: Error - ${error.message}`));
    }
    
    // Check recent errors
    const recentErrors = this.results.slice(-20).filter(r => !r.success).length;
    if (recentErrors > 5) {
      console.log(chalk.red(`⚠️ Alert: ${recentErrors} errors in last 20 tests`));
    } else {
      console.log(chalk.green(`✅ Error Rate: Normal (${recentErrors}/20)`));
    }
  }

  getStatusBadge(isGood) {
    return isGood ? chalk.green('✅') : chalk.red('❌');
  }

  getUptime() {
    const uptime = Date.now() - this.startTime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      totalTests: this.testCount,
      successRate: (this.successCount / this.testCount) * 100,
      avgResponseTime: this.totalResponseTime / this.testCount,
      avgConfidence: this.totalConfidence / this.testCount,
      results: this.results.slice(-100) // Last 100 results
    };
    
    // Save report to database
    try {
      await supabase.from('performance_reports').insert({
        report_data: report,
        created_at: new Date().toISOString()
      });
      console.log(chalk.green('📊 Report saved to database'));
    } catch (error) {
      console.log(chalk.yellow('⚠️ Could not save report:', error.message));
    }
    
    return report;
  }
}

// Main execution
async function main() {
  console.log(chalk.cyan.bold('🚀 Starting RAG Performance Monitor'));
  console.log(chalk.gray('Press Ctrl+C to stop monitoring\n'));
  
  const monitor = new PerformanceMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\n📊 Generating final report...'));
    const report = await monitor.generateReport();
    console.log(chalk.green('\nFinal Statistics:'));
    console.log(`- Total Tests: ${report.totalTests}`);
    console.log(`- Success Rate: ${report.successRate.toFixed(1)}%`);
    console.log(`- Avg Response Time: ${report.avgResponseTime.toFixed(0)}ms`);
    console.log(`- Avg Confidence: ${report.avgConfidence.toFixed(2)}`);
    console.log(`- Monitoring Duration: ${report.uptime}`);
    console.log(chalk.cyan('\n👋 Monitor stopped'));
    process.exit(0);
  });
  
  // Start continuous monitoring
  await monitor.runContinuousTests();
}

// Install missing dependencies
async function checkDependencies() {
  try {
    await import('cli-table3');
  } catch {
    console.log('Installing cli-table3...');
    const { exec } = await import('child_process');
    await new Promise((resolve) => {
      exec('npm install cli-table3', (error) => {
        if (error) console.error('Error installing:', error);
        resolve();
      });
    });
  }
}

// Run
checkDependencies().then(() => main()).catch(console.error);