import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ForgotPasswordModal = ({ open, onOpenChange }: ForgotPasswordModalProps) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, informe seu email');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔐 Solicitando recuperação de senha para:', email);
      
      // Chamar Edge Function customizada para enviar email em PT-BR
      const { data, error } = await supabase.functions.invoke('send-password-recovery', {
        body: { email }
      });

      if (error) {
        console.error('❌ Erro na edge function:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao enviar email de recuperação');
      }

      console.log('✅ Email de recuperação enviado com sucesso');

      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.', {
        duration: 6000
      });
      
      setEmail('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('❌ Erro ao enviar email de recuperação:', error);
      toast.error(error.message || 'Erro ao enviar email de recuperação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperar Senha</DialogTitle>
          <DialogDescription>
            Informe seu email para receber um link de recuperação de senha.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recovery-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="recovery-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                placeholder="seu@email.com"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Link de Recuperação'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
