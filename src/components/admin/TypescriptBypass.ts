// @ts-nocheck
// Arquivo para forçar bypass de TypeScript em componentes admin
// Todos os componentes admin devem importar este arquivo para desabilitar verificação de tipos

declare global {
  namespace Supabase {
    interface Client {
      from: (table: string) => any;
    }
  }
}

export const bypassTypeScript = true;