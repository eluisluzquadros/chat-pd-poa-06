import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ThumbsUp, ThumbsDown, MessageSquare, AlertCircle, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useFeedback } from "@/hooks/useFeedback";
import { cn } from "@/lib/utils";

interface EnhancedMessageFeedbackProps {
  messageId: string;
  sessionId: string;
  model: string;
  content?: string;
  showDetailedModal?: boolean;
}

const FEEDBACK_CATEGORIES = [
  { id: "accuracy", label: "Informação incorreta", icon: "❌" },
  { id: "incomplete", label: "Resposta incompleta", icon: "⚠️" },
  { id: "unclear", label: "Explicação confusa", icon: "🤔" },
  { id: "formatting", label: "Formatação ruim", icon: "📝" },
  { id: "slow", label: "Resposta muito lenta", icon: "⏱️" },
  { id: "other", label: "Outro problema", icon: "💭" }
];

export function EnhancedMessageFeedback({ 
  messageId, 
  sessionId, 
  model, 
  content,
  showDetailedModal = true 
}: EnhancedMessageFeedbackProps) {
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showQuickComment, setShowQuickComment] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { submitFeedback, isLoading } = useFeedback();

  const handleQuickFeedback = async (isHelpful: boolean) => {
    setFeedback(isHelpful);
    
    if (isHelpful) {
      // For positive feedback, submit immediately
      await submitFeedback(messageId, sessionId, model, true);
    } else {
      // For negative feedback, show quick comment option
      setShowQuickComment(true);
    }
  };

  const handleQuickSubmit = async () => {
    await submitFeedback(messageId, sessionId, model, false, comment);
    setShowQuickComment(false);
  };

  const handleDetailedSubmit = async () => {
    const detailedComment = [
      comment,
      selectedCategories.length > 0 ? `Categorias: ${selectedCategories.join(', ')}` : '',
      rating > 0 ? `Avaliação: ${rating}/5 estrelas` : ''
    ].filter(Boolean).join('\n\n');

    await submitFeedback(messageId, sessionId, model, feedback || false, detailedComment);
    setIsModalOpen(false);
    setShowQuickComment(false);
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Show thank you message after feedback is submitted
  if (feedback !== null && !showQuickComment && !isModalOpen) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded-lg">
        <MessageSquare className="h-4 w-4" />
        <span>Obrigado pelo feedback!</span>
        {feedback === false && (
          <Badge variant="outline" className="ml-2">
            Feedback negativo registrado
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {/* Quick Feedback Buttons */}
      {!showQuickComment && (
        <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">Esta resposta foi útil?</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickFeedback(true)}
              disabled={isLoading}
              className={cn(
                "h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700",
                feedback === true && "bg-green-100 text-green-700"
              )}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickFeedback(false)}
              disabled={isLoading}
              className={cn(
                "h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700",
                feedback === false && "bg-red-100 text-red-700"
              )}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
          
          {showDetailedModal && (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs">
                  Feedback detalhado
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Feedback Detalhado
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Star Rating */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Avaliação geral</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Button
                          key={star}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setRating(star)}
                        >
                          <Star
                            className={cn(
                              "h-4 w-4",
                              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                            )}
                          />
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Problem Categories */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Problemas identificados</label>
                    <div className="grid grid-cols-2 gap-2">
                      {FEEDBACK_CATEGORIES.map((category) => (
                        <Button
                          key={category.id}
                          variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleCategory(category.id)}
                          className="justify-start text-xs h-8"
                        >
                          <span className="mr-1">{category.icon}</span>
                          {category.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Comentário (opcional)</label>
                    <Textarea
                      placeholder="Descreva como podemos melhorar esta resposta..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDetailedSubmit}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? "Enviando..." : "Enviar feedback"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* Quick Comment for Negative Feedback */}
      {showQuickComment && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>Nos ajude a melhorar esta resposta</span>
            </div>
            
            <Textarea
              placeholder="O que poderia ser melhor? (opcional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[60px] resize-none border-red-200 focus:border-red-300"
            />
            
            <div className="flex gap-2">
              <Button
                onClick={handleQuickSubmit}
                disabled={isLoading}
                size="sm"
                variant="destructive"
              >
                {isLoading ? "Enviando..." : "Enviar"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowQuickComment(false)}
                size="sm"
              >
                Pular
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}