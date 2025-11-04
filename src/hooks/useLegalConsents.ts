import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LegalService } from '@/services/legalService';
import type { UserConsent, LegalDocument, DocumentType } from '@/types/legal';
import { toast } from 'sonner';

export const useLegalConsents = () => {
  const { user } = useAuth();
  const [consents, setConsents] = useState<UserConsent[]>([]);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAllConsents, setHasAllConsents] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [userConsents, activeDocuments] = await Promise.all([
        LegalService.getUserConsents(user.id),
        LegalService.getActiveLegalDocuments()
      ]);

      setConsents(userConsents);
      setDocuments(activeDocuments);

      const hasAll = await LegalService.checkUserHasAllConsents(user.id);
      setHasAllConsents(hasAll);
      setNeedsConsent(!hasAll);
    } catch (error) {
      console.error('Error loading legal consents:', error);
      toast.error('Erro ao carregar consentimentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const acceptConsent = async (documentType: DocumentType) => {
    if (!user) return;

    try {
      const document = documents.find(d => d.document_type === documentType);
      if (!document) {
        throw new Error('Documento não encontrado');
      }

      const metadata = LegalService.getClientMetadata();
      await LegalService.createConsent(
        user.id,
        document.id,
        documentType,
        document.version,
        metadata
      );

      await loadData();
      toast.success('Consentimento registrado com sucesso');
    } catch (error) {
      console.error('Error accepting consent:', error);
      toast.error('Erro ao registrar consentimento');
      throw error;
    }
  };

  const acceptAllConsents = async () => {
    if (!user) return;

    try {
      const metadata = LegalService.getClientMetadata();
      
      for (const document of documents) {
        const existingConsent = consents.find(
          c => c.document_type === document.document_type && !c.revoked_at
        );

        if (!existingConsent) {
          await LegalService.createConsent(
            user.id,
            document.id,
            document.document_type as DocumentType,
            document.version,
            metadata
          );
        }
      }

      await loadData();
      toast.success('Todos os consentimentos foram registrados');
    } catch (error) {
      console.error('Error accepting all consents:', error);
      toast.error('Erro ao registrar consentimentos');
      throw error;
    }
  };

  const revokeConsent = async (consentId: string) => {
    try {
      await LegalService.revokeConsent(consentId);
      await loadData();
      toast.success('Consentimento revogado');
    } catch (error) {
      console.error('Error revoking consent:', error);
      toast.error('Erro ao revogar consentimento');
      throw error;
    }
  };

  return {
    consents,
    documents,
    loading,
    hasAllConsents,
    needsConsent,
    acceptConsent,
    acceptAllConsents,
    revokeConsent,
    refreshConsents: loadData
  };
};
