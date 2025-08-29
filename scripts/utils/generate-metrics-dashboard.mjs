#!/usr/bin/env node

/**
 * Script para gerar dashboard HTML com métricas do sistema
 * Cria visualização interativa dos resultados de validação
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar dados do último teste
function loadTestResults() {
  const reportsDir = path.join(__dirname, '..', 'test-reports');
  
  // Buscar arquivo mais recente
  const files = fs.readdirSync(reportsDir)
    .filter(f => f.startsWith('complete-121') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error('Nenhum relatório de teste encontrado');
  }
  
  const latestFile = path.join(reportsDir, files[0]);
  return JSON.parse(fs.readFileSync(latestFile, 'utf8'));
}

// Gerar HTML do dashboard
function generateDashboardHTML(data) {
  const successRate = data.summary.successRate || ((data.summary.passed / data.summary.total) * 100).toFixed(1);
  const avgTime = (data.summary.avgResponseTime / 1000).toFixed(2);
  
  // Preparar dados para gráficos
  const categoryData = Object.entries(data.byCategory || data.categories || {})
    .map(([name, stats]) => ({
      name,
      successRate: ((stats.passed / stats.total) * 100).toFixed(1),
      avgTime: ((stats.totalTime / stats.total) / 1000).toFixed(2),
      total: stats.total,
      passed: stats.passed
    }))
    .sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate));
  
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard de Métricas - Chat PD POA</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        
        .header .subtitle {
            color: #666;
            font-size: 1.1em;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            position: relative;
            overflow: hidden;
        }
        
        .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2);
        }
        
        .metric-card.success::before {
            background: #10b981;
        }
        
        .metric-card.warning::before {
            background: #f59e0b;
        }
        
        .metric-card.danger::before {
            background: #ef4444;
        }
        
        .metric-label {
            color: #999;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        
        .metric-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        
        .metric-change {
            color: #10b981;
            font-size: 0.9em;
        }
        
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .chart-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        
        .chart-title {
            font-size: 1.3em;
            color: #333;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .category-list {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        
        .category-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .category-item:last-child {
            border-bottom: none;
        }
        
        .category-name {
            font-weight: 500;
            color: #333;
        }
        
        .category-stats {
            display: flex;
            gap: 20px;
            align-items: center;
        }
        
        .badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
        }
        
        .badge.success {
            background: #d1fae5;
            color: #065f46;
        }
        
        .badge.warning {
            background: #fed7aa;
            color: #92400e;
        }
        
        .badge.danger {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .footer {
            text-align: center;
            color: white;
            margin-top: 40px;
            padding: 20px;
        }
        
        @media (max-width: 768px) {
            .charts-grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 1.8em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Dashboard de Métricas - Chat PD POA</h1>
            <div class="subtitle">Última atualização: ${new Date().toLocaleString('pt-BR')}</div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card ${successRate >= 95 ? 'success' : successRate >= 80 ? 'warning' : 'danger'}">
                <div class="metric-label">Taxa de Sucesso</div>
                <div class="metric-value">${successRate}%</div>
                <div class="metric-change">Meta: ≥95%</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Total de Testes</div>
                <div class="metric-value">${data.summary.total}</div>
                <div class="metric-change">${data.summary.passed} aprovados</div>
            </div>
            
            <div class="metric-card ${avgTime <= 5 ? 'success' : avgTime <= 10 ? 'warning' : 'danger'}">
                <div class="metric-label">Tempo Médio</div>
                <div class="metric-value">${avgTime}s</div>
                <div class="metric-change">Meta: <10s</div>
            </div>
            
            <div class="metric-card ${data.summary.failed === 0 ? 'success' : 'warning'}">
                <div class="metric-label">Falhas</div>
                <div class="metric-value">${data.summary.failed}</div>
                <div class="metric-change">${data.summary.failed === 0 ? 'Nenhuma falha' : 'Requer atenção'}</div>
            </div>
        </div>
        
        <div class="charts-grid">
            <div class="chart-card">
                <div class="chart-title">Taxa de Sucesso por Categoria</div>
                <canvas id="successChart"></canvas>
            </div>
            
            <div class="chart-card">
                <div class="chart-title">Tempo Médio por Categoria</div>
                <canvas id="timeChart"></canvas>
            </div>
        </div>
        
        <div class="category-list">
            <div class="chart-title">Detalhamento por Categoria</div>
            ${categoryData.map(cat => `
                <div class="category-item">
                    <div class="category-name">${cat.name}</div>
                    <div class="category-stats">
                        <span class="badge ${parseFloat(cat.successRate) >= 95 ? 'success' : parseFloat(cat.successRate) >= 80 ? 'warning' : 'danger'}">
                            ${cat.successRate}%
                        </span>
                        <span>${cat.passed}/${cat.total} testes</span>
                        <span>${cat.avgTime}s média</span>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="footer">
            <p>Sistema RAG - Chat PD POA © 2025</p>
            <p>Validação Automática v2.0.0</p>
        </div>
    </div>
    
    <script>
        // Dados para os gráficos
        const categories = ${JSON.stringify(categoryData.map(c => c.name))};
        const successRates = ${JSON.stringify(categoryData.map(c => parseFloat(c.successRate)))};
        const avgTimes = ${JSON.stringify(categoryData.map(c => parseFloat(c.avgTime)))};
        
        // Gráfico de Taxa de Sucesso
        const successCtx = document.getElementById('successChart').getContext('2d');
        new Chart(successCtx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Taxa de Sucesso (%)',
                    data: successRates,
                    backgroundColor: successRates.map(rate => 
                        rate >= 95 ? 'rgba(16, 185, 129, 0.8)' : 
                        rate >= 80 ? 'rgba(245, 158, 11, 0.8)' : 
                        'rgba(239, 68, 68, 0.8)'
                    ),
                    borderColor: successRates.map(rate => 
                        rate >= 95 ? 'rgb(16, 185, 129)' : 
                        rate >= 80 ? 'rgb(245, 158, 11)' : 
                        'rgb(239, 68, 68)'
                    ),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
        
        // Gráfico de Tempo Médio
        const timeCtx = document.getElementById('timeChart').getContext('2d');
        new Chart(timeCtx, {
            type: 'line',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Tempo Médio (s)',
                    data: avgTimes,
                    borderColor: 'rgb(102, 126, 234)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + 's';
                            }
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;
  
  return html;
}

// Função principal
async function generateDashboard() {
  console.log(chalk.cyan.bold('📊 Gerando Dashboard de Métricas\n'));
  
  try {
    // Carregar dados
    console.log('📁 Carregando dados do último teste...');
    const testData = loadTestResults();
    
    // Gerar HTML
    console.log('🎨 Gerando visualização...');
    const html = generateDashboardHTML(testData);
    
    // Salvar arquivo
    const outputPath = path.join(__dirname, '..', 'dashboard-metrics.html');
    fs.writeFileSync(outputPath, html);
    
    console.log(chalk.green(`\n✅ Dashboard gerado com sucesso!`));
    console.log(chalk.gray(`📁 Arquivo salvo em: ${outputPath}`));
    console.log(chalk.cyan(`\n🌐 Abra o arquivo no navegador para visualizar o dashboard`));
    
  } catch (error) {
    console.error(chalk.red('❌ Erro ao gerar dashboard:', error.message));
    process.exit(1);
  }
}

// Executar
generateDashboard();