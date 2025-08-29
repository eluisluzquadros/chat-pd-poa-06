import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

export const QATestCasesExportButton: React.FC = () => {
  const [exporting, setExporting] = useState(false);

  const exportToDocx = async () => {
    try {
      setExporting(true);
      const { data, error } = await supabase
        .from("qa_test_cases")
        .select("id, question, expected_answer, expected_sql, category, difficulty, tags, is_sql_related, version")
        .order("category", { ascending: true })
        .order("id", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info("Nenhum caso de teste encontrado");
        return;
      }

      // Group by category
      const byCategory: Record<string, any[]> = {};
      for (const row of data) {
        const cat = row.category || "Sem Categoria";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(row);
      }

      const sections: Paragraph[] = [];

      // Title
      sections.push(
        new Paragraph({
          heading: HeadingLevel.TITLE,
          children: [new TextRun({ text: "QA Test Cases Export", bold: true })],
        })
      );
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Exportado em: ${new Date().toLocaleString()}` }),
          ],
        })
      );

      // Content
      for (const [category, rows] of Object.entries(byCategory)) {
        sections.push(
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(category)] })
        );

        rows.forEach((r, idx) => {
          sections.push(
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(`#${r.id} – Caso ${idx + 1}`)] })
          );
          sections.push(
            new Paragraph({ children: [new TextRun({ text: "Pergunta:", bold: true })] })
          );
          sections.push(new Paragraph(r.question || ""));

          if (r.expected_answer) {
            sections.push(
              new Paragraph({ children: [new TextRun({ text: "Resposta Esperada:", bold: true })] })
            );
            sections.push(new Paragraph(r.expected_answer));
          }
          if (r.expected_sql) {
            sections.push(
              new Paragraph({ children: [new TextRun({ text: "SQL Esperado:", bold: true })] })
            );
            sections.push(new Paragraph(r.expected_sql));
          }

          const meta: string[] = [];
          if (r.difficulty) meta.push(`Dificuldade: ${r.difficulty}`);
          if (Array.isArray(r.tags) && r.tags.length) meta.push(`Tags: ${r.tags.join(", ")}`);
          if (r.is_sql_related) meta.push("Relacionado a SQL");
          if (r.version) meta.push(`Versão: ${r.version}`);
          if (meta.length) sections.push(new Paragraph(meta.join(" | ")));

          // Spacer
          sections.push(new Paragraph(" "));
        });
      }

      const doc = new Document({
        sections: [
          {
            children: sections,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QA-Test-Cases-${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("DOCX exportado com sucesso");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Falha ao exportar DOCX");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={exportToDocx} disabled={exporting}>
      {exporting ? "Exportando..." : "Exportar DOCX"}
    </Button>
  );
};
