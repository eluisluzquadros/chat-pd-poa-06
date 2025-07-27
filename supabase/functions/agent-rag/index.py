
from typing import List, Dict, Optional
import os
import json
from pydantic import BaseModel
import aisuite as ai
from supabase import create_client

class RAGRequest(BaseModel):
    message: str
    context: List[str]
    reasoningOutput: Dict
    userRole: str

class RAGResponse(BaseModel):
    response: str
    sourceContext: List[str]
    confidence: float
    nextAgent: str = "evaluation"

def generate_rag_response(context: List[str], query: str, user_role: str) -> RAGResponse:
    try:
        client = ai.Client()
        
        # Log incoming request data for debugging
        print(f"Received query: {query}")
        print(f"Context length: {len(context)}")
        print(f"User role: {user_role}")
        
        # Validate and filter context
        filtered_context = [c for c in context if c and len(c.strip()) > 0]
        print(f"Filtered context length: {len(filtered_context)}")
        print(f"Filtered context preview: {filtered_context[:2] if filtered_context else 'No context'}")
        
        if not filtered_context:
            # Return early with a helpful message if no context is provided
            return RAGResponse(
                response="Por favor, selecione pelo menos um documento com conteúdo disponível para que eu possa fornecer informações relevantes.",
                sourceContext=[],
                confidence=0.0,
                nextAgent="evaluation"
            )

        # System prompt for better context handling
        system_prompt = f"""Você é um assistente especializado no Plano Diretor de Porto Alegre.
        Sua função é auxiliar {user_role}s analisando e fornecendo informações precisas do Plano Diretor
        e documentos relacionados.
        
        REGRAS IMPORTANTES:
        1. Baseie suas respostas APENAS nas informações presentes nos documentos fornecidos
        2. Se não encontrar a informação específica nos documentos, diga claramente
        3. Cite as fontes relevantes quando possível
        4. Seja claro e objetivo, evitando linguagem excessivamente técnica
        5. Se precisar de mais contexto, sugira ao usuário especificar melhor a pergunta"""

        combined_context = "\n\n===\n\n".join(filtered_context)
        print(f"Combined context length: {len(combined_context)}")
        print(f"Combined context preview: {combined_context[:200]}...")

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"""Com base nestes documentos:

{combined_context}

Pergunta do usuário: {query}

Lembre-se de:
1. Usar APENAS as informações dos documentos fornecidos
2. Ser claro e objetivo
3. Indicar se a informação não estiver disponível nos documentos"""}
        ]

        # Log message structure
        print("Sending request to OpenAI...")
        
        response = client.chat.completions.create(
            model='gpt-4',
            messages=messages,
            temperature=0.3,
            max_tokens=1000
        )

        generated_response = response.choices[0].message.content
        print(f"Generated response preview: {generated_response[:200]}...")

        return RAGResponse(
            response=generated_response,
            sourceContext=filtered_context,
            confidence=0.85 if filtered_context else 0.0,
            nextAgent="evaluation"
        )
    except Exception as e:
        print(f"Error generating RAG response: {str(e)}")
        error_message = "Desculpe, ocorreu um erro ao processar sua solicitação. "
        if "context length" in str(e).lower():
            error_message += "O contexto é muito longo. Por favor, selecione menos documentos."
        elif "rate limit" in str(e).lower():
            error_message += "O serviço está temporariamente sobrecarregado. Por favor, tente novamente em alguns segundos."
        else:
            error_message += "Por favor, tente novamente."
        
        return RAGResponse(
            response=error_message,
            sourceContext=[],
            confidence=0.0,
            nextAgent="evaluation"
        )

def handler(event, context):
    try:
        print("RAG handler received event:", event)
        request = RAGRequest(**event['body'])
        
        response = generate_rag_response(
            context=request.context,
            query=request.message,
            user_role=request.userRole
        )
        
        return response.dict()
    except Exception as e:
        print(f"Error in RAG handler: {str(e)}")
        return {
            "error": str(e)
        }
