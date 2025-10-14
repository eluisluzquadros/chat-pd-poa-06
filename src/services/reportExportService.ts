import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export class ReportExportService {
  /**
   * Exporta dados para CSV
   */
  async exportToCSV(data: any[], filename: string) {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  /**
   * Exporta dados para JSON
   */
  async exportToJSON(data: any, filename: string) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }

  /**
   * Exporta relatório para PDF
   */
  async exportToPDF(title: string, data: any[], columns: string[], filename: string) {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    // Data
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
    
    // Tabela
    autoTable(doc, {
      head: [columns],
      body: data,
      startY: 35,
    });
    
    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}

export const reportExportService = new ReportExportService();