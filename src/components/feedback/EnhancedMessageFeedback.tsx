import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface EnhancedMessageFeedbackProps {
  messageId: string;
  sessionId: string;
  model: string;
  onFeedbackSubmitted?: () => void;
}

export function EnhancedMessageFeedback({
  messageId,
  sessionId,
  model,
  onFeedbackSubmitted
}: EnhancedMessageFeedbackProps) {
  return (
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        O componente Enhanced Message Feedback está temporariamente desabilitado.
      </AlertDescription>
    </Alert>
  );
}