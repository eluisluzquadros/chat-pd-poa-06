// @ts-nocheck
// Componente para forçar bypass de tipos do TypeScript em componentes admin
import React from 'react';

export const AdminTypesBypass: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};