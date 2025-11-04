import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Settings } from 'lucide-react';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import { useCookiePreferences } from '@/hooks/useCookiePreferences';

export const CookieBanner = () => {
  const { hasSetPreferences, acceptAll, rejectNonEssential } = useCookiePreferences();
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (hasSetPreferences || dismissed) {
    return null;
  }

  const handleAcceptAll = async () => {
    await acceptAll();
  };

  const handleRejectNonEssential = async () => {
    await rejectNonEssential();
  };

  return (
    <>
      <Card className="fixed bottom-0 left-0 right-0 z-50 m-4 p-4 shadow-lg border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold mb-1">🍪 Cookies e Privacidade</h3>
            <p className="text-sm text-muted-foreground">
              Utilizamos cookies para melhorar sua experiência. Você pode aceitar todos os cookies ou personalizá-los.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModal(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Personalizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectNonEssential}
            >
              Rejeitar Não-Essenciais
            </Button>
            <Button
              size="sm"
              onClick={handleAcceptAll}
            >
              Aceitar Todos
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 sm:relative sm:top-0 sm:right-0"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <CookiePreferencesModal
        open={showModal}
        onOpenChange={setShowModal}
      />
    </>
  );
};
