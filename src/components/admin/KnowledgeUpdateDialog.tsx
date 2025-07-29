import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileText, Brain, Link, Save, X } from "lucide-react";
import { toast } from "sonner";

interface KnowledgeUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisData: any;
  gap: any;
}

export function KnowledgeUpdateDialog({ 
  open, 
  onOpenChange, 
  analysisData,
  gap 
}: KnowledgeUpdateDialogProps) {
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyUpdate = async () => {
    setIsApplying(true);
    try {
      // Here you would implement the actual update logic
      // For now, just show a success message
      toast.success("Atualização aplicada com sucesso! (Simulado)");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao aplicar atualização");
    } finally {
      setIsApplying(false);
    }
  };

  if (!analysisData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Análise de Atualização de Conhecimento
          </DialogTitle>
          <DialogDescription>
            Diagnóstico e sugestões para melhorar a base de conhecimento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Gap Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Gap Identificado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{gap?.severity || 'HIGH'}</Badge>
                  <Badge variant="outline">{gap?.category || 'Geral'}</Badge>
                </div>
                <p className="font-medium">{gap?.topic || 'Tópico não especificado'}</p>
                <p className="text-sm text-muted-foreground">
                  {gap?.failedTests?.length || 0} testes falhando nesta área
                </p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="diagnosis" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="diagnosis">Diagnóstico</TabsTrigger>
              <TabsTrigger value="content">Conteúdo Sugerido</TabsTrigger>
              <TabsTrigger value="location">Localização</TabsTrigger>
              <TabsTrigger value="references">Referências</TabsTrigger>
            </TabsList>

            <TabsContent value="diagnosis" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Diagnóstico Específico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-1">O que está faltando:</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisData.diagnosis?.missingInfo || 
                         "O agente não possui informações suficientes sobre este tópico específico."}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Por que os testes estão falhando:</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisData.diagnosis?.failureReason || 
                         "Falta de contexto ou informações específicas na base de conhecimento atual."}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Impacto:</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisData.diagnosis?.impact || 
                         "Usuários não receberão respostas precisas sobre este tópico."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Conteúdo Sugerido para Adicionar
                  </CardTitle>
                  <CardDescription>
                    Texto em português pronto para ser inserido na base
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">
                      {analysisData.suggestedContent?.text || 
                       "Conteúdo sugerido será gerado aqui após análise completa."}
                    </pre>
                  </div>
                  {analysisData.suggestedContent?.metadata && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">Metadados sugeridos:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(analysisData.suggestedContent.metadata).map(([key, value]) => (
                          <Badge key={key} variant="outline">
                            {key}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="location" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Onde Inserir o Conteúdo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-1">Arquivo recomendado:</h4>
                      <p className="text-sm text-muted-foreground font-mono">
                        {analysisData.location?.file || "knowledge_base/plano_diretor.md"}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Seção:</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisData.location?.section || "Seção apropriada baseada no contexto"}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Posição:</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysisData.location?.position || "Após conteúdo relacionado existente"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="references" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Referências Cruzadas
                  </CardTitle>
                  <CardDescription>
                    Conteúdo relacionado já existente na base
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analysisData.references?.length > 0 ? (
                    <div className="space-y-2">
                      {analysisData.references.map((ref: any, index: number) => (
                        <div key={index} className="border p-3 rounded">
                          <p className="font-medium text-sm">{ref.title}</p>
                          <p className="text-xs text-muted-foreground">{ref.location}</p>
                          <p className="text-sm mt-1">{ref.snippet}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma referência cruzada encontrada.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isApplying}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleApplyUpdate}
              disabled={isApplying}
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Aplicar Atualização
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}