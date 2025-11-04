import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLegalConsents } from '@/hooks/useLegalConsents';
import { useCookiePreferences } from '@/hooks/useCookiePreferences';
import { FileText, Shield, Cookie } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { LegalDocumentViewer } from '../legal/LegalDocumentViewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LegalDocument } from '@/types/legal';

const PrivacyTab = () => {
  const { consents, documents, loading: consentsLoading } = useLegalConsents();
  const { preferences, updatePreferences, loading: prefsLoading } = useCookiePreferences();
  const [viewingDocument, setViewingDocument] = useState<LegalDocument | null>(null);

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'terms': return <FileText className="h-5 w-5" />;
      case 'privacy': return <Shield className="h-5 w-5" />;
      case 'cookies': return <Cookie className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getDocumentTitle = (type: string) => {
    switch (type) {
      case 'terms': return 'Termos de Uso';
      case 'privacy': return 'Política de Privacidade';
      case 'cookies': return 'Política de Cookies';
      default: return type;
    }
  };

  const getConsentDate = (type: string) => {
    const consent = consents.find(c => c.document_type === type);
    return consent?.consented_at;
  };

  if (consentsLoading || prefsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Documentos Legais */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos Legais</CardTitle>
          <CardDescription>
            Visualize e gerencie seus consentimentos para os documentos legais da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.map((doc) => {
            const consentDate = getConsentDate(doc.document_type);
            return (
              <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getDocumentIcon(doc.document_type)}
                  <div>
                    <h4 className="font-medium">{getDocumentTitle(doc.document_type)}</h4>
                    {consentDate && (
                      <p className="text-sm text-muted-foreground">
                        Aceito {formatDistanceToNow(new Date(consentDate), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingDocument(doc)}
                >
                  Visualizar
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Preferências de Cookies */}
      <Card>
        <CardHeader>
          <CardTitle>Preferências de Cookies</CardTitle>
          <CardDescription>
            Gerencie quais cookies você permite que sejam armazenados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="essential" className="font-medium">
                Cookies Essenciais
              </Label>
              <p className="text-sm text-muted-foreground">
                Necessários para o funcionamento básico do site
              </p>
            </div>
            <Switch id="essential" checked={true} disabled />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="analytics" className="font-medium">
                Cookies de Análise
              </Label>
              <p className="text-sm text-muted-foreground">
                Ajudam a melhorar a experiência através de métricas
              </p>
            </div>
            <Switch
              id="analytics"
              checked={preferences.analytics_cookies}
              onCheckedChange={(checked) =>
                updatePreferences({ analytics_cookies: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label htmlFor="functional" className="font-medium">
                Cookies de Funcionalidade
              </Label>
              <p className="text-sm text-muted-foreground">
                Permitem recursos avançados e personalizações
              </p>
            </div>
            <Switch
              id="functional"
              checked={preferences.functional_cookies}
              onCheckedChange={(checked) =>
                updatePreferences({ functional_cookies: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Dialog para visualizar documentos */}
      <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingDocument?.title}</DialogTitle>
          </DialogHeader>
          {viewingDocument && (
            <LegalDocumentViewer
              title={viewingDocument.title}
              content={viewingDocument.content}
              effectiveDate={viewingDocument.effective_date}
              showHeader={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrivacyTab;
