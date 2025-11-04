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
  const [allConsentsAccepted, setAllConsentsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('terms');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const termsDoc = documents.find(d => d.document_type === 'terms');
  const privacyDoc = documents.find(d => d.document_type === 'privacy');
  const cookiesDoc = documents.find(d => d.document_type === 'cookies');

  const handleAccept = async () => {
    if (!allConsentsAccepted) return;
    
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
        {/* Header - fixo */}
        <div className="px-6 pt-6 flex-shrink-0">
          <DialogHeader>
            <DialogTitle>Termos de Uso e Políticas</DialogTitle>
            <DialogDescription>
              Por favor, leia e aceite nossos documentos para continuar.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Conteúdo scrollável - ocupa espaço restante */}
        <div className="flex-1 flex gap-4 overflow-hidden px-6 min-h-0">
          {/* Navigation Sidebar - Hidden on mobile */}
          <div className="hidden md:block">
            <LegalNavigationSidebar 
              activeSection={activeSection}
              onNavigate={handleNavigate}
            />
          </div>

          {/* Unified scrollable content */}
          <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
            <div className="space-y-6 pb-8">
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

        {/* Footer - fixo no fundo */}
        <div className="flex-shrink-0 bg-background border-t pt-3 pb-4 px-6 shadow-lg">
          <div className="w-full space-y-3">
            <div className="flex justify-center">
              <ConsentCheckbox
                id="consent-all"
                checked={allConsentsAccepted}
                onCheckedChange={setAllConsentsAccepted}
                icon={FileText}
                label="Li e aceito os Termos de Uso, Política de Privacidade e Política de Cookies"
              />
            </div>

            <Button 
              onClick={handleAccept} 
              disabled={!allConsentsAccepted || loading}
              className="w-full"
            >
              {loading ? 'Registrando...' : 'Aceitar e Continuar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
