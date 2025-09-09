import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Settings, TestTube, Loader2 } from "lucide-react";
import { useRAGConfig } from "@/hooks/useRAGConfig";

const RAGConfigurationTab = () => {
  const { status, loading, updating, switchRAGMode, testConfiguration } = useRAGConfig();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-muted-foreground">Carregando configuração...</span>
      </div>
    );
  }

  const StatusIndicator = ({ isActive, label }: { isActive: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {isActive ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
      )}
      <span className={isActive ? "text-green-700 font-medium" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração do Sistema RAG
          </CardTitle>
          <CardDescription>
            Gerencie o modo de operação do sistema de Recuperação de Informações (RAG)
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Atual */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Status Atual</h4>
            <div className="flex items-center gap-4">
              <Badge variant={status.isConfigured ? "default" : "destructive"}>
                {status.isConfigured ? "Configurado" : "Não Configurado"}
              </Badge>
              <Badge variant="outline">
                {status.currentMode.toUpperCase()} Ativo
              </Badge>
            </div>
            
            {!status.isConfigured && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Configuração Incompleta</p>
                  <p>Para usar o agentic-rag-v2, configure os secrets necessários.</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Toggle de Modo */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Modo de Operação</h4>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <StatusIndicator 
                  isActive={status.currentMode === 'local'} 
                  label="agentic-rag-v1" 
                />
                <p className="text-sm text-muted-foreground ml-6">
                  Sistema RAG interno via edge functions Supabase
                </p>
              </div>
              
              <Switch
                checked={status.currentMode === 'dify'}
                onCheckedChange={(checked) => 
                  switchRAGMode(checked ? 'dify' : 'local')
                }
                disabled={updating}
              />
              
              <div className="space-y-1">
                <StatusIndicator 
                  isActive={status.currentMode === 'dify'} 
                  label="agentic-rag-v2" 
                />
                <p className="text-sm text-muted-foreground mr-6">
                  Sistema RAG avançado (versão 2)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Informações dos Modos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className={status.currentMode === 'local' ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">agentic-rag-v1</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Sempre disponível</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Edge functions nativas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Sistema integrado</span>
                </div>
              </CardContent>
            </Card>

            <Card className={status.currentMode === 'dify' ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">agentic-rag-v2</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  {status.difySecretsAvailable ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    Secrets {status.difySecretsAvailable ? 'configurados' : 'pendentes'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Processamento otimizado</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Interface visual</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Teste de Configuração */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Teste de Configuração</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm">Testar configuração atual</p>
                {status.lastTested && (
                  <p className="text-xs text-muted-foreground">
                    Último teste: {status.lastTested.toLocaleString()}
                    {status.testResult && (
                      <Badge 
                        variant={status.testResult === 'success' ? 'default' : 'destructive'}
                        className="ml-2"
                      >
                        {status.testResult === 'success' ? 'Sucesso' : 'Erro'}
                      </Badge>
                    )}
                  </p>
                )}
                {status.testMessage && (
                  <p className="text-xs text-muted-foreground">{status.testMessage}</p>
                )}
              </div>
              
              <Button
                onClick={testConfiguration}
                disabled={updating || !status.isConfigured}
                variant="outline"
                size="sm"
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Testando...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Testar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RAGConfigurationTab;