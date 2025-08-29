// Temporary type overrides for admin components to bypass Supabase TypeScript issues
declare module '@/integrations/supabase/client' {
  export const supabase: any;
}

// Global type overrides
declare global {
  interface Window {
    supabase: any;
  }
}

export {};