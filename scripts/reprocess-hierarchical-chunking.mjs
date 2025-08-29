#!/usr/bin/env node

/**
 * Script de Reprocessamento Hierárquico de Documentos Legais
 * Processa PDUS e LUOS com chunking hierárquico preservando contexto
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import mammoth from 'mammoth';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Padrões regex para estrutura legal brasileira
const PATTERNS = {
    lei: /LEI\s+(?:COMPLEMENTAR\s+)?N[º°]\s*(\d+(?:\.\d+)?)/gi,
    titulo: /TÍTULO\s+([IVXLCDM]+|\d+)\s*[-–]?\s*(.+)/gi,
    capitulo: /CAPÍTULO\s+([IVXLCDM]+|\d+)\s*[-–]?\s*(.+)/gi,
    secao: /SEÇÃO\s+([IVXLCDM]+|\d+)\s*[-–]?\s*(.+)/gi,
    subsecao: /SUBSEÇÃO\s+([IVXLCDM]+|\d+)\s*[-–]?\s*(.+)/gi,
    artigo: /Art\.\s*(\d+)[º°]?\s*[-–]?\s*/gi,
    paragrafo: /§\s*(\d+)[º°]?\s*/gi,
    inciso: /^([IVXLCDM]+|\d+)\s*[-–]\s*/gm,
    alinea: /^([a-z])\)\s*/gm
};

class HierarchicalLegalChunker {
    constructor() {
        this.chunks = [];
        this.stats = {
            total: 0,
            byLevel: {},
            embeddings: 0,
            errors: 0
        };
    }

    /**
     * Processa documento completo
     */
    async processDocument(filepath, docType) {
        console.log(chalk.cyan(`\n📚 Processando ${docType}...`));
        
        try {
            // Ler documento DOCX
            const buffer = await fs.readFile(filepath);
            const result = await mammoth.extractRawText({ buffer });
            const text = result.value;
            
            console.log(chalk.gray(`  Tamanho: ${(text.length / 1024).toFixed(1)} KB`));
            
            // Criar chunk raiz do documento
            const docChunk = await this.createChunk({
                level: 0,
                level_type: 'lei',
                title: docType,
                content: text.substring(0, 1000) + '...', // Resumo
                metadata: {
                    tipo_documento: docType,
                    total_caracteres: text.length,
                    data_processamento: new Date().toISOString()
                }
            });
            
            // Processar estrutura hierárquica
            await this.processHierarchy(text, docChunk);
            
            return this.chunks;
            
        } catch (error) {
            console.error(chalk.red(`Erro ao processar ${filepath}:`), error);
            this.stats.errors++;
            throw error;
        }
    }

    /**
     * Processa hierarquia do documento
     */
    async processHierarchy(text, parentChunk) {
        // Dividir por títulos
        const titulos = this.extractTitulos(text);
        
        for (const titulo of titulos) {
            const tituloChunk = await this.createChunk({
                level: 1,
                level_type: 'titulo',
                parent_id: parentChunk.id,
                numero_titulo: titulo.numero,
                title: `TÍTULO ${titulo.numero} - ${titulo.nome}`,
                content: titulo.texto.substring(0, 500) + '...',
                full_path: `${parentChunk.title} / TÍTULO ${titulo.numero}`
            });
            
            // Processar capítulos dentro do título
            const capitulos = this.extractCapitulos(titulo.texto);
            
            for (const capitulo of capitulos) {
                const capituloChunk = await this.createChunk({
                    level: 2,
                    level_type: 'capitulo',
                    parent_id: tituloChunk.id,
                    numero_capitulo: capitulo.numero,
                    title: `CAPÍTULO ${capitulo.numero} - ${capitulo.nome}`,
                    content: capitulo.texto.substring(0, 500) + '...',
                    full_path: `${tituloChunk.full_path} / CAPÍTULO ${capitulo.numero}`
                });
                
                // Processar seções
                const secoes = this.extractSecoes(capitulo.texto);
                
                for (const secao of secoes) {
                    await this.processSecao(secao, capituloChunk);
                }
                
                // Processar artigos diretamente no capítulo (sem seção)
                const artigosDirectos = this.extractArtigos(capitulo.texto);
                for (const artigo of artigosDirectos) {
                    await this.processArtigo(artigo, capituloChunk);
                }
            }
            
            // Processar artigos diretamente no título (sem capítulo)
            const artigosDirectos = this.extractArtigos(titulo.texto);
            for (const artigo of artigosDirectos) {
                await this.processArtigo(artigo, tituloChunk);
            }
        }
    }

    /**
     * Processa seção
     */
    async processSecao(secao, parentChunk) {
        const secaoChunk = await this.createChunk({
            level: 3,
            level_type: 'secao',
            parent_id: parentChunk.id,
            numero_secao: secao.numero,
            title: `SEÇÃO ${secao.numero} - ${secao.nome}`,
            content: secao.texto.substring(0, 500) + '...',
            full_path: `${parentChunk.full_path} / SEÇÃO ${secao.numero}`
        });
        
        // Processar artigos da seção
        const artigos = this.extractArtigos(secao.texto);
        
        for (const artigo of artigos) {
            await this.processArtigo(artigo, secaoChunk);
        }
    }

    /**
     * Processa artigo completo
     */
    async processArtigo(artigo, parentChunk) {
        // Criar chunk do artigo
        const artigoChunk = await this.createChunk({
            level: 5,
            level_type: 'artigo',
            parent_id: parentChunk.id,
            numero_artigo: artigo.numero,
            title: `Art. ${artigo.numero}`,
            content: artigo.texto,
            full_path: `${parentChunk.full_path} / Art. ${artigo.numero}`,
            metadata: {
                caput: artigo.caput,
                tem_paragrafos: artigo.paragrafos?.length > 0
            },
            generate_embedding: true // Sempre gerar embedding para artigos
        });
        
        // Processar parágrafos
        if (artigo.paragrafos) {
            for (const paragrafo of artigo.paragrafos) {
                await this.processParagrafo(paragrafo, artigoChunk);
            }
        }
        
        // Processar incisos diretos do artigo
        if (artigo.incisos) {
            for (const inciso of artigo.incisos) {
                await this.processInciso(inciso, artigoChunk);
            }
        }
    }

    /**
     * Processa parágrafo
     */
    async processParagrafo(paragrafo, parentChunk) {
        const paragrafoChunk = await this.createChunk({
            level: 6,
            level_type: 'paragrafo',
            parent_id: parentChunk.id,
            numero_paragrafo: paragrafo.numero,
            title: `§ ${paragrafo.numero}`,
            content: paragrafo.texto,
            full_path: `${parentChunk.full_path} / § ${paragrafo.numero}`,
            generate_embedding: paragrafo.texto.length > 100 // Embeddings para parágrafos relevantes
        });
        
        // Processar incisos do parágrafo
        if (paragrafo.incisos) {
            for (const inciso of paragrafo.incisos) {
                await this.processInciso(inciso, paragrafoChunk);
            }
        }
    }

    /**
     * Processa inciso
     */
    async processInciso(inciso, parentChunk) {
        // Só criar chunk se inciso for substancial
        if (inciso.texto.length > 50) {
            await this.createChunk({
                level: 7,
                level_type: 'inciso',
                parent_id: parentChunk.id,
                numero_inciso: inciso.numero,
                title: `Inciso ${inciso.numero}`,
                content: inciso.texto,
                full_path: `${parentChunk.full_path} / Inciso ${inciso.numero}`,
                generate_embedding: false // Geralmente não precisa de embedding
            });
        }
    }

    /**
     * Cria e armazena chunk
     */
    async createChunk(data) {
        const chunk = {
            id: this.generateId(),
            document_id: data.document_id || this.currentDocId,
            parent_chunk_id: data.parent_id || null,
            level: data.level,
            level_type: data.level_type,
            sequence_number: this.chunks.filter(c => c.parent_chunk_id === data.parent_id).length + 1,
            title: data.title,
            content: data.content,
            full_path: data.full_path || data.title,
            metadata: data.metadata || {},
            created_at: new Date().toISOString()
        };
        
        // Adicionar números específicos se disponíveis
        if (data.numero_artigo) chunk.numero_artigo = data.numero_artigo;
        if (data.numero_paragrafo) chunk.numero_paragrafo = data.numero_paragrafo;
        if (data.numero_secao) chunk.numero_secao = data.numero_secao;
        
        // Gerar embedding se necessário
        if (data.generate_embedding && data.content.length > 0) {
            try {
                chunk.embedding = await this.generateEmbedding(data.content);
                this.stats.embeddings++;
            } catch (error) {
                console.error(chalk.yellow(`  ⚠️ Erro ao gerar embedding: ${error.message}`));
            }
        }
        
        this.chunks.push(chunk);
        this.stats.total++;
        this.stats.byLevel[data.level_type] = (this.stats.byLevel[data.level_type] || 0) + 1;
        
        return chunk;
    }

    /**
     * Gera embedding usando OpenAI
     */
    async generateEmbedding(text) {
        try {
            const response = await openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: text.substring(0, 8000) // Limitar tamanho
            });
            return response.data[0].embedding;
        } catch (error) {
            console.error(chalk.red('Erro ao gerar embedding:'), error.message);
            return null;
        }
    }

    /**
     * Extrai títulos do texto
     */
    extractTitulos(text) {
        const titulos = [];
        const lines = text.split('\n');
        let currentTitulo = null;
        let currentText = [];
        
        for (const line of lines) {
            const tituloMatch = line.match(/TÍTULO\s+([IVXLCDM]+|\d+)\s*[-–]?\s*(.+)/i);
            
            if (tituloMatch) {
                // Salvar título anterior
                if (currentTitulo) {
                    currentTitulo.texto = currentText.join('\n');
                    titulos.push(currentTitulo);
                }
                
                // Iniciar novo título
                currentTitulo = {
                    numero: tituloMatch[1],
                    nome: tituloMatch[2].trim(),
                    texto: ''
                };
                currentText = [];
            } else if (currentTitulo) {
                currentText.push(line);
            }
        }
        
        // Salvar último título
        if (currentTitulo) {
            currentTitulo.texto = currentText.join('\n');
            titulos.push(currentTitulo);
        }
        
        return titulos;
    }

    /**
     * Extrai capítulos do texto
     */
    extractCapitulos(text) {
        const capitulos = [];
        const lines = text.split('\n');
        let currentCapitulo = null;
        let currentText = [];
        
        for (const line of lines) {
            const capituloMatch = line.match(/CAPÍTULO\s+([IVXLCDM]+|\d+)\s*[-–]?\s*(.+)/i);
            
            if (capituloMatch) {
                if (currentCapitulo) {
                    currentCapitulo.texto = currentText.join('\n');
                    capitulos.push(currentCapitulo);
                }
                
                currentCapitulo = {
                    numero: capituloMatch[1],
                    nome: capituloMatch[2].trim(),
                    texto: ''
                };
                currentText = [];
            } else if (currentCapitulo) {
                currentText.push(line);
            }
        }
        
        if (currentCapitulo) {
            currentCapitulo.texto = currentText.join('\n');
            capitulos.push(currentCapitulo);
        }
        
        return capitulos;
    }

    /**
     * Extrai seções do texto
     */
    extractSecoes(text) {
        const secoes = [];
        const lines = text.split('\n');
        let currentSecao = null;
        let currentText = [];
        
        for (const line of lines) {
            const secaoMatch = line.match(/SEÇÃO\s+([IVXLCDM]+|\d+)\s*[-–]?\s*(.+)/i);
            
            if (secaoMatch) {
                if (currentSecao) {
                    currentSecao.texto = currentText.join('\n');
                    secoes.push(currentSecao);
                }
                
                currentSecao = {
                    numero: secaoMatch[1],
                    nome: secaoMatch[2].trim(),
                    texto: ''
                };
                currentText = [];
            } else if (currentSecao) {
                currentText.push(line);
            }
        }
        
        if (currentSecao) {
            currentSecao.texto = currentText.join('\n');
            secoes.push(currentSecao);
        }
        
        return secoes;
    }

    /**
     * Extrai artigos do texto
     */
    extractArtigos(text) {
        const artigos = [];
        const lines = text.split('\n');
        let currentArtigo = null;
        let currentText = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const artigoMatch = line.match(/Art\.\s*(\d+)[º°]?\s*[-–]?\s*(.*)/i);
            
            if (artigoMatch) {
                if (currentArtigo) {
                    currentArtigo.texto = currentText.join('\n');
                    this.parseArtigoContent(currentArtigo);
                    artigos.push(currentArtigo);
                }
                
                currentArtigo = {
                    numero: parseInt(artigoMatch[1]),
                    caput: artigoMatch[2].trim() || lines[i + 1]?.trim(),
                    texto: '',
                    paragrafos: [],
                    incisos: []
                };
                currentText = [currentArtigo.caput];
                
                if (!artigoMatch[2] && lines[i + 1]) {
                    i++; // Pular próxima linha já capturada como caput
                }
            } else if (currentArtigo) {
                currentText.push(line);
            }
        }
        
        if (currentArtigo) {
            currentArtigo.texto = currentText.join('\n');
            this.parseArtigoContent(currentArtigo);
            artigos.push(currentArtigo);
        }
        
        return artigos;
    }

    /**
     * Parse do conteúdo interno do artigo
     */
    parseArtigoContent(artigo) {
        const lines = artigo.texto.split('\n');
        let currentParagrafo = null;
        
        for (const line of lines) {
            // Verificar se é parágrafo
            const paragrafoMatch = line.match(/§\s*(\d+)[º°]?\s*[-–]?\s*(.*)/);
            if (paragrafoMatch) {
                currentParagrafo = {
                    numero: parseInt(paragrafoMatch[1]),
                    texto: paragrafoMatch[2].trim(),
                    incisos: []
                };
                artigo.paragrafos.push(currentParagrafo);
                continue;
            }
            
            // Verificar se é inciso
            const incisoMatch = line.match(/^([IVXLCDM]+|\d+)\s*[-–]\s*(.*)/);
            if (incisoMatch) {
                const inciso = {
                    numero: incisoMatch[1],
                    texto: incisoMatch[2].trim()
                };
                
                if (currentParagrafo) {
                    currentParagrafo.incisos.push(inciso);
                } else {
                    artigo.incisos.push(inciso);
                }
            }
        }
    }

    /**
     * Gera ID único
     */
    generateId() {
        return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Salva chunks no banco de dados
     */
    async saveToDatabase() {
        console.log(chalk.cyan('\n💾 Salvando chunks no banco de dados...'));
        
        // Criar tabela se não existir
        await this.createTableIfNotExists();
        
        // Salvar em lotes
        const batchSize = 50;
        for (let i = 0; i < this.chunks.length; i += batchSize) {
            const batch = this.chunks.slice(i, i + batchSize);
            
            try {
                const { error } = await supabase
                    .from('legal_document_chunks')
                    .insert(batch);
                
                if (error) throw error;
                
                console.log(chalk.gray(`  Salvos ${i + batch.length}/${this.chunks.length} chunks`));
            } catch (error) {
                console.error(chalk.red(`Erro ao salvar batch ${i}:`), error);
            }
        }
        
        console.log(chalk.green('✅ Chunks salvos com sucesso!'));
    }

    /**
     * Cria tabela se não existir
     */
    async createTableIfNotExists() {
        const { error } = await supabase.rpc('create_legal_chunks_table_if_not_exists');
        if (error && !error.message.includes('already exists')) {
            console.error(chalk.red('Erro ao criar tabela:'), error);
        }
    }

    /**
     * Exibe estatísticas
     */
    showStats() {
        console.log(chalk.cyan('\n📊 Estatísticas do Processamento:'));
        console.log(chalk.white(`  Total de chunks: ${this.stats.total}`));
        console.log(chalk.white(`  Embeddings gerados: ${this.stats.embeddings}`));
        console.log(chalk.white(`  Erros: ${this.stats.errors}`));
        
        console.log(chalk.cyan('\n  Por nível:'));
        Object.entries(this.stats.byLevel).forEach(([level, count]) => {
            console.log(chalk.gray(`    ${level}: ${count}`));
        });
    }
}

// Função principal
async function main() {
    console.log(chalk.bold.cyan('\n🚀 REPROCESSAMENTO HIERÁRQUICO DE DOCUMENTOS LEGAIS\n'));
    
    const chunker = new HierarchicalLegalChunker();
    
    // Documentos a processar
    const documents = [
        {
            path: path.join(__dirname, '..', 'knowledgebase', 'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx'),
            type: 'PDUS - Plano Diretor Urbano Sustentável',
            id: 'pdus_2025'
        },
        {
            path: path.join(__dirname, '..', 'knowledgebase', 'PDPOA2025-Minuta_Preliminar_LUOS.docx'),
            type: 'LUOS - Lei de Uso e Ocupação do Solo',
            id: 'luos_2025'
        }
    ];
    
    // Processar cada documento
    for (const doc of documents) {
        try {
            // Verificar se arquivo existe
            await fs.access(doc.path);
            
            chunker.currentDocId = doc.id;
            const startTime = Date.now();
            
            await chunker.processDocument(doc.path, doc.type);
            
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(chalk.green(`  ✅ Processado em ${elapsed}s`));
            
        } catch (error) {
            console.error(chalk.red(`❌ Erro ao processar ${doc.type}:`), error.message);
        }
    }
    
    // Exibir estatísticas
    chunker.showStats();
    
    // Salvar no banco
    if (chunker.chunks.length > 0) {
        const saveResponse = await prompt(chalk.yellow('\n💾 Salvar chunks no banco de dados? (s/n): '));
        if (saveResponse.toLowerCase() === 's') {
            await chunker.saveToDatabase();
        }
    }
    
    console.log(chalk.bold.green('\n✨ Processamento concluído!\n'));
}

// Função auxiliar para prompt
async function prompt(question) {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise(resolve => {
        readline.question(question, answer => {
            readline.close();
            resolve(answer);
        });
    });
}

// Executar
main().catch(error => {
    console.error(chalk.red('\n❌ Erro fatal:'), error);
    process.exit(1);
});