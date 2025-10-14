import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactWordcloud from "react-wordcloud";
import { Period, TimeRange } from "@/utils/dateUtils";

interface KeywordsCloudProps {
  period: Period;
  timeRange: TimeRange;
}

interface WordData {
  text: string;
  value: number;
}

export function KeywordsCloud({ period, timeRange }: KeywordsCloudProps) {
  const [words, setWords] = useState<WordData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchKeywords = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("message_insights")
          .select("keywords");

        if (error) throw error;

        if (!data || data.length === 0) {
          setWords([]);
          return;
        }

        // Count keyword frequencies
        const keywordCounts = new Map<string, number>();
        data.forEach((insight: any) => {
          if (insight.keywords && Array.isArray(insight.keywords)) {
            insight.keywords.forEach((keyword: string) => {
              keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
            });
          }
        });

        // Convert to word cloud format
        const wordData = Array.from(keywordCounts.entries())
          .map(([text, value]) => ({ text, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 50); // Top 50 keywords

        setWords(wordData);
      } catch (error) {
        console.error("Error fetching keywords:", error);
        toast.error("Erro ao carregar palavras-chave");
      } finally {
        setIsLoading(false);
      }
    };

    fetchKeywords();
  }, [period, timeRange]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nuvem de Palavras-Chave</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (words.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nuvem de Palavras-Chave</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            Nenhuma palavra-chave encontrada. Execute o processamento de insights primeiro.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Palavras-Chave Mais Frequentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ReactWordcloud
            words={words}
            options={{
              rotations: 2,
              rotationAngles: [0, 90],
              fontSizes: [12, 60],
              padding: 2,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
