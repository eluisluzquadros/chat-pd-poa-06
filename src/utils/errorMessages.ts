/**
 * Mensagens de erro amigáveis para usuários finais
 */

export const ERROR_MESSAGES = {
  SYSTEM_UNAVAILABLE: `⚠️ **Instabilidade Temporária no ChatPDPOA**

Pedimos desculpas. No momento, o ChatPDPOA está passando por uma instabilidade devido a um alto volume de acessos.

Nossa equipe técnica já foi acionada e está trabalhando para normalizar o serviço o mais rápido possível.

**Enquanto isso, você pode consultar:**

🗺️ **Mapa Interativo (Painel do Regime Urbanístico):**  
https://bit.ly/pdpoaregramento

📧 **Dúvidas Oficiais:**  
planodiretor@portoalegre.rs.gov.br

💬 **Contribuições (SMAMUS):**  
Envie suas sugestões pelos canais oficiais da SMAMUS.

Agradecemos a sua compreensão.`,

  NETWORK_ERROR: 'Erro de conexão. Por favor, verifique sua internet e tente novamente.',
  
  AUTH_ERROR: 'Sessão expirada. Por favor, faça login novamente.'
};

/**
 * Converte erro técnico em mensagem amigável
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  // Log técnico completo apenas em desenvolvimento
  if (import.meta.env.DEV) {
    console.error('🔧 [DEV] Technical error:', error);
  }
  
  // Log resumido em produção (sem dados sensíveis)
  console.error('❌ [PROD] Error occurred:', error instanceof Error ? error.message : 'Unknown');
  
  // Detectar tipos específicos de erro
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    
    // Erros de autenticação
    if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('token')) {
      return ERROR_MESSAGES.AUTH_ERROR;
    }
    
    // Erros de rede
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
  }
  
  // ✅ QUALQUER OUTRO ERRO = Mensagem padrão de instabilidade
  return ERROR_MESSAGES.SYSTEM_UNAVAILABLE;
}
