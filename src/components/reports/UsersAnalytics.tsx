
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "./StatsCard";
import { supabase } from "@/integrations/supabase/client";
import { TimeRange } from "@/utils/dateUtils";
import { AppRole } from "@/types/app";

interface UserStats {
  total: number;
  active: number;
  byRole: Record<AppRole, number>;
}

interface UsersAnalyticsProps {
  timeRange: TimeRange;
}

export function UsersAnalytics({ timeRange }: UsersAnalyticsProps) {
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    byRole: { admin: 0, supervisor: 0, analyst: 0, citizen: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      setIsLoading(true);
      try {
        // Get all users
        const { data: users, error } = await supabase
          .from("user_accounts")
          .select("*");

        if (error) throw error;

        // Calculate stats
        const totalUsers = users.length;
        const activeUsers = users.filter(user => user.is_active).length;
        
        // Count by role
        const byRole = users.reduce((acc, user) => {
          const role = user.role as AppRole;
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        }, { admin: 0, supervisor: 0, analyst: 0, citizen: 0 } as Record<AppRole, number>);

        setStats({
          total: totalUsers,
          active: activeUsers,
          byRole
        });
      } catch (error) {
        console.error("Error fetching user stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStats();
  }, [timeRange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Usuários</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Carregando estatísticas...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <StatsCard 
                title="Total de Usuários" 
                value={stats.total}
              />
              <StatsCard 
                title="Usuários Ativos" 
                value={stats.active}
              />
            </div>

            <h3 className="font-semibold mb-3">Usuários por Perfil</h3>
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
                value={stats.byRole.citizen} 
                className="bg-purple-50 dark:bg-purple-950/30"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
