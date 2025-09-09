// Temporary type overrides for admin components to bypass Supabase TypeScript issues

// Global type overrides
declare global {
  interface Window {
    supabase: any;
  }
}

export {};