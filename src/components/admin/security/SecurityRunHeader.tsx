import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, Code, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SecurityRunHeaderProps {
  run: any;
  results: any[];
}

export function SecurityRunHeader({ run, results }: SecurityRunHeaderProps) {
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const handleExportPDF = () => {
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      let currentY = 20;

      // 1. Cabeçalho
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório de Validação de Segurança", 20, currentY);
      
      currentY += 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Sistema de Proteção contra Prompt Injection", 20, currentY);
      
      currentY += 15;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`ID da Execução: ${run.id}`, 20, currentY);
      currentY += 6;
      doc.text(`Versão do Sistema: ${run.system_version || 'v1.0'}`, 20, currentY);
      currentY += 6;
      doc.text(`Data de Execução: ${run.started_at ? format(new Date(run.started_at), "PPp", { locale: ptBR }) : 'N/A'}`, 20, currentY);
      currentY += 6;
      const duration = run.completed_at && run.started_at 
        ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
        : 'Em andamento';
      doc.text(`Duração: ${duration}`, 20, currentY);

      // 2. Score Geral e Métricas
      currentY += 15;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Score de Segurança Geral", 20, currentY);
      
      currentY += 10;
      doc.setFontSize(32);
      const scoreColor = run.overall_score >= 95 ? [34, 197, 94] : 
                        run.overall_score >= 85 ? [234, 179, 8] : [239, 68, 68];
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.text(`${run.overall_score ? run.overall_score.toFixed(1) : 0}%`, 105, currentY, { align: 'center' });
      
      currentY += 15;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);

      // Tabela de Métricas
      autoTable(doc, {
        startY: currentY,
        head: [['Métrica', 'Valor', 'Percentual']],
        body: [
          [
            'Testes Passados', 
            run.passed_tests || 0, 
            run.total_tests > 0 ? `${((run.passed_tests / run.total_tests) * 100).toFixed(1)}%` : '0%'
          ],
          [
            'Testes Falhados', 
            run.failed_tests || 0, 
            run.total_tests > 0 ? `${((run.failed_tests / run.total_tests) * 100).toFixed(1)}%` : '0%'
          ],
          [
            'Falhas Críticas', 
            run.critical_failures || 0, 
            'Severidade Alta'
          ],
          [
            'Tempo Médio por Teste', 
            run.total_tests > 0 
              ? `${Math.round((run.completed_at && run.started_at ? (new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / run.total_tests : 0))}ms`
              : '0ms',
            'Latência'
          ],
        ],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
      });

      // 3. Análise por Categoria
      doc.addPage();
      currentY = 20;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Análise por Categoria", 20, currentY);
      
      currentY += 10;
      
      const categoryStats = results.reduce((acc, result) => {
        if (!acc[result.category]) {
          acc[result.category] = { category: result.category, total: 0, passed: 0, failed: 0, critical: 0 };
        }
        acc[result.category].total++;
        if (result.result === 'PASSOU') acc[result.category].passed++;
        else if (result.result === 'FALHOU') {
          acc[result.category].failed++;
          if (result.severity === 'Alta') acc[result.category].critical++;
        }
        return acc;
      }, {} as Record<string, any>);

      const categoryData = Object.values(categoryStats).map((stat: any) => [
        stat.category,
        `${stat.passed}/${stat.total}`,
        `${((stat.passed / stat.total) * 100).toFixed(1)}%`,
        stat.critical,
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Categoria', 'Testes (Passou/Total)', 'Taxa de Sucesso', 'Falhas Críticas']],
        body: categoryData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
      });

      // 4. Matriz de Testes Detalhada
      doc.addPage();
      currentY = 20;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Matriz de Testes Detalhada", 20, currentY);
      
      currentY += 10;

      const testData = results.map(test => [
        test.test_number,
        test.test_name.substring(0, 35) + (test.test_name.length > 35 ? '...' : ''),
        test.category,
        test.severity,
        test.result,
        `${test.response_time_ms || 0}ms`,
        test.filter_triggered?.length || 0,
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Teste', 'Categoria', 'Sev.', 'Resultado', 'Tempo', 'Filtros']],
        body: testData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 60 },
          2: { cellWidth: 30 },
          3: { cellWidth: 15 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 },
          6: { cellWidth: 15 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            if (data.cell.text[0] === 'PASSOU') {
              data.cell.styles.textColor = [34, 197, 94];
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.text[0] === 'FALHOU') {
              data.cell.styles.textColor = [239, 68, 68];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });

      // 5. Rodapé em todas as páginas
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
        doc.text(
          `Gerado em: ${format(new Date(), "PPp", { locale: ptBR })}`,
          20,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          'Documento Confidencial',
          doc.internal.pageSize.width - 20,
          doc.internal.pageSize.height - 10,
          { align: 'right' }
        );
      }

      // Salvar PDF
      doc.save(`relatorio-seguranca-${run.id}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF. Tente exportar como JSON.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleExportJSON = () => {
    const data = JSON.stringify(run, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-validation-${run.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">
                Relatório de Validação de Segurança
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Sistema de Proteção contra Prompt Injection
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleExportPDF} 
              variant="outline" 
              className="gap-2"
              disabled={generatingPDF}
            >
              <FileDown className="h-4 w-4" />
              {generatingPDF ? "Gerando..." : "Exportar PDF"}
            </Button>
            <Button onClick={handleExportJSON} variant="outline" className="gap-2">
              <Code className="h-4 w-4" />
              Exportar JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">ID da Execução:</span>
            <p className="font-mono text-xs mt-1">{run.id}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Versão do Sistema:</span>
            <p className="mt-1">
              <Badge variant="outline">{run.system_version || 'v1.0'}</Badge>
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Data de Execução:</span>
            <p className="mt-1">
              {run.started_at && format(new Date(run.started_at), "PPp", { locale: ptBR })}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Duração:</span>
            <p className="mt-1">
              {run.completed_at && run.started_at 
                ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                : 'Em andamento'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
