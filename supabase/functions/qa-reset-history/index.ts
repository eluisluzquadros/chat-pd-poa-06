import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[qa-reset-history] Request received");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get JWT token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    console.log(`[qa-reset-history] User: ${user.id}`);

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !userRole) {
      console.error("[qa-reset-history] User is not admin");
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    console.log("[qa-reset-history] Admin verified, proceeding with reset");

    // Get current statistics
    const [runsResult, resultsResult, tokensResult] = await Promise.all([
      supabase.from("qa_validation_runs").select("id", { count: "exact" }),
      supabase.from("qa_validation_results").select("id", { count: "exact" }),
      supabase.from("qa_token_usage").select("id", { count: "exact" }).then(
        res => res,
        () => ({ count: 0, error: null }) // qa_token_usage might not exist
      ),
    ]);

    const initialStats = {
      runs: runsResult.count || 0,
      results: resultsResult.count || 0,
      tokens: tokensResult.count || 0,
    };

    console.log("[qa-reset-history] Initial stats:", initialStats);

    // Delete in order (FK constraints)
    console.log("[qa-reset-history] Deleting qa_validation_results...");
    const { error: resultsDeleteError } = await supabase
      .from("qa_validation_results")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (resultsDeleteError) {
      console.error("[qa-reset-history] Error deleting results:", resultsDeleteError);
      throw new Error(`Failed to delete results: ${resultsDeleteError.message}`);
    }

    console.log("[qa-reset-history] Deleting qa_validation_runs...");
    const { error: runsDeleteError } = await supabase
      .from("qa_validation_runs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (runsDeleteError) {
      console.error("[qa-reset-history] Error deleting runs:", runsDeleteError);
      throw new Error(`Failed to delete runs: ${runsDeleteError.message}`);
    }

    // Try to delete token usage (might not exist)
    console.log("[qa-reset-history] Deleting qa_token_usage (if exists)...");
    await supabase
      .from("qa_token_usage")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .then(
        () => console.log("[qa-reset-history] Token usage deleted"),
        () => console.log("[qa-reset-history] No token usage table found")
      );

    // Get final statistics
    const [finalRunsResult, finalResultsResult, finalTokensResult] = await Promise.all([
      supabase.from("qa_validation_runs").select("id", { count: "exact" }),
      supabase.from("qa_validation_results").select("id", { count: "exact" }),
      supabase.from("qa_token_usage").select("id", { count: "exact" }).then(
        res => res,
        () => ({ count: 0, error: null })
      ),
    ]);

    const finalStats = {
      runs: finalRunsResult.count || 0,
      results: finalResultsResult.count || 0,
      tokens: finalTokensResult.count || 0,
    };

    const deletedStats = {
      runs: initialStats.runs - finalStats.runs,
      results: initialStats.results - finalStats.results,
      tokens: initialStats.tokens - finalStats.tokens,
    };

    console.log("[qa-reset-history] Reset complete!");
    console.log("[qa-reset-history] Deleted:", deletedStats);
    console.log("[qa-reset-history] Final stats:", finalStats);

    // Log audit trail
    await supabase.from("audit_log").insert({
      user_id: user.id,
      action: "qa_history_reset",
      table_name: "qa_validation_runs",
      old_values: initialStats,
      new_values: finalStats,
    }).then(
      () => console.log("[qa-reset-history] Audit log created"),
      (err) => console.error("[qa-reset-history] Failed to create audit log:", err)
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "QA history reset successfully",
        initialStats,
        deletedStats,
        finalStats,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("[qa-reset-history] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
        details: error.stack,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
