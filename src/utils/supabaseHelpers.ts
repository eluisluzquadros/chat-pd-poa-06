// Temporary helper to bypass TypeScript issues with Supabase queries
export const createTypeSafeSupabaseQuery = (supabase: any) => {
  return {
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: any) => supabase.from(table).select(columns).eq(column as any, value),
        neq: (column: string, value: any) => supabase.from(table).select(columns).neq(column as any, value),
        order: (column: string, options: any) => supabase.from(table).select(columns).order(column as any, options),
        or: (query: string) => supabase.from(table).select(columns).or(query),
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => supabase.from(table).update(data as any).eq(column as any, value),
      }),
      delete: () => ({
        eq: (column: string, value: any) => supabase.from(table).delete().eq(column as any, value),
        neq: (column: string, value: any) => supabase.from(table).delete().neq(column as any, value),
      }),
      insert: (data: any) => supabase.from(table).insert(data as any),
    })
  };
};

// Simple wrapper to make all Supabase operations bypass TypeScript
export const supabaseAny = (supabase: any) => supabase as any;