import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LegalDocumentViewer } from './LegalDocumentViewer';
import type { LegalDocument } from '@/types/legal';
import { FileText, Shield, Cookie } from 'lucide-react';

interface ConsentDialogProps {
  open: boolean;
  documents: LegalDocument[];
  onAcceptAll: () => Promise<void>;
}

export const ConsentDialog = ({ open, documents, onAcceptAll }: ConsentDialogProps) => {
  const [consents, setConsents] = useState({
    terms: false,
    privacy: false,
    cookies: false
  });
  const [loading, setLoading] = useState(false);

  const termsDoc = documents.find(d => d.document_type === 'terms');
  const privacyDoc = documents.find(d => d.document_type === 'privacy');
  const cookiesDoc = documents.find(d => d.document_type === 'cookies');

  const allAccepted = consents.terms && consents.privacy && consents.cookies;

  const handleAccept = async () => {
    if (!allAccepted) return;
    
    setLoading(true);
    try {
      await onAcceptAll();
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'terms': return <FileText className="h-4 w-4" />;
      case 'privacy': return <Shield className="h-4 w-4" />;
      case 'cookies': return <Cookie className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-4xl max-h-[90vh]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Termos de Uso e Políticas</DialogTitle>
          <DialogDescription>
            Por favor, leia e aceite nossos termos de uso, política de privacidade e política de cookies para continuar.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="terms" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="terms" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Termos de Uso
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacidade
            </TabsTrigger>
            <TabsTrigger value="cookies" className="flex items-center gap-2">
              <Cookie className="h-4 w-4" />
              Cookies
            </TabsTrigger>
          </TabsList>

          {termsDoc && (
            <TabsContent value="terms">
              <LegalDocumentViewer
                title={termsDoc.title}
                content={termsDoc.content}
                effectiveDate={termsDoc.effective_date}
                showHeader={false}
              />
            </TabsContent>
          )}

          {privacyDoc && (
            <TabsContent value="privacy">
              <LegalDocumentViewer
                title={privacyDoc.title}
                content={privacyDoc.content}
                effectiveDate={privacyDoc.effective_date}
                showHeader={false}
              />
            </TabsContent>
          )}

          {cookiesDoc && (
            <TabsContent value="cookies">
              <LegalDocumentViewer
                title={cookiesDoc.title}
                content={cookiesDoc.content}
                effectiveDate={cookiesDoc.effective_date}
                showHeader={false}
              />
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter className="flex-col sm:flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent-terms"
                checked={consents.terms}
                onCheckedChange={(checked) => 
                  setConsents(prev => ({ ...prev, terms: checked as boolean }))
                }
              />
              <label
                htmlFor="consent-terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Li e aceito os Termos de Uso
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent-privacy"
                checked={consents.privacy}
                onCheckedChange={(checked) => 
                  setConsents(prev => ({ ...prev, privacy: checked as boolean }))
                }
              />
              <label
                htmlFor="consent-privacy"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Li e aceito a Política de Privacidade
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent-cookies"
                checked={consents.cookies}
                onCheckedChange={(checked) => 
                  setConsents(prev => ({ ...prev, cookies: checked as boolean }))
                }
              />
              <label
                htmlFor="consent-cookies"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Li e aceito a Política de Cookies
              </label>
            </div>
          </div>

          <Button 
            onClick={handleAccept} 
            disabled={!allAccepted || loading}
            className="w-full"
          >
            {loading ? 'Registrando...' : 'Aceitar e Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
