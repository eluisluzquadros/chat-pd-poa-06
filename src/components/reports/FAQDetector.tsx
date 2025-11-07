import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { Period, TimeRange } from "@/utils/dateUtils";
import { filterNoiseKeywords, filterTestInsights } from "@/services/keywordFilterService";

interface FAQDetectorProps {
  period: Period;
  timeRange: TimeRange;
}

interface FAQItem {
  question: string;
  count: number;
  keywords: string[];
}

export function FAQDetector({ period, timeRange }: FAQDetectorProps) {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFAQs = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("message_insights")
          .select("user_message, keywords, topics");

        if (error) throw error;

        if (!data || data.length === 0) {
          setFaqs([]);
          return;
        }

        // Filtrar mensagens de teste
        const cleanData = filterTestInsights(data);

        // Group similar questions by keywords
        const questionGroups = new Map<string, { questions: string[]; keywords: Set<string> }>();

        cleanData.forEach((insight: any) => {
          // Filtrar keywords ruidosas
          const cleanKeywords = filterNoiseKeywords(insight.keywords || []);
          
          // Se não sobrou nenhuma keyword relevante, pular
          if (cleanKeywords.length === 0) return;
          
          const keywordsStr = cleanKeywords.join(",");
          const current = questionGroups.get(keywordsStr) || { 
            questions: [], 
            keywords: new Set(cleanKeywords) 
          };
          current.questions.push(insight.user_message);
          questionGroups.set(keywordsStr, current);
        });

        // Convert to FAQ format
        const faqData = Array.from(questionGroups.entries())
          .filter(([_, data]) => data.questions.length >= 2) // At least 2 similar questions
          .map(([_, data]) => ({
            question: data.questions[0].substring(0, 150),
            count: data.questions.length,
            keywords: Array.from(data.keywords),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20); // Top 20 FAQs

        setFaqs(faqData);
      } catch (error) {
        console.error("Error fetching FAQs:", error);
        toast.error("Erro ao detectar FAQs");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFAQs();
  }, [period, timeRange]);

  const handleExportFAQs = () => {
    const csvContent = [
      ["Pergunta", "Frequência", "Palavras-chave"],
      ...faqs.map(faq => [
        faq.question,
        faq.count.toString(),
        faq.keywords.join("; ")
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `faqs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("FAQs exportadas com sucesso");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Perguntas Mais Frequentes (FAQ)</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (faqs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Perguntas Mais Frequentes (FAQ)</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            Nenhuma FAQ detectada. Execute o processamento de insights primeiro.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Perguntas Mais Frequentes</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExportFAQs}>
          <Download className="h-4 w-4 mr-2" />
          Exportar FAQs
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border rounded p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm flex-1">{faq.question}...</h4>
                <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold ml-2">
                  {faq.count}x
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {faq.keywords.map((keyword, kidx) => (
                  <span 
                    key={kidx}
                    className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
