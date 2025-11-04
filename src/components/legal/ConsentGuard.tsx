import { useEffect } from 'react';
import { useLegalConsents } from '@/hooks/useLegalConsents';
import { ConsentDialog } from './ConsentDialog';

export const ConsentGuard = ({ children }: { children: React.ReactNode }) => {
  const { needsConsent, documents, acceptAllConsents, loading } = useLegalConsents();

  if (loading) {
    return null;
  }

  return (
    <>
      <ConsentDialog
        open={needsConsent}
        documents={documents}
        onAcceptAll={acceptAllConsents}
      />
      {children}
    </>
  );
};
