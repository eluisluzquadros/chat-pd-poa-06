
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
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
import { reportExportService } from "@/services/reportExportService";

export function ReportsContainer() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7days");
  const [period, setPeriod] = useState<Period>("all");
  const [activeTab, setActiveTab] = useState("all");

  const handleExportData = async () => {
    try {
      const data: any[] = [];
      const filename = `relatorio_${activeTab}_${period}_${timeRange}`;
      
      await reportExportService.exportToCSV(data, filename);
      toast.success("Relatório exportado com sucesso");
    } catch (error) {
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
              <Button 
                variant="outline"
                className="flex items-center gap-2"
                onClick={handleExportData}
              >
                <DownloadIcon className="h-4 w-4" />
                Exportar CSV
              </Button>
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
