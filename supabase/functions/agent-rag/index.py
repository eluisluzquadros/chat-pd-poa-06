
from typing import List, Dict, Optional
import os
import json
import sys
from pydantic import BaseModel
import aisuite as ai
from supabase import create_client

# Adiciona o diretório shared ao path para importar o detector de keywords
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'shared'))
from keywords_detector import KeywordDetector, filter_chunks_by_query

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
        keyword_detector = KeywordDetector()
        
        # Log incoming request data for debugging
        print(f"Received query: {query}")
        print(f"Context length: {len(context)}")
        print(f"User role: {user_role}")
        
        # Validate and filter context
        filtered_context = [c for c in context if c and len(c.strip()) > 0]
        print(f"Filtered context length: {len(filtered_context)}")
        
        if not filtered_context:
            # Return early with a helpful message if no context is provided
            return RAGResponse(
                response="Por favor, selecione pelo menos um documento com conteúdo disponível para que eu possa fornecer informações relevantes.",
                sourceContext=[],
                confidence=0.0,
                nextAgent="evaluation"
            )

        # Aplica detecção de keywords para filtrar contexto mais relevante
        try:
            keyword_filtered_context = filter_chunks_by_query(filtered_context, query)
            if keyword_filtered_context:
                print(f"Keywords filtering reduced context from {len(filtered_context)} to {len(keyword_filtered_context)} chunks")
                filtered_context = keyword_filtered_context
            else:
                print("Keywords filtering didn't find specific matches, using original context")
        except Exception as e:
            print(f"Error in keyword filtering: {e}, using original context")
        
        # Analisa keywords na query para personalizar a resposta
        query_keywords = keyword_detector.extract_all_keywords(query)
        has_legal_references = any(kw.type.value == 'legal_reference' for kw in query_keywords)
        has_zot_references = any(kw.type.value == 'zot_reference' for kw in query_keywords)
        has_composite_keywords = any(kw.type.value == 'composite' for kw in query_keywords)
        
        print(f"Query analysis: legal_refs={has_legal_references}, zot_refs={has_zot_references}, composite={has_composite_keywords}")
        print(f"Filtered context preview: {filtered_context[:2] if filtered_context else 'No context'}")

        # System prompt for better context handling with keyword analysis
        keyword_context = ""
        if query_keywords:
            detected_keywords = [kw.text for kw in query_keywords]
            keyword_context = f"\n\nKEYWORDS DETECTADAS NA QUERY: {', '.join(detected_keywords)}"
            
            if has_legal_references:
                keyword_context += "\n- ATENÇÃO: Query contém referências legais. Priorize informações sobre leis, decretos ou regulamentações."
            if has_zot_references:
                keyword_context += "\n- ATENÇÃO: Query contém referências a ZOTs. Priorize informações sobre zoneamento."
            if has_composite_keywords:
                keyword_context += "\n- ATENÇÃO: Query contém termos técnicos especializados. Forneça definições e contexto quando apropriado."

        system_prompt = f"""Você é um assistente especializado no Plano Diretor de Porto Alegre.
        Sua função é auxiliar {user_role}s analisando e fornecendo informações precisas do Plano Diretor
        e documentos relacionados.{keyword_context}
        
        REGRAS IMPORTANTES:
        1. Baseie suas respostas APENAS nas informações presentes nos documentos fornecidos
        2. Se não encontrar a informação específica nos documentos, diga claramente
        3. Cite as fontes relevantes quando possível
        4. Seja claro e objetivo, evitando linguagem excessivamente técnica
        5. Se precisar de mais contexto, sugira ao usuário especificar melhor a pergunta
        6. PRIORIZE informações relacionadas às keywords detectadas na query
        7. Para referências legais, sempre mencione o número completo da lei/decreto quando disponível
        8. Para termos técnicos, forneça definições claras baseadas no contexto dos documentos"""

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
