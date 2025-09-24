#!/usr/bin/env node

/**
 * TESTE COM VALIDAÇÃO CONTRA GROUND TRUTH (DADOS REAIS DO BANCO)
 * Busca as respostas reais no banco e compara com as respostas do agentic-rag
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Buscar dados reais no banco para validação
 */
async function getGroundTruth() {
  console.log(chalk.cyan('🔍 Buscando dados reais (ground truth) no banco...\n'));
  
  const groundTruth = {};
  
  // 1. Buscar artigo 1 da LUOS
  const { data: art1Luos } = await supabase
    .from('legal_articles')
    .select('article_text, full_content')
    .eq('document_type', 'LUOS')
    .eq('article_number', 1)
    .single();
  
  groundTruth.artigo1Luos = art1Luos?.article_text || art1Luos?.full_content || null;
  console.log('✓ Artigo 1 LUOS:', groundTruth.artigo1Luos ? 'Encontrado' : 'NÃO ENCONTRADO');
  
  // 2. Buscar artigo 5 da LUOS
  const { data: art5Luos } = await supabase
    .from('legal_articles')
    .select('article_text, full_content')
    .eq('document_type', 'LUOS')
    .eq('article_number', 5)
    .single();
  
  groundTruth.artigo5Luos = art5Luos?.article_text || art5Luos?.full_content || null;
  console.log('✓ Artigo 5 LUOS:', groundTruth.artigo5Luos ? 'Encontrado' : 'NÃO ENCONTRADO');
  
  // 3. Buscar artigo 5 do PDUS
  const { data: art5Pdus } = await supabase
    .from('legal_articles')
    .select('article_text, full_content')
    .eq('document_type', 'PDUS')
    .eq('article_number', 5)
    .single();
  
  groundTruth.artigo5Pdus = art5Pdus?.article_text || art5Pdus?.full_content || null;
  console.log('✓ Artigo 5 PDUS:', groundTruth.artigo5Pdus ? 'Encontrado' : 'NÃO ENCONTRADO');
  
  // 4. Buscar dados de Petrópolis no regime urbanístico (COLUNA COM MAIÚSCULA!)
  const { data: petropolis } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*')
    .ilike('"Bairro"', '%PETRÓP%')
    .limit(5);
  
  groundTruth.petropolis = petropolis || [];
  console.log('✓ Dados Petrópolis:', petropolis?.length || 0, 'registros');
  
  // 5. Buscar dados do Aberta dos Morros (COLUNA COM MAIÚSCULA!)
  const { data: abertaMorros } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*')
    .ilike('"Bairro"', '%ABERTA%MORROS%')
    .limit(10);
  
  groundTruth.abertaMorros = abertaMorros || [];
  console.log('✓ Dados Aberta dos Morros:', abertaMorros?.length || 0, 'registros');
  
  // 6. Buscar dados do Centro Histórico (COLUNA COM MAIÚSCULA!)
  const { data: centroHistorico } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*')
    .ilike('"Bairro"', '%CENTRO%HIST%')
    .limit(10);
  
  groundTruth.centroHistorico = centroHistorico || [];
  console.log('✓ Dados Centro Histórico:', centroHistorico?.length || 0, 'registros');
  
  // 7. Buscar artigos sobre estacionamento
  const { data: estacionamento } = await supabase
    .from('legal_articles')
    .select('article_number, article_text, full_content')
    .or('article_text.ilike.%estacionamento%,full_content.ilike.%estacionamento%,keywords.cs.{estacionamento}')
    .limit(5);
  
  groundTruth.estacionamento = estacionamento || [];
  console.log('✓ Artigos estacionamento:', estacionamento?.length || 0, 'artigos');
  
  // 8. Buscar sobre áreas de preservação
  const { data: preservacao } = await supabase
    .from('legal_articles')
    .select('article_number, article_text, full_content')
    .or('article_text.ilike.%preservação%,full_content.ilike.%preservação%,keywords.cs.{preservação}')
    .limit(5);
  
  groundTruth.preservacao = preservacao || [];
  console.log('✓ Artigos preservação:', preservacao?.length || 0, 'artigos');
  
  // 9. Buscar títulos da LUOS (estrutura hierárquica)
  const { data: titulosLuos } = await supabase
    .from('legal_articles')
    .select('hierarchy_level, title')
    .eq('document_type', 'LUOS')
    .eq('hierarchy_level', 'title')
    .order('article_number');
  
  groundTruth.titulosLuos = titulosLuos || [];
  console.log('✓ Títulos LUOS:', titulosLuos?.length || 0, 'títulos');
  
  // 10. Buscar PDUS resumo (primeiros artigos)
  const { data: pdusInicio } = await supabase
    .from('legal_articles')
    .select('article_text, full_content')
    .eq('document_type', 'PDUS')
    .lte('article_number', 3)
    .order('article_number');
  
  groundTruth.pdusResumo = pdusInicio || [];
  console.log('✓ PDUS artigos iniciais:', pdusInicio?.length || 0, 'artigos');
  
  console.log(chalk.green('\n✅ Ground truth carregado!\n'));
  return groundTruth;
}

/**
 * Testes com validação contra ground truth
 */
function createTestCases(groundTruth) {
  return [
    {
      id: 1,
      question: "escreva um resumo de até 25 palavras sobre a lei do plano diretor de porto alegre",
      validate: (response) => {
        const r = response.toLowerCase();
        const wordCount = response.split(' ').filter(w => w.length > 0).length;
        const mencionaPlano = r.includes('plano diretor');
        const mencionaPortoAlegre = r.includes('porto alegre');
        const mencionaConceitos = r.includes('desenvolvimento') || r.includes('sustentável') || 
                                  r.includes('urbano') || r.includes('política');
        
        return {
          success: mencionaPlano && mencionaPortoAlegre && wordCount <= 35 && mencionaConceitos,
          details: {
            wordCount,
            mencionaPlano,
            mencionaPortoAlegre,
            mencionaConceitos
          },
          reason: !mencionaPlano ? 'Não menciona plano diretor' :
                  !mencionaPortoAlegre ? 'Não menciona Porto Alegre' :
                  wordCount > 35 ? `Muito longo: ${wordCount} palavras` :
                  !mencionaConceitos ? 'Não menciona conceitos-chave do PDUS' : 'OK'
        };
      }
    },
    {
      id: 2,
      question: "qual é a altura máxima e coef. básico e máx do aberta dos morros para cada zot",
      validate: (response) => {
        const r = response.toLowerCase();
        
        // Verificar se tem dados reais de Aberta dos Morros
        if (groundTruth.abertaMorros.length === 0) {
          return {
            success: false,
            details: { groundTruthMissing: true },
            reason: 'Sem dados de Aberta dos Morros no banco'
          };
        }
        
        // Pegar valores reais (USANDO NOMES CORRETOS DAS COLUNAS!)
        const zonas = [...new Set(groundTruth.abertaMorros.map(d => d.Zona))];
        let valoresReais = {};
        
        groundTruth.abertaMorros.forEach(d => {
          if (!valoresReais[d.Zona]) {
            valoresReais[d.Zona] = {
              altura: d.Altura_Maxima___Edificacao_Isolada,
              ca_basico: d.Coeficiente_de_Aproveitamento___Basico,
              ca_max: d.Coeficiente_de_Aproveitamento___Maximo
            };
          }
        });
        
        // Verificar se a resposta contém valores numéricos
        const temNumeros = /\d+/.test(response);
        const mencionaZonas = zonas.some(z => response.includes(z));
        const mencionaAltura = r.includes('altura') || r.includes('metro');
        const mencionaCoef = r.includes('coeficiente') || r.includes('ca ');
        
        // Verificar se algum valor real aparece na resposta
        let encontrouValorReal = false;
        for (const [zona, valores] of Object.entries(valoresReais)) {
          if (valores.altura && response.includes(valores.altura.toString())) {
            encontrouValorReal = true;
            break;
          }
        }
        
        return {
          success: temNumeros && mencionaAltura && mencionaCoef && (mencionaZonas || encontrouValorReal),
          details: {
            zonasEncontradas: zonas.length,
            valoresReais,
            temNumeros,
            mencionaZonas,
            encontrouValorReal
          },
          reason: !temNumeros ? 'Não fornece valores numéricos' :
                  !mencionaAltura ? 'Não menciona altura' :
                  !mencionaCoef ? 'Não menciona coeficientes' :
                  !mencionaZonas && !encontrouValorReal ? 'Não fornece dados específicos de zonas' : 'OK'
        };
      }
    },
    {
      id: 3,
      question: "artigo 1º da luos",
      validate: (response) => {
        if (!groundTruth.artigo1Luos) {
          return {
            success: false,
            details: { groundTruthMissing: true },
            reason: 'Artigo 1 LUOS não encontrado no banco'
          };
        }
        
        const r = response.toLowerCase();
        const gt = groundTruth.artigo1Luos.toLowerCase();
        
        // Verificar se contém parte substancial do texto real
        const contemTextoReal = gt.includes('fica instituída') && r.includes('fica instituída');
        const mencionaLuos = r.includes('luos') || r.includes('lei de uso e ocupação');
        const mencionaArtigo = r.includes('art. 1') || r.includes('artigo 1');
        
        return {
          success: contemTextoReal && mencionaLuos && mencionaArtigo,
          details: {
            groundTruthLength: groundTruth.artigo1Luos.length,
            responseLength: response.length,
            contemTextoReal
          },
          reason: !mencionaArtigo ? 'Não menciona artigo 1' :
                  !mencionaLuos ? 'Não menciona LUOS' :
                  !contemTextoReal ? 'Não contém o texto real do artigo' : 'OK'
        };
      }
    },
    {
      id: 4,
      question: "quais são os títulos da luos",
      validate: (response) => {
        const r = response.toLowerCase();
        
        // Se temos títulos no banco
        if (groundTruth.titulosLuos.length > 0) {
          const titulosReais = groundTruth.titulosLuos.map(t => t.title);
          const mencionaTitulos = titulosReais.some(t => r.includes(t.toLowerCase()));
          const listaMultiplos = (response.match(/título/gi) || []).length > 2;
          
          return {
            success: mencionaTitulos || listaMultiplos,
            details: {
              titulosNoBanco: groundTruth.titulosLuos.length,
              mencionaTitulos,
              listaMultiplos
            },
            reason: !mencionaTitulos && !listaMultiplos ? 
                    `Não lista os ${groundTruth.titulosLuos.length} títulos encontrados` : 'OK'
          };
        }
        
        // Fallback se não temos títulos no banco
        const mencionaTitulo = r.includes('título');
        const naoEncontrado = r.includes('não') && (r.includes('encontr') || r.includes('dispon'));
        
        return {
          success: mencionaTitulo && !naoEncontrado,
          details: { groundTruthMissing: true },
          reason: naoEncontrado ? 'Resposta indica que não encontrou' : 
                  !mencionaTitulo ? 'Não menciona títulos' : 'OK'
        };
      }
    },
    {
      id: 5,
      question: "artigo 5 da luos",
      validate: (response) => {
        if (!groundTruth.artigo5Luos) {
          return {
            success: false,
            details: { groundTruthMissing: true },
            reason: 'Artigo 5 LUOS não encontrado no banco'
          };
        }
        
        const r = response.toLowerCase();
        const gt = groundTruth.artigo5Luos.toLowerCase();
        
        // Verificar conteúdo específico do artigo 5
        const mencionaZoneamento = r.includes('zoneamento') && gt.includes('zoneamento');
        const mencionaLuos = r.includes('luos');
        const mencionaArtigo = r.includes('art. 5') || r.includes('artigo 5');
        
        return {
          success: mencionaArtigo && mencionaLuos && (mencionaZoneamento || response.length > 200),
          details: {
            groundTruthLength: groundTruth.artigo5Luos.length,
            responseLength: response.length,
            mencionaZoneamento
          },
          reason: !mencionaArtigo ? 'Não menciona artigo 5' :
                  !mencionaLuos ? 'Não menciona LUOS' :
                  !mencionaZoneamento && response.length < 200 ? 'Conteúdo insuficiente ou incorreto' : 'OK'
        };
      }
    },
    {
      id: 6,
      question: "artigo 5 do pdus",
      validate: (response) => {
        if (!groundTruth.artigo5Pdus) {
          return {
            success: false,
            details: { groundTruthMissing: true },
            reason: 'Artigo 5 PDUS não encontrado no banco'
          };
        }
        
        const r = response.toLowerCase();
        const mencionaPdus = r.includes('pdus') || r.includes('plano diretor');
        const mencionaArtigo = r.includes('art. 5') || r.includes('artigo 5');
        const temConteudo = response.length > 100;
        
        return {
          success: mencionaArtigo && mencionaPdus && temConteudo,
          details: {
            groundTruthLength: groundTruth.artigo5Pdus.length,
            responseLength: response.length
          },
          reason: !mencionaArtigo ? 'Não menciona artigo 5' :
                  !mencionaPdus ? 'Não menciona PDUS' :
                  !temConteudo ? 'Conteúdo insuficiente' : 'OK'
        };
      }
    },
    {
      id: 7,
      question: "conte-me sobre petrópolis",
      validate: (response) => {
        const r = response.toLowerCase();
        
        if (groundTruth.petropolis.length > 0) {
          const zonas = [...new Set(groundTruth.petropolis.map(d => d.Zona))]; // COLUNA COM MAIÚSCULA!
          const mencionaPetropolis = r.includes('petrópolis') || r.includes('petropolis');
          const mencionaZona = zonas.some(z => response.includes(z));
          const mencionaBairro = r.includes('bairro');
          
          return {
            success: mencionaPetropolis && (mencionaZona || mencionaBairro),
            details: {
              registrosEncontrados: groundTruth.petropolis.length,
              zonasEncontradas: zonas
            },
            reason: !mencionaPetropolis ? 'Não menciona Petrópolis' :
                    !mencionaZona && !mencionaBairro ? 'Não fornece informações sobre o bairro' : 'OK'
          };
        }
        
        return {
          success: false,
          details: { groundTruthMissing: true },
          reason: 'Dados de Petrópolis não encontrados no banco'
        };
      }
    },
    {
      id: 8,
      question: "qual a altura máxima em petrópolis",
      validate: (response) => {
        const r = response.toLowerCase();
        
        if (groundTruth.petropolis.length > 0) {
          // Pegar alturas reais (COLUNA COM MAIÚSCULA!)
          const alturas = groundTruth.petropolis.map(d => 
            d.Altura_Maxima___Edificacao_Isolada
          ).filter(a => a);
          
          const mencionaPetropolis = r.includes('petrópolis') || r.includes('petropolis');
          const mencionaAltura = r.includes('altura') || r.includes('metro');
          const temNumero = /\d+/.test(response);
          
          // Verificar se alguma altura real aparece na resposta
          const contemAlturaReal = alturas.some(a => response.includes(a.toString()));
          
          return {
            success: mencionaPetropolis && mencionaAltura && temNumero,
            details: {
              alturasReais: alturas,
              contemAlturaReal
            },
            reason: !mencionaPetropolis ? 'Não menciona Petrópolis' :
                    !mencionaAltura ? 'Não menciona altura' :
                    !temNumero ? 'Não fornece valor numérico' :
                    !contemAlturaReal ? 'Valor não corresponde aos dados reais' : 'OK'
          };
        }
        
        return {
          success: false,
          details: { groundTruthMissing: true },
          reason: 'Dados de altura de Petrópolis não encontrados'
        };
      }
    },
    {
      id: 9,
      question: "o que pode ser construído em petrópolis",
      validate: (response) => {
        const r = response.toLowerCase();
        const mencionaPetropolis = r.includes('petrópolis') || r.includes('petropolis');
        const mencionaUsos = r.includes('residencial') || r.includes('comercial') || 
                            r.includes('misto') || r.includes('uso') || r.includes('permitido');
        
        return {
          success: mencionaPetropolis && mencionaUsos,
          details: {
            dadosDisponiveis: groundTruth.petropolis.length > 0
          },
          reason: !mencionaPetropolis ? 'Não menciona Petrópolis' :
                  !mencionaUsos ? 'Não especifica usos permitidos' : 'OK'
        };
      }
    },
    {
      id: 10,
      question: "onde posso abrir um restaurante em porto alegre",
      validate: (response) => {
        const r = response.toLowerCase();
        const mencionaRestaurante = r.includes('restaurante');
        const mencionaZonas = r.includes('zona') || r.includes('zot') || r.includes('comercial');
        const mencionaLocais = r.includes('centro') || r.includes('bairro') || r.includes('área');
        
        return {
          success: mencionaRestaurante && (mencionaZonas || mencionaLocais),
          details: {},
          reason: !mencionaRestaurante ? 'Não menciona restaurante' :
                  !(mencionaZonas || mencionaLocais) ? 'Não indica locais permitidos' : 'OK'
        };
      }
    },
    {
      id: 11,
      question: "capítulo 1 da luos",
      validate: (response) => {
        const r = response.toLowerCase();
        const mencionaCapitulo = r.includes('capítulo') || r.includes('cap');
        const mencionaLuos = r.includes('luos');
        const temConteudo = response.length > 100;
        
        return {
          success: mencionaCapitulo && mencionaLuos && temConteudo,
          details: {
            responseLength: response.length
          },
          reason: !mencionaCapitulo ? 'Não menciona capítulo' :
                  !mencionaLuos ? 'Não menciona LUOS' :
                  !temConteudo ? 'Conteúdo insuficiente' : 'OK'
        };
      }
    },
    {
      id: 12,
      question: "artigo sobre estacionamento",
      validate: (response) => {
        const r = response.toLowerCase();
        const mencionaEstacionamento = r.includes('estacionamento') || r.includes('vaga');
        
        if (groundTruth.estacionamento.length > 0) {
          const artigos = groundTruth.estacionamento.map(e => e.article_number);
          const mencionaArtigo = artigos.some(a => response.includes(a.toString()));
          
          return {
            success: mencionaEstacionamento && (mencionaArtigo || r.includes('artigo')),
            details: {
              artigosEncontrados: artigos
            },
            reason: !mencionaEstacionamento ? 'Não menciona estacionamento' :
                    !mencionaArtigo && !r.includes('artigo') ? 'Não cita artigos específicos' : 'OK'
          };
        }
        
        return {
          success: mencionaEstacionamento && r.includes('artigo'),
          details: { groundTruthMissing: true },
          reason: !mencionaEstacionamento ? 'Não menciona estacionamento' : 'OK'
        };
      }
    },
    {
      id: 13,
      question: "normas sobre área de preservação",
      validate: (response) => {
        const r = response.toLowerCase();
        const mencionaPreservacao = r.includes('preservação') || r.includes('preservacao') || 
                                    r.includes('ambiental') || r.includes('app');
        
        if (groundTruth.preservacao.length > 0) {
          const temNormas = r.includes('artigo') || r.includes('proibido') || 
                           r.includes('permitido') || r.includes('restrição');
          
          return {
            success: mencionaPreservacao && temNormas,
            details: {
              artigosEncontrados: groundTruth.preservacao.length
            },
            reason: !mencionaPreservacao ? 'Não menciona preservação' :
                    !temNormas ? 'Não apresenta normas específicas' : 'OK'
          };
        }
        
        return {
          success: mencionaPreservacao,
          details: { groundTruthMissing: true },
          reason: !mencionaPreservacao ? 'Não menciona preservação' : 'OK'
        };
      }
    },
    {
      id: 14,
      question: "coeficiente de aproveitamento máximo no centro histórico",
      validate: (response) => {
        const r = response.toLowerCase();
        
        if (groundTruth.centroHistorico.length > 0) {
          const coeficientes = groundTruth.centroHistorico.map(d => 
            d.Coeficiente_de_Aproveitamento___Maximo // COLUNA COM MAIÚSCULA!
          ).filter(c => c);
          
          const mencionaCentro = r.includes('centro histórico') || r.includes('centro historico');
          const mencionaCoef = r.includes('coeficiente') || r.includes('ca ') || r.includes('aproveitamento');
          const temNumero = /\d+/.test(response) || /\d+[,\.]\d+/.test(response);
          
          return {
            success: mencionaCentro && mencionaCoef && temNumero,
            details: {
              coeficientesReais: coeficientes
            },
            reason: !mencionaCentro ? 'Não menciona centro histórico' :
                    !mencionaCoef ? 'Não menciona coeficiente' :
                    !temNumero ? 'Não fornece valor numérico' : 'OK'
          };
        }
        
        const mencionaCentro = r.includes('centro histórico') || r.includes('centro historico');
        const mencionaCoef = r.includes('coeficiente');
        
        return {
          success: mencionaCentro && mencionaCoef,
          details: { groundTruthMissing: true },
          reason: !mencionaCentro ? 'Não menciona centro histórico' :
                  !mencionaCoef ? 'Não menciona coeficiente' : 'OK'
        };
      }
    },
    {
      id: 15,
      question: "quais os instrumentos do plano diretor",
      validate: (response) => {
        const r = response.toLowerCase();
        const mencionaInstrumentos = r.includes('instrumento');
        const mencionaPlano = r.includes('plano diretor') || r.includes('pdus');
        
        // Instrumentos típicos do plano diretor
        const instrumentosComuns = [
          'outorga', 'transferência', 'operação', 'estudo de impacto',
          'parcelamento', 'zoneamento', 'iptu progressivo', 'consórcio'
        ];
        
        const mencionaAlgumInstrumento = instrumentosComuns.some(i => r.includes(i));
        
        return {
          success: mencionaInstrumentos && mencionaPlano && mencionaAlgumInstrumento,
          details: {},
          reason: !mencionaInstrumentos ? 'Não menciona instrumentos' :
                  !mencionaPlano ? 'Não menciona plano diretor' :
                  !mencionaAlgumInstrumento ? 'Não lista instrumentos específicos' : 'OK'
        };
      }
    }
  ];
}

/**
 * Executar teste com validação ground truth
 */
async function runGroundTruthValidation() {
  console.log(chalk.bold.cyan('\n🧪 VALIDAÇÃO COM GROUND TRUTH (DADOS REAIS DO BANCO)\n'));
  console.log(chalk.gray('=' .repeat(70)));

  // Carregar ground truth
  const groundTruth = await getGroundTruth();
  
  // Criar casos de teste com ground truth
  const testCases = createTestCases(groundTruth);
  
  const results = [];
  let successCount = 0;
  let totalResponseTime = 0;

  for (const testCase of testCases) {
    console.log(chalk.bold.blue(`\n📝 Teste ${testCase.id}/15:`));
    console.log(chalk.cyan(`Pergunta: "${testCase.question}"`));
    
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message: testCase.question,
          conversation_id: `test_${Date.now()}_${testCase.id}`,
          user_id: 'validation_user'
        }
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        console.log(chalk.red(`❌ ERRO NA API: ${error.message}`));
        results.push({
          id: testCase.id,
          question: testCase.question,
          success: false,
          error: error.message,
          response: null,
          responseTime
        });
        continue;
      }

      const response = data?.response || 'Resposta vazia';
      const validation = testCase.validate(response);
      
      if (validation.success) {
        console.log(chalk.green(`✅ PASSOU: ${validation.reason}`));
        successCount++;
      } else {
        console.log(chalk.red(`❌ FALHOU: ${validation.reason}`));
      }
      
      // Mostrar detalhes do ground truth se disponível
      if (validation.details) {
        if (validation.details.groundTruthMissing) {
          console.log(chalk.yellow(`⚠️  Ground truth não disponível`));
        } else if (validation.details.valoresReais) {
          console.log(chalk.gray(`📊 Valores reais no banco:`));
          Object.entries(validation.details.valoresReais).forEach(([zona, valores]) => {
            console.log(chalk.gray(`   ${zona}: Altura ${valores.altura}m, CA ${valores.ca_basico}-${valores.ca_max}`));
          });
        } else if (validation.details.alturasReais) {
          console.log(chalk.gray(`📊 Alturas reais: ${validation.details.alturasReais.join(', ')}m`));
        } else if (validation.details.coeficientesReais) {
          console.log(chalk.gray(`📊 Coeficientes reais: ${validation.details.coeficientesReais.join(', ')}`));
        }
      }
      
      console.log(chalk.gray(`⏱️  Tempo: ${responseTime}ms`));
      console.log(chalk.gray(`📄 Resposta: ${response.substring(0, 150)}...`));
      
      results.push({
        id: testCase.id,
        question: testCase.question,
        success: validation.success,
        reason: validation.reason,
        details: validation.details,
        response: response,
        responseTime
      });
      
      totalResponseTime += responseTime;
      
    } catch (error) {
      console.log(chalk.red(`❌ ERRO DE CONEXÃO: ${error.message}`));
      results.push({
        id: testCase.id,
        question: testCase.question,
        success: false,
        error: error.message,
        response: null,
        responseTime: Date.now() - startTime
      });
    }
    
    // Pausa entre testes
    if (testCase.id < testCases.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Relatório final
  const successRate = (successCount / testCases.length) * 100;
  const avgResponseTime = totalResponseTime / testCases.length;
  
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📊 RELATÓRIO FINAL - VALIDAÇÃO COM GROUND TRUTH'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.bold.white(`\n📈 ESTATÍSTICAS:`));
  console.log(`  ✅ Testes aprovados: ${successCount}/${testCases.length}`);
  console.log(`  ❌ Testes reprovados: ${testCases.length - successCount}/${testCases.length}`);
  console.log(`  📊 Taxa de sucesso: ${successRate.toFixed(1)}%`);
  console.log(`  ⏱️  Tempo médio de resposta: ${avgResponseTime.toFixed(0)}ms`);
  
  // Ground truth coverage
  const groundTruthMissing = results.filter(r => r.details?.groundTruthMissing).length;
  if (groundTruthMissing > 0) {
    console.log(chalk.yellow(`  ⚠️  Testes sem ground truth: ${groundTruthMissing}`));
  }
  
  // Listar falhas críticas
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log(chalk.bold.yellow(`\n⚠️ TESTES QUE FALHARAM:`));
    failures.forEach(f => {
      console.log(chalk.red(`  ${f.id}. "${f.question}"`));
      console.log(chalk.yellow(`     Motivo: ${f.reason || f.error}`));
      if (f.details && !f.details.groundTruthMissing) {
        if (f.details.valoresReais) {
          console.log(chalk.gray(`     Esperado: valores específicos por zona`));
        }
      }
    });
  }
  
  // Avaliação final
  console.log(chalk.bold.white(`\n🎯 AVALIAÇÃO FINAL:`));
  if (successRate >= 90) {
    console.log(chalk.bold.green(`  🏆 EXCELENTE! Sistema está retornando dados corretos.`));
  } else if (successRate >= 70) {
    console.log(chalk.bold.green(`  ✅ BOM! Sistema funcional com algumas inconsistências.`));
  } else if (successRate >= 50) {
    console.log(chalk.bold.yellow(`  ⚠️ REGULAR! Sistema precisa melhorar precisão das respostas.`));
  } else {
    console.log(chalk.bold.red(`  ❌ CRÍTICO! Sistema não está retornando dados corretos do banco.`));
  }
  
  console.log(chalk.bold.cyan(`\n✅ VALIDAÇÃO COM GROUND TRUTH CONCLUÍDA!\n`));
  
  return {
    success_rate: successRate,
    successful_tests: successCount,
    total_tests: testCases.length,
    results: results
  };
}

// Executar
runGroundTruthValidation().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});