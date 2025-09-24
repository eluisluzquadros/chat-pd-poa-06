// Script para corrigir URLs dos agentes no Supabase

console.log('🔧 Iniciando correção de agentes no Supabase...');

// Buscar todos os agentes
const { data: agents, error: fetchError } = await supabase
  .from('dify_agents')
  .select('*');

if (fetchError) {
  console.error('❌ Erro ao buscar agentes:', fetchError);
} else {
  console.log(`✅ Encontrados ${agents.length} agentes para atualizar`);
  
  // Configuração correta com base na URL do Dify real
  const correctConfig = {
    base_url: 'https://cloud.dify.ai',
    service_api_endpoint: '/api/chat-messages',
    api_key: 'app-0sZewWe2Z6pcucR70tyO8uKv',
    app_id: '49df24eb-3cf5-417d-93a9-e8d2112783f8',
    public_url: 'https://cloud.dify.ai',
    server_url: 'https://cloud.dify.ai'
  };

  // Atualizar cada agente
  for (const agent of agents) {
    console.log(`🔄 Atualizando agente: ${agent.name} (${agent.id})`);
    
    const { error: updateError } = await supabase
      .from('dify_agents')
      .update({ 
        dify_config: correctConfig
      })
      .eq('id', agent.id);
    
    if (updateError) {
      console.error(`❌ Erro ao atualizar ${agent.name}:`, updateError);
    } else {
      console.log(`✅ Agente ${agent.name} atualizado com sucesso`);
    }
  }
  
  console.log('🎉 Correção concluída! Teste agora o chat.');
}