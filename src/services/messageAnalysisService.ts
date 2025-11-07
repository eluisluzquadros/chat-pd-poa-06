import { supabase } from "@/integrations/supabase/client";
import { Period, getDateRangeByPeriod } from "@/utils/dateUtils";
import { filterTestInsights, isNoiseKeyword } from "./keywordFilterService";

export class MessageAnalysisService {
  /**
   * Analisa mensagens históricas em batches
   */
  async analyzeHistoricalMessages(limit = 500) {
    console.log(`📚 Starting historical message analysis (limit: ${limit})...`);

    // Buscar mensagens não analisadas
    const { data: sessions, error } = await supabase
      .from('chat_history')
      .select('id, session_id, message, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }

    if (!sessions || sessions.length === 0) {
      console.log('⚠️ No messages found to analyze');
      return { analyzed: 0, errors: 0 };
    }

    console.log(`📨 Found ${sessions.length} messages to analyze`);

    // Processar em batches de 10 mensagens
    const batchSize = 10;
    let analyzed = 0;
    let errors = 0;

    for (let i = 0; i < sessions.length; i += batchSize) {
      const batch = sessions.slice(i, i + batchSize);
      
      try {
        // ✅ Preparar dados completos para enviar
        const messagesToAnalyze = batch
          .filter(s => s.message?.role === 'user')
          .map(s => ({
            session_id: s.session_id,
            user_message: s.message?.content || '',
            created_at: s.created_at
          }));

        // ✅ REMOVER DUPLICATAS baseado em session_id + user_message
        const uniqueMessages = Array.from(
          new Map(
            messagesToAnalyze.map(msg => [
              `${msg.session_id}:${msg.user_message}`,
              msg
            ])
          ).values()
        );

        const duplicatesCount = messagesToAnalyze.length - uniqueMessages.length;

        if (uniqueMessages.length === 0) {
          console.log(`⏭️ Batch ${i}-${i + batchSize}: No user messages, skipping`);
          continue;
        }

        console.log(`📤 Sending batch ${i}-${i + batchSize}: ${uniqueMessages.length} unique messages${duplicatesCount > 0 ? ` (${duplicatesCount} duplicates removed)` : ''}`);

        // ✅ Enviar para edge function (que agora faz tudo)
        const { data: result, error: funcError } = await supabase.functions.invoke(
          'analyze-messages',
          { body: { messages: uniqueMessages } }
        );

        console.log(`📥 Received response:`, result);

        if (funcError) {
          console.error(`❌ Edge function error:`, funcError);
          throw funcError;
        }

        if (!result?.success) {
          console.error(`❌ Analysis failed:`, result?.error);
          throw new Error(result?.error || 'Analysis failed');
        }

        // ✅ A edge function já fez o INSERT, só contabilizar
        analyzed += result.analyzed || 0;
        console.log(`✅ Batch ${i}-${i + batchSize} processed: ${result.analyzed} messages`);

      } catch (error) {
        console.error(`❌ Error processing batch ${i}-${i + batchSize}:`, error);
        console.error(`❌ Error details:`, JSON.stringify(error));
        errors += batch.length;
      }
    }

    console.log(`✅ Analysis complete: ${analyzed} analyzed, ${errors} errors`);
    return { analyzed, errors };
  }

  /**
   * Obtém os tópicos mais discutidos
   */
  async getTopTopics(period: Period, limit = 10) {
    const [startDate, endDate] = getDateRangeByPeriod(period, '7days');

    const { data, error } = await supabase.rpc('get_top_topics', {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      limit_count: limit * 3 // Buscar 3x mais para compensar filtros
    });

    if (error) {
      console.error('Error fetching top topics:', error);
      return [];
    }

    // Filtrar tópicos ruidosos
    const cleanTopics = (data || [])
      .filter(topic => !isNoiseKeyword(topic.topic))
      .slice(0, limit);

    return cleanTopics;
  }

  /**
   * Obtém estatísticas de sentimento
   */
  async getSentimentStats(period: Period) {
    const [startDate, endDate] = getDateRangeByPeriod(period, '7days');

    const { data, error } = await supabase
      .from('message_insights')
      .select('sentiment, sentiment_score, keywords, topics')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      console.error('Error fetching sentiment stats:', error);
      return null;
    }

    // Filtrar mensagens de teste
    const cleanData = filterTestInsights(data);

    const total = cleanData.length;
    const positive = cleanData.filter(d => d.sentiment === 'positive').length;
    const negative = cleanData.filter(d => d.sentiment === 'negative').length;
    const neutral = cleanData.filter(d => d.sentiment === 'neutral').length;

    return {
      total,
      positive,
      negative,
      neutral,
      positiveRate: total > 0 ? (positive / total) * 100 : 0,
      negativeRate: total > 0 ? (negative / total) * 100 : 0,
      neutralRate: total > 0 ? (neutral / total) * 100 : 0,
    };
  }
}

export const messageAnalysisService = new MessageAnalysisService();