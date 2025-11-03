
// @ts-nocheck
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message, LLMProvider } from "@/types/chat";
import { useToast } from "@/hooks/use-toast";
import { getCurrentAuthenticatedSession } from "@/utils/authUtils";
import { ChatService } from "@/services/chatService";
import { useTokenTracking } from "@/hooks/useTokenTracking";
import { getUserFriendlyErrorMessage } from "@/utils/errorMessages";

interface UseMessageSubmitProps {
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (sessionId: string | null) => void;
  addMessage: (message: Message) => void;
  createSession: (userId: string, title: string, model: string, message: string, agentId?: string) => Promise<string>;
  updateSession: (sessionId: string, lastMessage: string) => Promise<void>;
  selectedModel: string;
  isDomainReady?: boolean; // NOVO: Passado como prop para evitar hook violation
}

export function useMessageSubmit({
  input,
  setInput,
  isLoading,
  setIsLoading,
  currentSessionId,
  setCurrentSessionId,
  addMessage,
  createSession,
  updateSession,
  selectedModel,
  isDomainReady = true, // NOVO: Default true, passado como prop
}: UseMessageSubmitProps) {
  const { toast } = useToast();
  const chatService = new ChatService();
  const { trackTokenUsage, estimateTokens } = useTokenTracking();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    console.log('🎯 [Mobile Debug] handleSubmit START:', {
      hasInput: !!input.trim(),
      isLoading,
      isDomainReady,
      selectedModel,
      currentSessionId,
      userAgent: navigator.userAgent
    });
    
    e.preventDefault();
    if (!input.trim() || isLoading) {
      console.warn('⚠️ [Mobile Debug] Submit aborted - early validation failed');
      return;
    }

    // ⚠️ REMOVIDO: Verificação isDomainReady que bloqueava iPhone
    // Prosseguir sem aguardar DomainContext para garantir envio no mobile
    if (!isDomainReady) {
      console.warn('⚠️ [Mobile Debug] DomainContext not ready, proceeding anyway');
    }

    const session = await getCurrentAuthenticatedSession();
    if (!session?.user) {
      console.error('❌ [Mobile Debug] No authenticated session');
      toast({
        title: "Error",
        description: "You need to be logged in to send messages",
        variant: "destructive",
      });
      return;
    }

    // ✅ VALIDAÇÃO: Garantir que agente está selecionado antes de prosseguir
    if (!selectedModel) {
      console.error('❌ [Mobile Debug] No agent selected');
      toast({
        title: "Erro",
        description: "Nenhum agente selecionado. Recarregue a página.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const currentInput = input;
    setInput("");

    console.log('✅ [Mobile Debug] Message submission started:', {
      messageLength: currentInput.length,
      selectedModel,
      hasSession: !!currentSessionId
    });

    // Get user role for context - declare here for proper scope
    const { AuthService } = await import("@/services/authService");
    let userRole: string = 'user'; // default fallback
    
    // 🔧 CRITICAL FIX: Declare sessionId OUTSIDE try block to avoid scope issues in catch
    let sessionId = currentSessionId;
    
    try {
      userRole = await AuthService.getUserRole(session.user.id);
      
      // 🔥 NOVO: Determinar agente ANTES de criar sessão
      let selectedAgentId: string | undefined;
      if (!currentSessionId) {
        // Importar agentsService para determinar o agente
        const { agentsService } = await import("@/services/agentsService");
        
        let selectedAgent = null;
        
        if (selectedModel) {
          // Tentar buscar por ID, nome ou modelo (mesma lógica do chatService)
          const allAgents = await agentsService.getAllAgents();
          selectedAgent = allAgents.find(agent => agent.id === selectedModel) ||
                          allAgents.find(agent => agent.name === selectedModel) ||
                          allAgents.find(agent => agent.model === selectedModel);
        }
        
        // Se não encontrou agente específico, usar o padrão
        if (!selectedAgent) {
          selectedAgent = await agentsService.getDefaultAgent();
        }
        
        // Se ainda não tem agente, usar primeiro ativo disponível
        if (!selectedAgent) {
          const activeAgents = await agentsService.getActiveAgents();
          selectedAgent = activeAgents[0];
        }
        
        selectedAgentId = selectedAgent?.id;
        console.log('🤖 Agent determined for new session:', {
          agentId: selectedAgentId,
          agentName: selectedAgent?.name,
          model: selectedModel
        });
      }
      
      // 🚀 SDK STRATEGY: Smart session routing with proper error handling
      
      if (!sessionId) {
        console.log('🔄 [useMessageSubmit] Creating new session...');
        try {
          sessionId = await createSession(session.user.id, currentInput, selectedModel, currentInput, selectedAgentId);
          if (!sessionId) {
            throw new Error('createSession returned null/undefined');
          }
          setCurrentSessionId(sessionId);
          console.log('✅ [useMessageSubmit] Session created successfully:', sessionId);
        } catch (error) {
          console.error('❌ [useMessageSubmit] Failed to create session:', error);
          // 🛑 ABORT SUBMISSION: Surface error to user instead of phantom sessionId
          toast({
            title: "Erro de Sessão",
            description: "Não foi possível criar uma nova sessão. Tente novamente.",
            variant: "destructive",
          });
          setIsLoading(false);
          return; // Abort submission cleanly
        }
      }
      
      // 🛡️ FINAL VALIDATION: Ensure we have a valid sessionId before proceeding
      if (!sessionId) {
        console.error('🚨 [useMessageSubmit] CRITICAL: No valid sessionId available');
        toast({
          title: "Erro de Sistema",
          description: "Sistema indisponível. Contate o suporte.",
          variant: "destructive",
        });
        setIsLoading(false);
        return; // Abort submission
      }
      
      // 🎯 CAPABILITY-BASED ROUTING: Determine if agent needs sessionId
      let routingSessionId = sessionId; // Default: use real sessionId for continuity
      
      // CONCRETE IMPLEMENTATION: Check agent capabilities for routing decision
      try {
        const { agentsService } = await import("@/services/agentsService");
        const allAgents = await agentsService.getAllAgents();
        const currentAgent = allAgents.find(agent => 
          agent.id === selectedModel || 
          agent.name === selectedModel || 
          agent.model === selectedModel
        );
        
        if (currentAgent?.capabilities) {
          const capabilities = currentAgent.capabilities as any; // AgentCapabilities type
          
          // Route based on concrete capabilities with robust validation
          const isPlaygroundStyleAgent = capabilities.playgroundStyle === true ||
                                       capabilities.sessionManagement === 'self-managed' ||
                                       capabilities.requiresSessionId === false;
          
          if (isPlaygroundStyleAgent) {
            routingSessionId = ''; // Let agent create/manage automatically
            console.log('🎯 [SDK Routing] Using self-managed session for agent:', currentAgent.display_name);
          } else {
            // Ensure we always have a valid sessionId for platform-managed agents
            routingSessionId = sessionId; // Guaranteed valid by earlier validation
            console.log('🎯 [SDK Routing] Using platform session for agent:', currentAgent.display_name);
          }
        } else {
          console.log('🎯 [SDK Routing] No capabilities defined, using platform session default');
        }
      } catch (error) {
        console.error('⚠️ [SDK Routing] Error checking agent capabilities, using default:', error);
        // Fall back to platform session on error
      }

      console.log('Creating user message...');
      const userMessage: Message = {
        id: crypto.randomUUID(),
        content: currentInput,
        role: "user",
        timestamp: new Date(),
        model: selectedModel,
      };

      addMessage(userMessage);

      console.log('Saving user message to database...');
      console.log('🔍 [DEBUG] About to save user message with sessionId:', sessionId);
      console.log('🔍 [DEBUG] sessionId type:', typeof sessionId);
      console.log('🔍 [DEBUG] sessionId value:', sessionId);
      
      if (!sessionId) {
        console.error('🚨 [DEBUG] sessionId is undefined/null before database insert!');
        throw new Error('sessionId is not defined before user message insert');
      }
      
      // Add fallback for chat_history insert similar to session creation
      let userMessageError;
      try {
        const result = await supabase
          .from('chat_history')
          .insert({
            session_id: sessionId,
            user_id: session.user.id,
            message: {
              content: currentInput,
              role: 'user',
              model: selectedModel,
              timestamp: userMessage.timestamp.toISOString()
            },
          });
        userMessageError = result.error;
      } catch (insertError) {
        console.error('🔧 [DEBUG] chat_history insert failed with exception:', insertError);
        userMessageError = insertError;
      }

      if (userMessageError) {
        console.error('🔧 [DEBUG] User message insert error:', userMessageError);
        // For now, log the error but continue - the message is already in UI
        console.log('⚠️ [DEBUG] Continuing despite user message insert failure - message already in UI');
      } else {
        console.log('✅ [DEBUG] User message saved to database successfully');
      }

      // ✅ Message count is automatically handled by chat_history table

      console.log(`🚀 [useMessageSubmit] Processing message via ${selectedModel}...`);
      console.log('🔍 [DEBUG] About to log message details with sessionId:', sessionId);

      // ✅ Mostrar feedback progressivo após 5 segundos
      const progressToastId = 'processing-message';
      const progressTimer = setTimeout(() => {
        toast({
          title: "Processando...",
          description: "O agente está analisando sua pergunta. Isso pode levar até 1 minuto.",
          duration: 55000, // Manter até timeout
        });
      }, 5000);
      if (!sessionId) {
        console.error('🚨 [DEBUG] sessionId undefined at message details log!');
        throw new Error('sessionId undefined at message details log');
      }
      console.log('📝 [useMessageSubmit] Message details:', {
        message: currentInput.substring(0, 100) + (currentInput.length > 100 ? '...' : ''),
        model: selectedModel,
        userRole,
        localSessionId: sessionId, // Local UI session
        routingSessionId: routingSessionId, // Agent-specific routing
        userId: session.user.id,
        userEmail: session.user.email
      });
      
      console.log('📞 [useMessageSubmit] Calling ChatService.processMessage...');
      
      // 🚀 SDK STRATEGY: Use routing sessionId based on agent capabilities
      // Multi-turn conversations maintain context, playground-style agents self-manage
      let result;
      try {
        result = await chatService.processMessage(
          currentInput, 
          userRole, 
          routingSessionId, // Smart routing: real sessionId for continuity OR empty for self-managed
          selectedModel
        );
        clearTimeout(progressTimer); // ✅ Limpar toast de progresso em caso de sucesso
      } catch (error) {
        clearTimeout(progressTimer); // ✅ Limpar toast de progresso em caso de erro
        throw error;
      }

      console.log(`✅ [useMessageSubmit] ${selectedModel} response received:`, {
        hasResponse: !!result.response,
        responseLength: result.response?.length || 0,
        confidence: result.confidence,
        executionTime: result.executionTime
      });
      console.log(`📝 [useMessageSubmit] Response preview:`, result.response?.substring(0, 200));

      console.log('Creating assistant message...');
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        content: result.response,
        role: "assistant",
        timestamp: new Date(),
        model: selectedModel,
      };

      addMessage(assistantMessage);

      console.log('Saving assistant message to database...');
      console.log('🔍 [DEBUG] About to save assistant message with sessionId:', sessionId);
      if (!sessionId) {
        console.error('🚨 [DEBUG] sessionId undefined at assistant message insert!');
        throw new Error('sessionId undefined at assistant message insert');
      }
      const { error: assistantMessageError } = await supabase
        .from('chat_history')
        .insert({
          session_id: sessionId,
          user_id: session.user.id,
          message: {
            content: result.response,
            role: 'assistant',
            model: selectedModel,
            timestamp: assistantMessage.timestamp.toISOString(),
            confidence: 0.8,
            sources: [],
            executionTime: 1000
          },
        });

      if (assistantMessageError) throw assistantMessageError;

      // ✅ Message count is automatically handled by chat_history table

      console.log('🔍 [DEBUG] About to updateSession with sessionId:', sessionId);
      if (!sessionId) {
        console.error('🚨 [DEBUG] sessionId undefined at updateSession!');
        throw new Error('sessionId undefined at updateSession');
      }
      await updateSession(sessionId, assistantMessage.content);

      // Track token usage
      try {
        const inputTokens = estimateTokens(currentInput);
        const outputTokens = estimateTokens(result.response);
        
        console.log('🔍 [DEBUG] About to trackTokenUsage with sessionId:', sessionId);
        if (!sessionId) {
          console.error('🚨 [DEBUG] sessionId undefined at trackTokenUsage!');
          throw new Error('sessionId undefined at trackTokenUsage');
        }
        await trackTokenUsage({
          model: selectedModel,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens,
          estimated_cost: 0, // Will be calculated in the hook
          message_content_preview: currentInput.slice(0, 100),
          session_id: sessionId
        });
      } catch (tokenError) {
        console.error('Error tracking token usage:', tokenError);
      }

    } catch (error) {
      // ✅ Log técnico detalhado apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [DEV] Technical error details:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          userRole,
          selectedModel,
          sessionId,
          userId: session?.user?.id
        });
      }
      
      // ✅ Log resumido em produção
      console.error('❌ [PROD] Message submission failed:', {
        timestamp: new Date().toISOString(),
        hasSession: !!sessionId
      });
      
      // ✅ Restaurar input do usuário
      setInput(currentInput);
      
      // ✅ Obter mensagem amigável unificada
      const friendlyMessage = getUserFriendlyErrorMessage(error);
      
      // ✅ Mostrar toast com mensagem amigável
      toast({
        title: "Serviço Temporariamente Indisponível",
        description: "Por favor, tente novamente em instantes ou use os canais alternativos.",
        variant: "destructive",
      });
      
      // ✅ Adicionar mensagem amigável diretamente no chat
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: friendlyMessage, // ✅ Mensagem amigável formatada
        role: "assistant",
        timestamp: new Date(),
        model: selectedModel,
      };
      addMessage(errorMessage);
      
    } finally {
      setIsLoading(false);
    }
  }, [
    currentSessionId,
    input,
    isLoading,
    isDomainReady,
    toast,
    addMessage,
    createSession,
    updateSession,
    setCurrentSessionId,
    setInput,
    setIsLoading,
    selectedModel,
  ]);

  return { handleSubmit };
}
