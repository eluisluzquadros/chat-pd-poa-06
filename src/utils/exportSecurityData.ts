/**
 * Utilitários de exportação para dados de segurança
 * Suporta formatos JSON, CSV e preparação para Excel
 */

export interface SecurityRunExport {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  agent_name: string;
  agent_model: string;
}

export interface IncidentReportExport {
  id: string;
  created_at: string;
  threat_level: string;
  status: string;
  visibility: string;
  title: string;
  description: string;
  attacker_email: string;
  attacker_ip: string;
  session_id: string;
}

/**
 * Exporta histórico de validações de segurança em JSON
 */
export function exportSecurityRunsJSON(runs: any[]) {
  const exportData: SecurityRunExport[] = runs.map(run => ({
    id: run.id,
    started_at: run.started_at,
    completed_at: run.completed_at,
    status: run.status,
    total_tests: run.total_tests || 0,
    passed_tests: run.passed_tests || 0,
    failed_tests: run.failed_tests || 0,
    agent_name: run.dify_agents?.display_name || 'N/A',
    agent_model: run.dify_agents?.model || 'N/A'
  }));

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `security-runs-history-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta histórico de validações de segurança em CSV
 */
export function exportSecurityRunsCSV(runs: any[]) {
  const headers = [
    'ID',
    'Data Início',
    'Data Conclusão',
    'Status',
    'Total Testes',
    'Testes Aprovados',
    'Testes Falhos',
    'Agente',
    'Modelo'
  ];

  const rows = runs.map(run => [
    run.id,
    run.started_at,
    run.completed_at || 'Em andamento',
    run.status,
    run.total_tests || 0,
    run.passed_tests || 0,
    run.failed_tests || 0,
    run.dify_agents?.display_name || 'N/A',
    run.dify_agents?.model || 'N/A'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const dataBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `security-runs-history-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta múltiplos relatórios de incidentes em JSON
 */
export function exportIncidentReportsJSON(incidents: any[]) {
  const exportData: IncidentReportExport[] = incidents.map(incident => {
    const reportData = incident.report_data as any;
    return {
      id: incident.id,
      created_at: incident.created_at,
      threat_level: incident.threat_level,
      status: incident.status,
      visibility: incident.visibility || 'internal',
      title: reportData?.metadata?.title || 'Sem título',
      description: reportData?.incident_classification?.description || 'Sem descrição',
      attacker_email: reportData?.attacker_profile?.email || 'N/A',
      attacker_ip: reportData?.attacker_profile?.ip_address || 'N/A',
      session_id: incident.session_id || 'N/A'
    };
  });

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `security-incidents-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta múltiplos relatórios de incidentes em CSV
 */
export function exportIncidentReportsCSV(incidents: any[]) {
  const headers = [
    'ID',
    'Data',
    'Nível de Ameaça',
    'Status',
    'Visibilidade',
    'Título',
    'Descrição',
    'Email Atacante',
    'IP Atacante',
    'ID Sessão'
  ];

  const rows = incidents.map(incident => {
    const reportData = incident.report_data as any;
    return [
      incident.id,
      incident.created_at,
      incident.threat_level,
      incident.status,
      incident.visibility || 'internal',
      reportData?.metadata?.title || 'Sem título',
      reportData?.incident_classification?.description || 'Sem descrição',
      reportData?.attacker_profile?.email || 'N/A',
      reportData?.attacker_profile?.ip_address || 'N/A',
      incident.session_id || 'N/A'
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const dataBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `security-incidents-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
