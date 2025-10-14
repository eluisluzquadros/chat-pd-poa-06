import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { messageAnalysisService } from "@/services/messageAnalysisService";
import { toast } from "sonner";
import { Loader2, Brain, CheckCircle2, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";

export default function ProcessInsightsPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ analyzed: number; errors: number } | null>(null);

  const handleProcess = async () => {
    setIsProcessing(true);
    setProgress(10);
    setResults(null);

    try {
      toast.info("Iniciando análise de mensagens...");
      setProgress(30);

      const result = await messageAnalysisService.analyzeHistoricalMessages(500);
      
      setProgress(100);
      setResults(result);

      if (result.errors > 0) {
        toast.warning(`Análise concluída com ${result.errors} erros. ${result.analyzed} mensagens analisadas.`);
      } else {
        toast.success(`${result.analyzed} mensagens analisadas com sucesso!`);
      }
    } catch (error) {
      console.error("Erro ao processar mensagens:", error);
      toast.error("Erro ao processar mensagens. Verifique o console.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto pt-24 pb-10 flex-grow">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6" />
              Processamento de Insights
            </CardTitle>
            <CardDescription>
              Analise mensagens históricas para extrair sentimentos, tópicos e intenções
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold">O que será analisado?</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Sentimento das mensagens (positivo, negativo, neutro)</li>
                <li>Tópicos principais discutidos</li>
                <li>Intenções dos usuários</li>
                <li>Palavras-chave relevantes</li>
              </ul>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processando...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {results && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Processamento concluído!</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Analisadas</p>
                    <p className="text-2xl font-bold text-green-600">{results.analyzed}</p>
                  </div>
                  {results.errors > 0 && (
                    <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Erros</p>
                      <p className="text-2xl font-bold text-red-600">{results.errors}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Iniciar Processamento
                </>
              )}
            </Button>

            {!results && (
              <p className="text-xs text-muted-foreground text-center">
                Este processo pode levar alguns minutos dependendo da quantidade de mensagens
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
