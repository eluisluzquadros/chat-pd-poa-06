import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Brain, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  ThumbsUp, 
  ThumbsDown,
  Lightbulb,
  X
} from "lucide-react";
import { GapDetectionResult } from "@/hooks/useGapDetection";

interface GapDetectionAlertProps {
  gapResult: GapDetectionResult;
  onFeedback?: (feedback: 'helpful' | 'not_helpful' | 'resolved', notes?: string) => void;
  onDismiss?: () => void;
  showFeedback?: boolean;
}

export function GapDetectionAlert({ 
  gapResult, 
  onFeedback, 
  onDismiss,
  showFeedback = true 
}: GapDetectionAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!gapResult.gapDetected || isDismissed) {
    return null;
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const handleFeedback = (feedback: 'helpful' | 'not_helpful' | 'resolved') => {
    onFeedback?.(feedback);
    setFeedbackGiven(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getSeverityIcon(gapResult.severity)}
              <span className="font-medium text-sm">
                Gap de Conhecimento Detectado
              </span>
              {gapResult.severity && (
                <Badge variant={getSeverityColor(gapResult.severity)} className="text-xs">
                  {gapResult.severity.toUpperCase()}
                </Badge>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Basic Info */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Detectamos que esta consulta pode não ter uma resposta completa em nossa base de conhecimento.
            </p>
            
            {(gapResult.category || gapResult.topic) && (
              <div className="flex items-center gap-2">
                {gapResult.category && (
                  <Badge variant="outline" className="text-xs">
                    {gapResult.category}
                  </Badge>
                )}
                {gapResult.topic && (
                  <Badge variant="outline" className="text-xs">
                    {gapResult.topic}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Expandable Suggestions */}
          {gapResult.suggestions && gapResult.suggestions.length > 0 && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between h-8">
                  <span className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Ver sugestões de melhoria
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-2">
                <div className="bg-background/50 p-3 rounded-lg">
                  <ul className="space-y-1">
                    {gapResult.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Auto-escalation Notice */}
          {gapResult.shouldEscalate && (
            <Alert className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Este gap foi automaticamente escalonado para análise prioritária.
              </AlertDescription>
            </Alert>
          )}

          {/* Feedback Section */}
          {showFeedback && !feedbackGiven && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                Esta detecção foi útil?
              </span>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback('helpful')}
                  className="h-8 text-xs"
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Sim
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback('not_helpful')}
                  className="h-8 text-xs"
                >
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  Não
                </Button>
              </div>
            </div>
          )}

          {/* Feedback Confirmation */}
          {feedbackGiven && (
            <div className="text-center py-2 border-t">
              <p className="text-xs text-muted-foreground">
                Obrigado pelo feedback! Isso nos ajuda a melhorar o sistema.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}