import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Period, TimeRange } from "@/utils/dateUtils";
import { filterTestInsights } from "@/services/keywordFilterService";

interface IntentAnalyticsProps {
  period: Period;
  timeRange: TimeRange;
}

interface IntentData {
  intent: string;
  count: number;
  examples: string[];
}

export function IntentAnalytics({ period, timeRange }: IntentAnalyticsProps) {
  const [intents, setIntents] = useState<IntentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIntents = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("message_insights")
          .select("intent, user_message, keywords, topics");

        if (error) throw error;

        if (!data || data.length === 0) {
          setIntents([]);
          return;
        }

        // Filtrar mensagens de teste
        const cleanData = filterTestInsights(data);

        // Group by intent
        const intentMap = new Map<string, { count: number; examples: string[] }>();
        
        cleanData.forEach((insight: any) => {
          if (insight.intent && Array.isArray(insight.intent)) {
            insight.intent.forEach((intentType: string) => {
              const current = intentMap.get(intentType) || { count: 0, examples: [] };
              current.count++;
              if (current.examples.length < 3) {
                current.examples.push(insight.user_message.substring(0, 100));
              }
              intentMap.set(intentType, current);
            });
          }
        });

        const intentData = Array.from(intentMap.entries())
          .map(([intent, data]) => ({
            intent,
            count: data.count,
            examples: data.examples,
          }))
          .sort((a, b) => b.count - a.count);

        setIntents(intentData);
      } catch (error) {
        console.error("Error fetching intents:", error);
        toast.error("Erro ao carregar intenções");
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntents();
  }, [period, timeRange]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Intenções</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (intents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Intenções</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            Nenhuma intenção identificada. Execute o processamento de insights primeiro.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição de Intenções dos Usuários</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={intents}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="intent" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 space-y-4">
          <h4 className="font-semibold">Exemplos por Intenção</h4>
          {intents.slice(0, 5).map((intent) => (
            <div key={intent.intent} className="border rounded p-3">
              <h5 className="font-medium mb-2">
                {intent.intent} ({intent.count} ocorrências)
              </h5>
              <ul className="text-sm text-muted-foreground space-y-1">
                {intent.examples.map((example, idx) => (
                  <li key={idx}>• {example}...</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
