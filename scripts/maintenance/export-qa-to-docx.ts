import { createClient } from '@supabase/supabase-js';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL não definido. Configure no .env.local');
  process.exit(1);
}
if (!SERVICE_ROLE) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definido. Configure no .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

interface QATestCaseRow {
  id: number;
  question: string | null;
  expected_answer: string;
  expected_keywords?: string[] | null;
  category: string;
  difficulty?: string | null;
  complexity?: string | null;
  is_active?: boolean | null;
  tags?: string[] | null;
  updated_at?: string | null;
}

async function fetchActiveQATestCases(): Promise<QATestCaseRow[]> {
  const { data, error } = await supabase
    .from('qa_test_cases')
    .select('id, question, expected_answer, expected_keywords, category, difficulty, complexity, is_active, tags, updated_at')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;
  return (data || []) as QATestCaseRow[];
}

function para(text: string, bold = false): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text, bold }),
    ],
  });
}

function labelValue(label: string, value?: string | null): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: value ?? '-' }),
    ],
  });
}

function arrayValue(label: string, arr?: string[] | null): Paragraph {
  const value = Array.isArray(arr) && arr.length ? arr.join(', ') : '-';
  return labelValue(label, value);
}

async function buildDocx(tests: QATestCaseRow[]): Promise<Buffer> {
  const byCategory = new Map<string, QATestCaseRow[]>();
  for (const t of tests) {
    const key = t.category || 'Sem Categoria';
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(t);
  }

  const now = new Date();
  const dateStr = now.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });

  const sections: any[] = [];

  // Capa
  sections.push({
    properties: {},
    children: [
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [new TextRun({ text: 'PDPOA 2025 – Casos de Teste (Exportados)', bold: true })],
      }),
      labelValue('Atualizado em', dateStr),
      labelValue('Total de casos ativos', String(tests.length)),
      para('Fonte dos dados: Tabela qa_test_cases no Supabase.'),
      new Paragraph(''),
    ],
  });

  // Conteúdo por categoria
  for (const [category, list] of byCategory) {
    sections.push({
      properties: {},
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: category, bold: true })] }),
      ],
    });

    list.forEach((t) => {
      sections.push({
        properties: {},
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: `Caso ${t.id}`, bold: true })] }),
          labelValue('Pergunta', t.question ?? ''),
          labelValue('Resposta esperada', t.expected_answer ?? ''),
          arrayValue('Palavras-chave esperadas', t.expected_keywords ?? undefined),
          labelValue('Dificuldade', t.difficulty ?? ''),
          labelValue('Complexidade', t.complexity ?? ''),
          arrayValue('Tags', t.tags ?? undefined),
          labelValue('Última atualização', t.updated_at ?? ''),
          new Paragraph(''),
        ],
      });
    });
  }

  const doc = new Document({
    sections,
    creator: 'Exportador QA – PDPOA',
    title: 'PDPOA2025-QA',
    description: 'Casos de teste QA exportados do Supabase',
  });

  return await Packer.toBuffer(doc);
}

async function main() {
  console.log('🔄 Buscando casos de teste ativos no Supabase...');
  const tests = await fetchActiveQATestCases();
  console.log(`✅ ${tests.length} casos encontrados.`);

  console.log('📝 Gerando documento DOCX...');
  const buffer = await buildDocx(tests);

  const outDir = path.resolve('knowledgebase');
  const outPath = path.join(outDir, 'PDPOA2025-QA.docx');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, buffer);

  console.log(`🎉 Documento salvo em: ${outPath}`);
  console.log('Próximo passo: reprocessar Somente QA via Admin > KB.');
}

main().catch((err) => {
  console.error('Erro ao exportar DOCX:', err);
  process.exit(1);
});
