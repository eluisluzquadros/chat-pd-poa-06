import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface FeedbackAnalyticsProps {
  dateRange?: string;
  showDetails?: boolean;
}

export function FeedbackAnalytics({
  dateRange = 'last_7_days',
  showDetails = true
}: FeedbackAnalyticsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            O componente Feedback Analytics está temporariamente desabilitado.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}