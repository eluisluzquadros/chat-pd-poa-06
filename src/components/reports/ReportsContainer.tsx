
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadIcon, Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { TimeRange, Period, getTimeRangeLabel } from "@/utils/dateUtils";
import { TimeRangeSelector } from "@/components/reports/TimeRangeSelector";
import { PeriodSelector } from "@/components/reports/PeriodSelector";
import { ReportSidebar } from "@/components/reports/ReportSidebar";
import { UsersAnalytics } from "@/components/reports/UsersAnalytics";
import { ConversationsAnalytics } from "@/components/reports/ConversationsAnalytics";
import { SentimentAnalytics } from "@/components/reports/SentimentAnalytics";
import { TopicsAnalytics } from "@/components/reports/TopicsAnalytics";
import { IntelligenceAlerts } from "@/components/reports/IntelligenceAlerts";
import { KeywordsCloud } from "@/components/reports/KeywordsCloud";
import { IntentAnalytics } from "@/components/reports/IntentAnalytics";
import { FAQDetector } from "@/components/reports/FAQDetector";
import { ExecutiveDashboard } from "@/components/reports/ExecutiveDashboard";
import { reportExportService } from "@/services/reportExportService";
import { messageAnalysisService } from "@/services/messageAnalysisService";
import { supabase } from "@/integrations/supabase/client";

interface ReportsContainerProps {
  showProcessButton?: boolean;
}

export function ReportsContainer({ showProcessButton = true }: ReportsContainerProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7days");
  const [period, setPeriod] = useState<Period>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessInsights = async () => {
    setIsProcessing(true);
    try {
      toast.info("Iniciando análise de mensagens...");
      
      const result = await messageAnalysisService.analyzeHistoricalMessages(500);
      
      if (result.errors > 0) {
        toast.warning(
          `Análise concluída com ${result.errors} erros. ${result.analyzed} mensagens analisadas.`
        );
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

  const handleExportData = async () => {
    try {
      let data: any[] = [];
      
      // Fetch data based on active tab
      switch(activeTab) {
        case 'users':
          const { data: users } = await supabase
            .from('user_accounts')
            .select('*');
          data = users || [];
          break;
        
        case 'conversations':
          const { data: sessions } = await supabase
            .from('chat_sessions')
            .select('*');
          data = sessions || [];
          break;
        
        case 'sentiment':
        case 'topics':
        case 'keywords':
        case 'intents':
          const { data: insights } = await supabase
            .from('message_insights')
            .select('*');
          data = insights || [];
          break;
        
        case 'alerts':
          const { data: alerts } = await supabase
            .from('intelligence_alerts')
            .select('*');
          data = alerts || [];
          break;
        
        default:
          // Export all sessions for overview
          const { data: allSessions } = await supabase
            .from('chat_sessions')
            .select('*');
          data = allSessions || [];
      }
      
      const filename = `relatorio_${activeTab}_${period}_${timeRange}`;
      await reportExportService.exportToCSV(data, filename);
      toast.success("Relatório exportado com sucesso");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="col-span-1">
          <ReportSidebar 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
        </div>

        {/* Main Content */}
        <div className="col-span-1 md:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Relatórios</CardTitle>
                <CardDescription>
                  {getTimeRangeLabel(timeRange)}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {showProcessButton && (
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    onClick={handleProcessInsights}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        Processar Insights
                      </>
                    )}
                  </Button>
                )}
                <Button 
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleExportData}
                >
                  <DownloadIcon className="h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <PeriodSelector 
                selectedPeriod={period}
                onPeriodChange={setPeriod}
              />
              
              <TimeRangeSelector 
                selectedRange={timeRange}
                onRangeChange={setTimeRange}
              />
              
              <div className="space-y-6 mt-6">
                {activeTab === "executive" && (
                  <ExecutiveDashboard period={period} timeRange={timeRange} />
                )}

                {(activeTab === "all" || activeTab === "users") && (
                  <UsersAnalytics timeRange={timeRange} />
                )}
                
                {(activeTab === "all" || activeTab === "conversations") && (
                  <ConversationsAnalytics timeRange={timeRange} />
                )}

                {(activeTab === "all" || activeTab === "sentiment") && (
                  <SentimentAnalytics period={period} timeRange={timeRange} />
                )}

                {(activeTab === "all" || activeTab === "topics") && (
                  <TopicsAnalytics period={period} timeRange={timeRange} />
                )}

                {activeTab === "keywords" && (
                  <KeywordsCloud period={period} timeRange={timeRange} />
                )}

                {activeTab === "intents" && (
                  <IntentAnalytics period={period} timeRange={timeRange} />
                )}

                {activeTab === "faqs" && (
                  <FAQDetector period={period} timeRange={timeRange} />
                )}

                {(activeTab === "all" || activeTab === "alerts") && (
                  <IntelligenceAlerts period={period} timeRange={timeRange} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
