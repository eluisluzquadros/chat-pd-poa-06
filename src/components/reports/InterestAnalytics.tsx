
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "./StatsCard";
import { supabase } from "@/integrations/supabase/client";
import { TimeRange, getDateRangeFromFilter } from "@/utils/dateUtils";

interface InterestStats {
  total: number;
  approved: number;
  pending: number;
}

interface InterestAnalyticsProps {
  timeRange: TimeRange;
}

export function InterestAnalytics({ timeRange }: InterestAnalyticsProps) {
  const [stats, setStats] = useState<InterestStats>({
    total: 0,
    approved: 0,
    pending: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInterestStats = async () => {
      setIsLoading(true);
      try {
        const [startDate, endDate] = getDateRangeFromFilter(timeRange);
        
        // Get all interest manifestations
        const { data: interests, error } = await supabase
          .from("interest_manifestations")
          .select("*")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        if (error) throw error;

        // Calculate stats
        const totalInterests = interests.length;
        const approvedInterests = interests.filter(interest => interest.status === 'approved').length;
        const pendingInterests = interests.filter(interest => interest.status === 'pending').length;

        setStats({
          total: totalInterests,
          approved: approvedInterests,
          pending: pendingInterests
        });
      } catch (error) {
        console.error("Error fetching interest stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterestStats();
  }, [timeRange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Manifestações de Interesse</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Carregando estatísticas...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard 
                title="Total de Manifestações" 
                value={stats.total}
              />
              <StatsCard 
                title="Aprovadas" 
                value={stats.approved}
                className="bg-green-50 dark:bg-green-950/30"
              />
              <StatsCard 
                title="Pendentes" 
                value={stats.pending}
                className="bg-amber-50 dark:bg-amber-950/30"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
