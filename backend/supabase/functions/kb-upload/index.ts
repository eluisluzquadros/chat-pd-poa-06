import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

async function requireAdmin(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return { ok: false, error: "missing token" };

  // Validate JWT
  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData?.user) return { ok: false, error: "invalid token" };

  // Use user-scoped client so auth.uid() works inside RPC
  const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: roleData, error: roleErr } = await supabaseUser.rpc("get_current_user_role");
  if (roleErr) return { ok: false, error: roleErr.message };

  const role = typeof roleData === "string" ? roleData : (Array.isArray(roleData) ? roleData[0] : null);
  if (role !== "admin" && role !== "supervisor") return { ok: false, error: "forbidden" };
  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authCheck = await requireAdmin(req);
    if (!authCheck.ok) {
      return new Response(JSON.stringify({ ok: false, error: authCheck.error }), {
        status: authCheck.error === "forbidden" ? 403 : 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const files = form.getAll("files");
    const targetPrefix = (form.get("prefix") as string) || "knowledgebase/";

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "No files provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const f of files) {
      if (!(f instanceof File)) continue;
      const arrayBuffer = await f.arrayBuffer();
      const path = `${targetPrefix}${f.name}`;

      const { data, error } = await supabaseAdmin.storage
        .from("documents")
        .upload(path, new Uint8Array(arrayBuffer), {
          contentType: f.type || (f.name.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : f.name.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/octet-stream'),
          upsert: true,
        } as any);

      if (error) {
        results.push({ file: f.name, ok: false, error: error.message });
      } else {
        results.push({ file: f.name, ok: true, path: data?.path ?? path });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kb-upload error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
