import { supabase } from "@/integrations/supabase/client";
import { Period, getDateRangeByPeriod } from "@/utils/dateUtils";

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
        // Extrair apenas mensagens do usuário
        const userMessages = batch
          .filter(s => s.message?.role === 'user')
          .map(s => s.message?.content || '');

        if (userMessages.length === 0) continue;

        // Enviar para edge function
        const { data: analysis, error: funcError } = await supabase.functions.invoke(
          'analyze-messages',
          { body: { messages: userMessages } }
        );

        if (funcError) throw funcError;

        // Salvar resultados no banco
        const insights = batch
          .filter(s => s.message?.role === 'user')
          .map((session, idx) => ({
            session_id: session.session_id,
            user_message: session.message?.content || '',
            sentiment: analysis.results[idx]?.sentiment,
            sentiment_score: analysis.results[idx]?.sentiment_score,
            intent: analysis.results[idx]?.intent,
            topics: analysis.results[idx]?.topics,
            keywords: analysis.results[idx]?.keywords,
            created_at: session.created_at,
          }));

        const { error: insertError } = await supabase
          .from('message_insights')
          .upsert(insights, { 
            onConflict: 'session_id,user_message',
            ignoreDuplicates: true 
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          errors += insights.length;
        } else {
          analyzed += insights.length;
        }

      } catch (error) {
        console.error(`Error processing batch ${i}-${i + batchSize}:`, error);
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
      limit_count: limit
    });

    if (error) {
      console.error('Error fetching top topics:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Obtém estatísticas de sentimento
   */
  async getSentimentStats(period: Period) {
    const [startDate, endDate] = getDateRangeByPeriod(period, '7days');

    const { data, error } = await supabase
      .from('message_insights')
      .select('sentiment, sentiment_score')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) {
      console.error('Error fetching sentiment stats:', error);
      return null;
    }

    const total = data.length;
    const positive = data.filter(d => d.sentiment === 'positive').length;
    const negative = data.filter(d => d.sentiment === 'negative').length;
    const neutral = data.filter(d => d.sentiment === 'neutral').length;

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