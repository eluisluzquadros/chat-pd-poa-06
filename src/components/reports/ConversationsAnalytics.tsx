
// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "./StatsCard";
import { supabase } from "@/integrations/supabase/client";
import { TimeRange, getDateRangeFromFilter } from "@/utils/dateUtils";
import { AppRole } from "@/types/app";
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

// Helper function to generate chart data based on time range
const generateChartData = (chatSessions: any[], timeRange: TimeRange) => {
  const [startDate, endDate] = getDateRangeFromFilter(timeRange);
  
  // Group sessions by date
  const sessionsByDate = new Map<string, number>();
  
  chatSessions.forEach(session => {
    const sessionDate = new Date(session.created_at);
    let dateKey: string;
    
    if (timeRange === "7days") {
      dateKey = format(sessionDate, "dd/MM", { locale: ptBR });
    } else if (timeRange === "month") {
      dateKey = format(sessionDate, "dd/MM", { locale: ptBR });
    } else {
      dateKey = format(sessionDate, "MMM", { locale: ptBR });
    }
    
    sessionsByDate.set(dateKey, (sessionsByDate.get(dateKey) || 0) + 1);
  });
  
  // Generate complete date range with zeros for missing dates
  let intervals: Date[];
  
  if (timeRange === "7days") {
    intervals = eachDayOfInterval({ start: startDate, end: endDate });
  } else if (timeRange === "month") {
    intervals = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
  } else {
    intervals = eachMonthOfInterval({ start: startDate, end: endDate });
  }
  
  return intervals.map(date => {
    let dateKey: string;
    
    if (timeRange === "7days") {
      dateKey = format(date, "dd/MM", { locale: ptBR });
    } else if (timeRange === "month") {
      dateKey = format(startOfWeek(date, { weekStartsOn: 1 }), "dd/MM", { locale: ptBR });
    } else {
      dateKey = format(startOfMonth(date), "MMM", { locale: ptBR });
    }
    
    return {
      date: dateKey,
      count: sessionsByDate.get(dateKey) || 0
    };
  });
};

interface ConversationStats {
  total: number;
  byRole: Record<AppRole, number>;
  chartData: { date: string; count: number }[];
}

interface ConversationsAnalyticsProps {
  timeRange: TimeRange;
}

export function ConversationsAnalytics({ timeRange }: ConversationsAnalyticsProps) {
  const [stats, setStats] = useState<ConversationStats>({
    total: 0,
    byRole: { admin: 0, supervisor: 0, analyst: 0, user: 0 },
    chartData: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConversationStats = async () => {
      setIsLoading(true);
      try {
        const [startDate, endDate] = getDateRangeFromFilter(timeRange);
        
        // Get all chat sessions
        const { data: chatSessions, error } = await supabase
          .from("chat_sessions")
          .select("id, created_at, user_id")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        if (error) throw error;

        const totalConversations = chatSessions?.length || 0;
        
        // Get user roles for these sessions
        const userRoles: Record<AppRole, number> = { 
          admin: 0, 
          supervisor: 0, 
          analyst: 0, 
          user: 0 
        };
        
        // If we have sessions, get user roles from user_roles table only
        if (chatSessions && chatSessions.length > 0) {
          const userIds = chatSessions.map(session => session.user_id);
          
          // Query user_roles table
          const { data: rolesData, error: rolesError } = await supabase
            .from("user_roles")
            .select("role, user_id")
            .in("user_id", userIds);
          
          if (rolesError) throw rolesError;
          
          // Create a map of user roles
          const userRoleMap = new Map();
          rolesData?.forEach(user => {
            userRoleMap.set(user.user_id, user.role as AppRole);
          });
          
          // Count conversations by user role, using 'user' as default for users without defined roles
          chatSessions.forEach(session => {
            const role = (userRoleMap.get(session.user_id) || 'user') as AppRole;
            if (userRoles[role] !== undefined) {
              userRoles[role] = (userRoles[role] || 0) + 1;
            }
          });
        }

        // Generate real chart data based on actual chat sessions
        const chartData = generateChartData(chatSessions || [], timeRange);

        setStats({
          total: totalConversations,
          byRole: userRoles,
          chartData
        });
      } catch (error) {
        console.error("Error fetching conversation stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversationStats();
  }, [timeRange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Conversas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Carregando estatísticas...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
              <StatsCard 
                title="Total de Conversas" 
                value={stats.total}
              />
            </div>

            <div className="h-[300px] mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(100, 100, 100, 0.1)'}}
                    formatter={(value) => [`${value} conversas`, 'Quantidade']}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]} 
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <h3 className="font-semibold mb-3">Conversas por Perfil de Usuário</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard 
                title="Administradores" 
                value={stats.byRole.admin} 
                className="bg-blue-50 dark:bg-blue-950/30"
              />
              <StatsCard 
                title="Supervisores" 
                value={stats.byRole.supervisor} 
                className="bg-green-50 dark:bg-green-950/30"
              />
              <StatsCard 
                title="Analistas" 
                value={stats.byRole.analyst} 
                className="bg-amber-50 dark:bg-amber-950/30"
              />
              <StatsCard 
                title="Cidadãos" 
                value={stats.byRole.user} 
                className="bg-purple-50 dark:bg-purple-950/30"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
