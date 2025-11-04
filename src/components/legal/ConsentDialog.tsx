import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LegalDocumentViewer } from './LegalDocumentViewer';
import { LegalNavigationSidebar } from './LegalNavigationSidebar';
import { ConsentCheckbox } from './ConsentCheckbox';
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
  const [activeSection, setActiveSection] = useState('terms');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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

  const handleNavigate = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  // Detect active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['terms', 'privacy', 'cookies'];
      const scrollPosition = scrollAreaRef.current?.scrollTop || 0;
      
      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop - 100 && scrollPosition < offsetTop + offsetHeight - 100) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.addEventListener('scroll', handleScroll);
      return () => scrollArea.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <Dialog open={open}>
      <DialogContent 
        className="max-w-5xl h-[85vh] flex flex-col p-0" 
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle>Termos de Uso e Políticas</DialogTitle>
            <DialogDescription>
              Por favor, leia e aceite nossos documentos para continuar.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden px-6">
          {/* Navigation Sidebar - Hidden on mobile */}
          <div className="hidden md:block">
            <LegalNavigationSidebar 
              activeSection={activeSection}
              onNavigate={handleNavigate}
            />
          </div>

          {/* Unified scrollable content */}
          <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
            <div className="space-y-6 pb-4">
              {termsDoc && (
                <>
                  <LegalDocumentViewer
                    id="terms"
                    title={termsDoc.title}
                    content={termsDoc.content}
                    effectiveDate={termsDoc.effective_date}
                    showHeader={true}
                    compact={true}
                    showCard={false}
                  />
                  <Separator className="my-6" />
                </>
              )}

              {privacyDoc && (
                <>
                  <LegalDocumentViewer
                    id="privacy"
                    title={privacyDoc.title}
                    content={privacyDoc.content}
                    effectiveDate={privacyDoc.effective_date}
                    showHeader={true}
                    compact={true}
                    showCard={false}
                  />
                  <Separator className="my-6" />
                </>
              )}

              {cookiesDoc && (
                <LegalDocumentViewer
                  id="cookies"
                  title={cookiesDoc.title}
                  content={cookiesDoc.content}
                  effectiveDate={cookiesDoc.effective_date}
                  showHeader={true}
                  compact={true}
                  showCard={false}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Sticky Footer */}
        <DialogFooter className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t pt-4 pb-6 px-6 shadow-lg mt-0">
          <div className="w-full space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ConsentCheckbox
                id="consent-terms"
                checked={consents.terms}
                onCheckedChange={(checked) => 
                  setConsents(prev => ({ ...prev, terms: checked }))
                }
                icon={FileText}
                label="Li e aceito os Termos de Uso"
              />
              
              <ConsentCheckbox
                id="consent-privacy"
                checked={consents.privacy}
                onCheckedChange={(checked) => 
                  setConsents(prev => ({ ...prev, privacy: checked }))
                }
                icon={Shield}
                label="Li e aceito a Política de Privacidade"
              />
              
              <ConsentCheckbox
                id="consent-cookies"
                checked={consents.cookies}
                onCheckedChange={(checked) => 
                  setConsents(prev => ({ ...prev, cookies: checked }))
                }
                icon={Cookie}
                label="Li e aceito a Política de Cookies"
              />
            </div>

            <Button 
              onClick={handleAccept} 
              disabled={!allAccepted || loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Registrando...' : 'Aceitar e Continuar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
