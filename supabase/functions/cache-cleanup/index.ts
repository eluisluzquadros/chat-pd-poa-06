import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupRequest {
  force?: boolean; // Force cleanup of all entries
  maxAge?: number; // Max age in hours (default: 168 = 7 days)
  minHits?: number; // Minimum hit count to keep (default: 2)
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      force = false,
      maxAge = 168, // 7 days default
      minHits = 2
    }: CleanupRequest = req.method === 'POST' ? await req.json() : {};

    console.log(`🧹 Starting cache cleanup - Force: ${force}, MaxAge: ${maxAge}h, MinHits: ${minHits}`);

    // Get cache statistics before cleanup
    const { data: beforeStats } = await supabase
      .from('query_cache')
      .select(`
        count(*),
        avg(hit_count),
        min(created_at),
        max(created_at)
      `)
      .single();

    let deletedCount = 0;

    if (force) {
      // Force cleanup - remove all entries
      console.log('🚨 Force cleanup - removing ALL cache entries');
      const { error, count } = await supabase
        .from('query_cache')
        .delete()
        .neq('id', 0); // Delete all

      if (error) throw error;
      deletedCount = count || 0;
    } else {
      // Smart cleanup based on criteria
      const maxAgeTimestamp = new Date(Date.now() - (maxAge * 60 * 60 * 1000)).toISOString();
      
      // Delete expired entries
      const { error: expiredError, count: expiredCount } = await supabase
        .from('query_cache')
        .delete()
        .lt('expires_at', 'now()');

      if (expiredError) throw expiredError;

      // Delete old entries with low hit count
      const { error: oldError, count: oldCount } = await supabase
        .from('query_cache')
        .delete()
        .and(`created_at.lt.${maxAgeTimestamp},hit_count.lt.${minHits}`);

      if (oldError) throw oldError;

      deletedCount = (expiredCount || 0) + (oldCount || 0);
    }

    // Get cache statistics after cleanup
    const { data: afterStats } = await supabase
      .from('query_cache')
      .select(`
        count(*),
        avg(hit_count),
        min(created_at),
        max(created_at)
      `)
      .single();

    // Log cleanup results
    console.log(`✅ Cache cleanup completed - Deleted ${deletedCount} entries`);
    console.log(`📊 Before: ${beforeStats?.count || 0} entries | After: ${afterStats?.count || 0} entries`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedEntries: deletedCount,
        statistics: {
          before: {
            totalEntries: beforeStats?.count || 0,
            avgHits: beforeStats?.avg || 0,
            oldestEntry: beforeStats?.min,
            newestEntry: beforeStats?.max
          },
          after: {
            totalEntries: afterStats?.count || 0,
            avgHits: afterStats?.avg || 0,
            oldestEntry: afterStats?.min,
            newestEntry: afterStats?.max
          }
        },
        message: `Cleanup completed: ${deletedCount} entries removed`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Cache cleanup error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});