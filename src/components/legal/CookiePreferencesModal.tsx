import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCookiePreferences } from '@/hooks/useCookiePreferences';
import { useState } from 'react';

interface CookiePreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CookiePreferencesModal = ({ open, onOpenChange }: CookiePreferencesModalProps) => {
  const { preferences, updatePreferences } = useCookiePreferences();
  const [localPreferences, setLocalPreferences] = useState(preferences);

  const handleSave = async () => {
    await updatePreferences(localPreferences);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preferências de Cookies</DialogTitle>
          <DialogDescription>
            Personalize quais cookies deseja aceitar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="essential" className="font-medium">
                Cookies Essenciais
              </Label>
              <p className="text-sm text-muted-foreground">
                Necessários para o funcionamento básico do site. Sempre ativos.
              </p>
            </div>
            <Switch
              id="essential"
              checked={true}
              disabled
            />
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="analytics" className="font-medium">
                Cookies de Análise
              </Label>
              <p className="text-sm text-muted-foreground">
                Ajudam a entender como os visitantes interagem com o site.
              </p>
            </div>
            <Switch
              id="analytics"
              checked={localPreferences.analytics_cookies}
              onCheckedChange={(checked) =>
                setLocalPreferences(prev => ({ ...prev, analytics_cookies: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="functional" className="font-medium">
                Cookies de Funcionalidade
              </Label>
              <p className="text-sm text-muted-foreground">
                Permitem recursos aprimorados e personalizações.
              </p>
            </div>
            <Switch
              id="functional"
              checked={localPreferences.functional_cookies}
              onCheckedChange={(checked) =>
                setLocalPreferences(prev => ({ ...prev, functional_cookies: checked }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Preferências
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
