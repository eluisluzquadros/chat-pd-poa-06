
import { InterestRecord } from "./utils.ts";

export async function createProfile(supabase: any, userId: string, fullName: string) {
  try {
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        full_name: fullName,
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      throw new Error(profileError.message);
    }

    console.log("Profile created successfully");
    return true;
  } catch (error) {
    console.error("Error in createProfile:", error);
    throw error;
  }
}

export async function createUserAccount(
  supabase: any, 
  userId: string, 
  interest: InterestRecord, 
  role: string
) {
  try {
    console.log("Creating user account with data:", { 
      userId, 
      fullName: interest.full_name, 
      email: interest.email, 
      role 
    });
    
    // First check if an account already exists to avoid duplicates
    const { data: existingAccount, error: checkError } = await supabase
      .from("user_accounts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
      
    if (checkError) {
      console.error("Error checking for existing user account:", checkError);
    }
    
    if (existingAccount) {
      console.log("User account already exists for user ID:", userId);
      return true;
    }
    
    // Create new user account
    const { data, error: accountError } = await supabase
      .from("user_accounts")
      .insert({
        user_id: userId,
        full_name: interest.full_name,
        email: interest.email,
        cpf: interest.cpf || null,
        city: interest.city || null,
        organization: interest.organization,
        organization_size: interest.organization_size,
        newsletter: interest.newsletter_opt_in || false,
        role: role,
        active: true,
        profile_id: userId,
      })
      .select()
      .single();

    if (accountError) {
      console.error("Error creating account:", accountError);
      throw new Error(accountError.message);
    }

    console.log("User account created successfully with ID:", data.id);
    return true;
  } catch (error) {
    console.error("Error in createUserAccount:", error);
    throw error;
  }
}

export async function setUserRole(supabase: any, userId: string, role: string) {
  try {
    // First check if role already exists
    const { data: existingRole, error: checkError } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
      
    if (checkError) {
      console.error("Error checking for existing role:", checkError);
    }
    
    if (existingRole) {
      console.log("User role already exists for user ID:", userId);
      return true;
    }
    
    // Create new role
    const { data, error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role: role,
      })
      .select()
      .single();

    if (roleError) {
      console.error("Error setting user role:", roleError);
      throw new Error(roleError.message);
    }

    console.log("User role set successfully with ID:", data.id);
    return true;
  } catch (error) {
    console.error("Error in setUserRole:", error);
    throw error;
  }
}

export async function updateInterestStatus(supabase: any, interestId: string) {
  try {
    const { data, error: updateError } = await supabase
      .from("interest_manifestations")
      .update({
        account_created: true,
        status: "approved",
      })
      .eq("id", interestId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating interest:", updateError);
      throw new Error(updateError.message);
    }

    console.log("Interest manifestation updated successfully:", data.id);
    return true;
  } catch (error) {
    console.error("Error in updateInterestStatus:", error);
    throw error;
  }
}
