import { Period, TimeRange } from "@/utils/dateUtils";
import { UsersAnalytics } from "./UsersAnalytics";
import { ConversationsAnalytics } from "./ConversationsAnalytics";
import { SentimentAnalytics } from "./SentimentAnalytics";
import { TopicsAnalytics } from "./TopicsAnalytics";
import { IntelligenceAlerts } from "./IntelligenceAlerts";
import { StatsCard } from "./StatsCard";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExecutiveDashboardProps {
  period: Period;
  timeRange: TimeRange;
}

export function ExecutiveDashboard({ period, timeRange }: ExecutiveDashboardProps) {
  const [kpis, setKpis] = useState({
    totalUsers: 0,
    totalConversations: 0,
    totalMessages: 0,
    satisfactionRate: 0,
  });

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        // Total users
        const { count: usersCount } = await supabase
          .from("user_accounts")
          .select("*", { count: "exact", head: true });

        // Total conversations
        const { count: sessionsCount } = await supabase
          .from("chat_sessions")
          .select("*", { count: "exact", head: true });

        // Total messages from insights
        const { count: messagesCount } = await supabase
          .from("message_insights")
          .select("*", { count: "exact", head: true });

        // Satisfaction rate
        const { data: sentimentData } = await supabase
          .from("message_insights")
          .select("sentiment");

        let satisfactionRate = 0;
        if (sentimentData && sentimentData.length > 0) {
          const positive = sentimentData.filter((d: any) => d.sentiment === "positive").length;
          satisfactionRate = (positive / sentimentData.length) * 100;
        }

        setKpis({
          totalUsers: usersCount || 0,
          totalConversations: sessionsCount || 0,
          totalMessages: messagesCount || 0,
          satisfactionRate: Math.round(satisfactionRate),
        });
      } catch (error) {
        console.error("Error fetching KPIs:", error);
      }
    };

    fetchKPIs();
  }, [period, timeRange]);

  return (
    <div className="space-y-6">
      {/* KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Total de Usuários" value={kpis.totalUsers} />
        <StatsCard title="Conversas Realizadas" value={kpis.totalConversations} />
        <StatsCard title="Mensagens Analisadas" value={kpis.totalMessages} />
        <StatsCard title="Taxa de Satisfação" value={`${kpis.satisfactionRate}%`} />
      </div>

      {/* Main Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Análise de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <UsersAnalytics timeRange={timeRange} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Análise de Conversas</CardTitle>
          </CardHeader>
          <CardContent>
            <ConversationsAnalytics timeRange={timeRange} />
          </CardContent>
        </Card>
      </div>

      {/* Sentiment & Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SentimentAnalytics period={period} timeRange={timeRange} />
        <TopicsAnalytics period={period} timeRange={timeRange} />
      </div>

      {/* Alerts */}
      <IntelligenceAlerts period={period} timeRange={timeRange} />
    </div>
  );
}
