import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🧹 Starting QA history reset...');

    // Get current statistics before deletion
    const { data: statsRuns } = await supabase
      .from('qa_validation_runs')
      .select('id', { count: 'exact' });

    const { data: statsResults } = await supabase
      .from('qa_validation_results')
      .select('id', { count: 'exact' });

    const { data: statsTokens } = await supabase
      .from('qa_token_usage')
      .select('id', { count: 'exact' });

    const { data: statsReports } = await supabase
      .from('qa_automated_reports')
      .select('id', { count: 'exact' });

    const { data: statsInsights } = await supabase
      .from('qa_learning_insights')
      .select('id', { count: 'exact' });

    const initialStats = {
      runs: statsRuns?.length || 0,
      results: statsResults?.length || 0,
      tokens: statsTokens?.length || 0,
      reports: statsReports?.length || 0,
      insights: statsInsights?.length || 0
    };

    console.log('📊 Initial statistics:', initialStats);

    // Delete in order (respecting foreign key constraints)
    console.log('🗑️ Deleting qa_validation_results...');
    const { error: resultsError } = await supabase
      .from('qa_validation_results')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (resultsError) {
      console.error('❌ Error deleting validation results:', resultsError);
      throw resultsError;
    }

    console.log('🗑️ Deleting qa_token_usage...');
    const { error: tokensError } = await supabase
      .from('qa_token_usage')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (tokensError) {
      console.error('❌ Error deleting token usage:', tokensError);
      throw tokensError;
    }

    console.log('🗑️ Deleting qa_automated_reports...');
    const { error: reportsError } = await supabase
      .from('qa_automated_reports')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (reportsError) {
      console.error('❌ Error deleting automated reports:', reportsError);
      throw reportsError;
    }

    console.log('🗑️ Deleting qa_learning_insights...');
    const { error: insightsError } = await supabase
      .from('qa_learning_insights')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (insightsError) {
      console.error('❌ Error deleting learning insights:', insightsError);
      throw insightsError;
    }

    console.log('🗑️ Deleting qa_validation_runs...');
    const { error: runsError } = await supabase
      .from('qa_validation_runs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (runsError) {
      console.error('❌ Error deleting validation runs:', runsError);
      throw runsError;
    }

    // Verify deletion
    const { data: finalRuns } = await supabase
      .from('qa_validation_runs')
      .select('id', { count: 'exact' });

    const { data: finalResults } = await supabase
      .from('qa_validation_results')
      .select('id', { count: 'exact' });

    const finalStats = {
      runs: finalRuns?.length || 0,
      results: finalResults?.length || 0,
      tokens: 0,
      reports: 0,
      insights: 0
    };

    const deletedStats = {
      runs: initialStats.runs - finalStats.runs,
      results: initialStats.results - finalStats.results,
      tokens: initialStats.tokens,
      reports: initialStats.reports,
      insights: initialStats.insights
    };

    console.log('✅ QA history reset completed successfully');
    console.log('📊 Final statistics:', finalStats);
    console.log('🗑️ Deleted items:', deletedStats);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Histórico QA resetado com sucesso',
        initialStats,
        finalStats,
        deletedStats,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in qa-reset-history:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});