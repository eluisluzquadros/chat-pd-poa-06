import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

interface ExportReportPDFProps {
  report: any;
}

export function ExportReportPDF({ report }: ExportReportPDFProps) {
  const handleExport = () => {
    const doc = new jsPDF();
    let yPos = 20;
    
    // Header
    doc.setFontSize(20);
    doc.text('RELATÓRIO FORENSE DE SEGURANÇA', 105, yPos, { align: 'center' });
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(200, 0, 0);
    doc.text('CONFIDENCIAL - USO RESTRITO', 105, yPos, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPos += 15;
    
    // Metadata
    doc.setFontSize(11);
    doc.text(`Report ID: ${report.report_metadata.report_id}`, 20, yPos);
    yPos += 7;
    doc.text(`Gerado em: ${new Date(report.report_metadata.generated_at).toLocaleString('pt-BR')}`, 20, yPos);
    yPos += 7;
    doc.text(`Gerado por: ${report.report_metadata.generated_by}`, 20, yPos);
    yPos += 12;
    
    // Classificação do Incidente
    doc.setFontSize(14);
    doc.text('CLASSIFICAÇÃO DO INCIDENTE', 20, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Campo', 'Valor']],
      body: [
        ['Tipo de Incidente', report.incident_classification.incident_type],
        ['Severidade', report.incident_classification.severity.toUpperCase()],
        ['Status', report.incident_classification.status],
        ['Confiança', `${(report.incident_classification.confidence_score * 100).toFixed(0)}%`],
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 53, 69] }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Perfil do Atacante
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.text('PERFIL DO ATACANTE', 20, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Campo', 'Valor']],
      body: [
        ['Nome Completo', report.attacker_profile.full_name],
        ['Email', report.attacker_profile.email],
        ['User ID', report.attacker_profile.user_id],
        ['Role', report.attacker_profile.role],
        ['IP Address', report.attacker_profile.ip_address],
        ['Tipo de Dispositivo', report.attacker_profile.device_info?.device_type || 'N/A'],
        ['Navegador', report.attacker_profile.device_info?.browser || 'N/A'],
        ['Sistema Operacional', report.attacker_profile.device_info?.os || 'N/A'],
        ['Conta Criada em', new Date(report.attacker_profile.account_created).toLocaleString('pt-BR')],
        ['Status da Conta', report.attacker_profile.account_status],
        ['Total de Sessões', report.attacker_profile.total_sessions],
        ['Total de Mensagens', report.attacker_profile.total_messages],
      ],
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [40, 167, 69] }
    });
    
    // Detalhes do Ataque
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.text('DETALHES DO ATAQUE', 20, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Campo', 'Valor']],
      body: [
        ['Sessão ID', report.attack_details.session_id],
        ['Timestamp', new Date(report.attack_details.attack_timestamp).toLocaleString('pt-BR')],
        ['Título da Sessão', report.attack_details.session_title],
        ['Última Atividade', new Date(report.attack_details.last_activity).toLocaleString('pt-BR')],
        ['IP Address', report.attack_details.ip_address],
        ['Técnica', report.attack_details.technique],
        ['Objetivo', report.attack_details.objective],
        ['Alvo', report.attack_details.target],
        ['Vetor de Ataque', report.attack_details.attack_vector],
      ],
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 193, 7] }
    });
    
    // Indicadores de Ameaça
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.text('INDICADORES DE AMEAÇA', 20, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Indicador', 'Status']],
      body: [
        ['Prompt Injection Detectado', report.threat_indicators.prompt_injection_detected ? '✓ SIM' : '✗ NÃO'],
        ['Sentimento Negativo', report.threat_indicators.negative_sentiment_detected ? '✓ SIM' : '✗ NÃO'],
        ['Múltiplas Falhas de Auth', report.threat_indicators.multiple_failed_auth ? '✓ SIM' : '✗ NÃO'],
        ['Conta Desativada', report.threat_indicators.account_deactivated ? '✓ SIM' : '✗ NÃO'],
        ['Threat Score', report.threat_indicators.threat_score],
        ['Threat Level', report.threat_indicators.threat_level],
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 53, 69] }
    });
    
    // Evidências Técnicas - Mensagens Maliciosas
    if (report.technical_evidence?.malicious_messages?.length > 0) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(14);
      doc.text('EVIDÊNCIAS TÉCNICAS', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(12);
      doc.text('Mensagem Maliciosa Detectada:', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      const splitText = doc.splitTextToSize(
        report.technical_evidence.malicious_messages[0].content,
        170
      );
      doc.text(splitText, 20, yPos);
      yPos += splitText.length * 5 + 10;
      
      doc.setFontSize(9);
      doc.text(`Timestamp: ${new Date(report.technical_evidence.malicious_messages[0].timestamp).toLocaleString('pt-BR')}`, 20, yPos);
    }
    
    // Histórico de Conversação
    if (report.full_conversation_history?.length > 0) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(14);
      doc.text('HISTÓRICO COMPLETO DE CONVERSAÇÕES', 20, yPos);
      yPos += 10;
      
      report.full_conversation_history.forEach((session: any, idx: number) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Sessão ${idx + 1}: ${session.session_title}`, 20, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 6;
        
        doc.setFontSize(9);
        doc.text(`Data: ${new Date(session.session_date).toLocaleString('pt-BR')}`, 20, yPos);
        yPos += 5;
        
        doc.text(`Modelo: ${session.model || 'N/A'}`, 20, yPos);
        yPos += 5;
        
        doc.text(`Total de Mensagens: ${session.messages.length}`, 20, yPos);
        yPos += 10;
      });
    }
    
    // Resposta do Sistema
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.text('RESPOSTA DO SISTEMA', 20, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Ação', 'Status']],
      body: report.system_response.automated_actions_taken.map((action: string) => [action, '✓']),
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [23, 162, 184] }
    });
    
    // Recomendações
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.text('RECOMENDAÇÕES', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    report.recommendations.forEach((rec: string, idx: number) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const recText = `${idx + 1}. ${rec}`;
      const splitRec = doc.splitTextToSize(recText, 170);
      doc.text(splitRec, 20, yPos);
      yPos += splitRec.length * 6 + 5;
    });
    
    // Aviso Legal
    doc.addPage();
    yPos = 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AVISO LEGAL', 105, yPos, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    
    doc.setFontSize(9);
    const legalText = doc.splitTextToSize(report.legal_notice, 170);
    doc.text(legalText, 20, yPos);
    
    // Salvar
    const fileName = `relatorio-forense-${report.report_metadata.report_id}.pdf`;
    doc.save(fileName);
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm">
      <FileDown className="h-4 w-4 mr-2" />
      Exportar PDF
    </Button>
  );
}
