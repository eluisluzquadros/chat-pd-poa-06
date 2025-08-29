
// Shared utility functions for the create-user-from-interest edge function

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export interface InterestRecord {
  id: string;
  email: string;
  full_name: string;
  newsletter_opt_in: boolean | null;
}

export interface CreateUserRequest {
  interest: InterestRecord;
  password: string;
  role: string;
}

export function validateRequest(requestBody: any): { valid: boolean; error?: string } {
  console.log("Validating request body:", JSON.stringify(requestBody, null, 2));
  
  if (!requestBody) {
    return { valid: false, error: "Missing request body" };
  }
  
  const { interest, password, role } = requestBody;

  if (!interest) {
    return { valid: false, error: "Missing required field: interest" };
  }
  
  if (!password) {
    return { valid: false, error: "Missing required field: password" };
  }
  
  if (!role) {
    return { valid: false, error: "Missing required field: role" };
  }
  
  // Validate interest record
  if (!interest.id) {
    return { valid: false, error: "Missing required field: interest.id" };
  }
  
  if (!interest.email) {
    return { valid: false, error: "Missing required field: interest.email" };
  }
  
  if (!interest.full_name) {
    return { valid: false, error: "Missing required field: interest.full_name" };
  }
  
  
  // Additional validation for password strength
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }
  
  // Validate role
  const validRoles = ["admin", "supervisor", "analyst", "citizen"];
  if (!validRoles.includes(role)) {
    return { valid: false, error: `Invalid role. Must be one of: ${validRoles.join(", ")}` };
  }
  
  console.log("Request validation passed");
  return { valid: true };
}
