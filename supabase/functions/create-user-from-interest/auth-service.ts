
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "./utils.ts";

export async function checkExistingAuthUser(supabase: any, email: string) {
  try {
    console.log("Checking for existing auth user with email:", email);
    
    // Instead of using .listUsers with filter, directly query the auth users
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error("Error checking for existing auth user:", error);
      throw new Error("Error checking for existing user in authentication: " + error.message);
    }

    // Manually filter the users array to find matching email, with type checking
    const existingUser = data?.users?.find((user: any) => 
      user && typeof user === 'object' && 'email' in user && user.email === email
    );
    
    if (existingUser) {
      console.log("Found existing auth user:", existingUser.id);
      return existingUser;
    }
    
    console.log("No existing auth user found with email:", email);
    return null;
  } catch (error) {
    console.error("Error in checkExistingAuthUser:", error);
    throw error;
  }
}

export async function checkExistingUserAccount(supabase: any, email: string) {
  try {
    console.log("Checking for existing user account with email:", email);
    
    const { data: existingUsers, error: existingUserError } = await supabase
      .from("user_accounts")
      .select("email, user_id")
      .eq("email", email)
      .limit(1);

    if (existingUserError) {
      console.error("Error checking for existing user:", existingUserError);
      throw new Error("Error checking for existing user: " + existingUserError.message);
    }

    if (existingUsers && existingUsers.length > 0) {
      console.log("Found existing user account:", existingUsers[0]);
      throw new Error("Usuário com este email já existe");
    }
    
    console.log("No existing user account found with email:", email);
    return null;
  } catch (error) {
    console.error("Error in checkExistingUserAccount:", error);
    throw error;
  }
}

export async function createAuthUser(supabase: any, email: string, password: string, fullName: string) {
  try {
    console.log("Creating auth user for:", { email, fullName });

    // First check if this user already exists in the auth system 
    const { data: authUserData } = await supabase.auth.admin.listUsers();
    
    // Manually filter the users array to find matching email, with type checking
    const existingAuthUser = authUserData?.users?.find((user: any) => 
      user && typeof user === 'object' && 'email' in user && user.email === email
    );
    
    if (existingAuthUser) {
      console.log("Auth user already exists, returning existing user:", existingAuthUser.id);
      return existingAuthUser;
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) {
      console.error("Error creating user:", authError);
      
      // If user already exists but is not returned in the check above,
      // try to retrieve them again
      if (authError.message.includes("User already registered")) {
        const { data: retryData } = await supabase.auth.admin.listUsers();
        
        // Manually filter again, with type checking
        const retryUser = retryData?.users?.find((user: any) => 
          user && typeof user === 'object' && 'email' in user && user.email === email
        );
        
        if (retryUser) {
          console.log("Found existing user on retry:", retryUser.id);
          return retryUser;
        }
      }
      
      throw new Error(authError.message);
    }

    if (!authData || !authData.user) {
      console.error("User creation returned no user");
      throw new Error("Falha ao criar usuário de autenticação");
    }

    console.log("Auth user created successfully with ID:", authData.user.id);
    return authData.user;
  } catch (error) {
    console.error("Error in createAuthUser:", error);
    throw error;
  }
}
