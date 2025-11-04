import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { platformSettingsService } from '@/services/platformSettingsService';

export function PlatformGeneralSettings() {
  const [allowUserModelSelection, setAllowUserModelSelection] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [originalValue, setOriginalValue] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settings = await platformSettingsService.getAllSettings();
      const userSelectionSetting = settings.find(s => s.key === 'allow_user_model_selection');
      
      if (userSelectionSetting) {
        const value = userSelectionSetting.value === true || userSelectionSetting.value === 'true';
        setAllowUserModelSelection(value);
        setOriginalValue(value);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const success = await platformSettingsService.updateSetting(
        'allow_user_model_selection',
        allowUserModelSelection
      );

      if (success) {
        toast.success('Configuração salva com sucesso');
        setOriginalValue(allowUserModelSelection);
      } else {
        toast.error('Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setAllowUserModelSelection(originalValue);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1 flex-1">
          <Label htmlFor="user-model-selection" className="text-sm font-medium">
            Seleção de Modelos por Usuários
          </Label>
          <p className="text-xs text-muted-foreground">
            Permite que usuários comuns selecionem o modelo LLM desejado na interface de chat
          </p>
        </div>
        <Switch
          id="user-model-selection"
          checked={allowUserModelSelection}
          onCheckedChange={setAllowUserModelSelection}
        />
      </div>

      <div className="flex gap-2">
        <Button 
          size="sm" 
          onClick={handleSave}
          disabled={isSaving || allowUserModelSelection === originalValue}
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          Salvar
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={handleReset}
          disabled={allowUserModelSelection === originalValue}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Resetar
        </Button>
      </div>
    </div>
  );
}
