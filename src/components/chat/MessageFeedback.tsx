import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/context/auth/useAuthContext";

interface MessageFeedbackProps {
  messageId: string;
  sessionId: string;
  model: string;
}

export function MessageFeedback({ messageId, sessionId, model }: MessageFeedbackProps) {
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuthContext();

  const handleFeedback = async (isHelpful: boolean) => {
    console.log('Feedback clicked:', { isHelpful, messageId, sessionId, model, user });
    
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para dar feedback",
        variant: "destructive",
      });
      return;
    }

    setHelpful(isHelpful);
    
    if (!isHelpful) {
      setShowComment(true);
      return;
    }

    await submitFeedback(isHelpful);
  };

  const submitFeedback = async (feedbackValue: boolean, commentValue?: string) => {
    setIsSubmitting(true);
    
    const feedbackData = {
      message_id: messageId,
      session_id: sessionId,
      model: model,
      helpful: feedbackValue,
      comment: commentValue || null,
    };
    
    console.log('Submitting feedback:', feedbackData);
    
    try {
      const { error } = await supabase
        .from('message_feedback')
        .insert(feedbackData);

      if (error) throw error;

      toast({
        title: "Obrigado pelo feedback!",
        description: "Seu feedback nos ajuda a melhorar o sistema.",
      });

      setShowComment(false);
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
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
    await submitFeedback(false, comment);
  };

  if (helpful !== null && !showComment) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
        <MessageSquare className="h-4 w-4" />
        <span>Obrigado pelo feedback!</span>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {!showComment ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Esta resposta foi útil?</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFeedback(true)}
            className="h-8 w-8 p-0"
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFeedback(false)}
            className="h-8 w-8 p-0"
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            placeholder="Como podemos melhorar esta resposta? (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCommentSubmit}
              disabled={isSubmitting}
              size="sm"
            >
              {isSubmitting ? "Enviando..." : "Enviar feedback"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowComment(false)}
              size="sm"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}