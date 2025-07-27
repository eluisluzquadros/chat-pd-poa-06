
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders, validateRequest } from "./utils.ts";
import { checkExistingAuthUser, checkExistingUserAccount, createAuthUser } from "./auth-service.ts";
import { createProfile, createUserAccount, setUserRole, updateInterestStatus } from "./user-service.ts";

serve(async (req) => {
  console.log("Edge function received request", req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ 
          error: "Server configuration error: Missing required environment variables" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Initialize the Supabase client with the service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body parsed successfully");
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request body: Unable to parse JSON" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("Processing request body:", JSON.stringify(requestBody, null, 2));

    // Validate the request
    const validation = validateRequest(requestBody);
    if (!validation.valid) {
      console.error("Request validation failed:", validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { interest, password, role } = requestBody;
    console.log("Starting user creation process for:", interest.email);

    try {
      // Check if a user with this email already exists in user_accounts
      // This extra check helps avoid situations where auth user might exist but records are missing
      const { data: existingAccounts, error: existingAccountError } = await supabase
        .from("user_accounts")
        .select("email, user_id")
        .eq("email", interest.email)
        .limit(1);
        
      if (existingAccountError) {
        console.error("Error checking for existing account:", existingAccountError);
      } else if (existingAccounts && existingAccounts.length > 0) {
        console.log("User account already exists:", existingAccounts[0]);
        throw new Error("Este email já está cadastrado como usuário");
      }
      
      let user;
      
      // Check if a user with this email already exists in the auth system
      const existingAuthUser = await checkExistingAuthUser(supabase, interest.email);
      
      if (existingAuthUser) {
        console.log("Found existing auth user, will use it instead of creating a new one");
        user = existingAuthUser;
        
        // Update the user's password if provided
        if (password) {
          console.log("Updating password for existing user");
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { password: password }
          );
          
          if (updateError) {
            console.error("Error updating user password:", updateError);
            // Continue anyway, not a critical error
          }
        }
      } else {
        // No existing auth user, proceed with creating one
        console.log("No existing auth user found, creating new auth user");
        user = await createAuthUser(supabase, interest.email, password, interest.full_name);
      }
      
      console.log("Using user with ID:", user.id);
      
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
        
      if (!existingProfile) {
        // Create the profile entry
        await createProfile(supabase, user.id, interest.full_name);
        console.log("Profile created for user");
      } else {
        console.log("Profile already exists for user");
      }
      
      // Check if user account exists
      const { data: existingAccount } = await supabase
        .from("user_accounts")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (!existingAccount) {
        // Create user account
        console.log("Creating user account for user ID:", user.id);
        await createUserAccount(supabase, user.id, interest, role);
        console.log("User account created successfully");
      } else {
        console.log("User account already exists:", existingAccount.id);
      }
      
      // Check if user role exists
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (!existingRole) {
        // Set user role
        await setUserRole(supabase, user.id, role);
        console.log("User role set to:", role);
      } else {
        console.log("User role already exists");
      }
      
      // Update interest manifestation
      await updateInterestStatus(supabase, interest.id);
      console.log("Interest manifestation status updated");

      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: user.id 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (error) {
      console.error("Operation error:", error);
      return new Response(
        JSON.stringify({ 
          error: error.message || "Ocorreu um erro ao processar a requisição" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Ocorreu um erro ao processar a requisição" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
