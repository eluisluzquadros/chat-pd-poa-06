import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const DemoSetupButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  const setupDemoUser = async () => {
    setIsLoading(true);
    try {
      console.log('🔧 Iniciando setup do usuário demo...');
      
      const { data, error } = await supabase.functions.invoke('setup-demo-user', {
        body: {}
      });

      if (error) {
        throw new Error(`Erro na função: ${error.message}`);
      }

      console.log('✅ Setup concluído:', data);
      
      if (data.success) {
        setSetupComplete(true);
        toast.success('🎉 Setup do usuário demo concluído!');
        
        // Mostrar detalhes do setup
        const details = [
          `👤 Usuário: ${data.demo_user.email}`,
          `🆔 ID: ${data.demo_user.id}`,
          `📊 Criado: ${data.demo_user.created ? 'Sim' : 'Já existia'}`,
          `📁 Tabela documents: ${data.database_status.documents_table_exists ? '✅' : '❌'}`,
          `📁 Tabela documents_test: ${data.database_status.documents_test_table_exists ? '✅' : '❌'}`,
          `🔑 OpenAI Key: ${data.secrets_status.openai_api_key ? '✅' : '❌'}`,
          `🤖 Assistant ID: ${data.secrets_status.assistant_id ? '✅' : '❌'}`
        ];
        
        setTimeout(() => {
          toast.info('Detalhes do Setup:\n' + details.join('\n'), {
            duration: 10000
          });
        }, 1000);
      } else {
        throw new Error(data.error || 'Setup falhou');
      }
      
    } catch (error: any) {
      console.error('❌ Erro no setup:', error);
      toast.error(`Erro no setup: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
      <div>
        <h3 className="text-lg font-semibold">🔧 Setup do Sistema</h3>
        <p className="text-sm text-muted-foreground">
          Configure o usuário demo e verifique a conexão com o banco de dados
        </p>
      </div>
      
      <Button 
        onClick={setupDemoUser} 
        disabled={isLoading || setupComplete}
        variant={setupComplete ? "outline" : "default"}
      >
        {isLoading ? '🔄 Configurando...' : setupComplete ? '✅ Setup Completo' : '🚀 Iniciar Setup'}
      </Button>
      
      {setupComplete && (
        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded">
          <p className="text-sm text-green-700 dark:text-green-300">
            ✅ Sistema configurado! Use as credenciais:
            <br />
            <strong>Email:</strong> demo@pdus.com
            <br />
            <strong>Senha:</strong> Demo123!
          </p>
        </div>
      )}
    </div>
  );
};