import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MessageFeedbackProps {
  messageId: string;
  sessionId: string;
  model: string;
}

interface Feedback {
  helpful: boolean | null;
  comment: string;
}

export function MessageFeedback({ messageId, sessionId, model }: MessageFeedbackProps) {
  const [feedback, setFeedback] = useState<Feedback>({ helpful: null, comment: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const { toast } = useToast();

  const handleFeedbackSubmit = async (helpful: boolean) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('message_feedback')
        .insert({
          message_id: messageId,
          session_id: sessionId,
          model: model,
          helpful: helpful,
          comment: feedback.comment || null,
        });

      if (error) throw error;

      setFeedback({ ...feedback, helpful });
      setHasSubmitted(true);
      
      toast({
        title: "Feedback enviado",
        description: "Obrigado pela sua avaliação!",
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o feedback. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!feedback.comment.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('message_feedback')
        .upsert({
          message_id: messageId,
          session_id: sessionId,
          model: model,
          helpful: feedback.helpful,
          comment: feedback.comment,
        });

      if (error) throw error;

      setShowComment(false);
      toast({
        title: "Comentário salvo",
        description: "Seu comentário foi adicionado ao feedback.",
      });
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o comentário.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasSubmitted && !showComment) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Feedback enviado</span>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setShowComment(true)}
          className="h-6 px-2"
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          Comentar
        </Button>
      </div>
    );
  }

  return (
    <Card className="mt-2 border-dashed">
      <CardContent className="p-3 space-y-3">
        {!hasSubmitted && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Esta resposta foi útil?</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedbackSubmit(true)}
              disabled={isSubmitting}
              className="h-8 px-2 hover:bg-green-100 hover:text-green-700"
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedbackSubmit(false)}
              disabled={isSubmitting}
              className="h-8 px-2 hover:bg-red-100 hover:text-red-700"
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
        )}

        {showComment && (
          <div className="space-y-2">
            <Textarea
              placeholder="Adicione um comentário sobre esta resposta..."
              value={feedback.comment}
              onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
              className="min-h-[60px] text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCommentSubmit}
                disabled={!feedback.comment.trim() || isSubmitting}
              >
                Enviar comentário
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComment(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}