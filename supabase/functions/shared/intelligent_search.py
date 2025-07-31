"""
Serviço de busca inteligente que utiliza keywords para melhorar a recuperação de contexto.
Integra com o sistema de embeddings existente para fornecer resultados mais precisos.
"""

import json
import math
from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass
from keywords_detector import KeywordDetector, KeywordType


@dataclass
class SearchResult:
    """Resultado de busca com score de relevância."""
    chunk_text: str
    chunk_index: int
    document_id: str
    similarity_score: float
    keyword_score: float
    combined_score: float
    keywords_found: List[Dict]
    has_composite_keywords: bool
    legal_references_count: int


class IntelligentSearch:
    """Serviço de busca inteligente com detecção de keywords."""
    
    def __init__(self, supabase_client):
        self.supabase_client = supabase_client
        self.keyword_detector = KeywordDetector()
    
    async def search_with_keywords(self, query: str, document_ids: Optional[List[str]] = None, 
                                 limit: int = 10) -> List[SearchResult]:
        """
        Realiza busca inteligente combinando similaridade semântica e keywords.
        
        Args:
            query: Query de busca do usuário
            document_ids: Lista opcional de IDs de documentos para filtrar
            limit: Número máximo de resultados
            
        Returns:
            Lista de resultados ordenados por relevância
        """
        try:
            # Detecta keywords na query
            query_keywords = self.keyword_detector.extract_all_keywords(query)
            print(f"Detected {len(query_keywords)} keywords in query: {[kw.text for kw in query_keywords]}")
            
            # Busca por similaridade semântica
            semantic_results = await self._semantic_search(query, document_ids, limit * 2)
            
            # Busca por keywords específicas
            keyword_results = await self._keyword_search(query_keywords, document_ids, limit * 2)
            
            # Combina e rankeia resultados
            combined_results = self._combine_and_rank_results(
                semantic_results, keyword_results, query_keywords, limit
            )
            
            return combined_results
            
        except Exception as e:
            print(f"Error in intelligent search: {e}")
            # Fallback para busca semântica simples
            return await self._semantic_search(query, document_ids, limit)
    
    async def _semantic_search(self, query: str, document_ids: Optional[List[str]], 
                              limit: int) -> List[Dict]:
        """Realiza busca por similaridade semântica usando embeddings."""
        try:
            # Gera embedding da query (simulado - normalmente usaria OpenAI)
            # Para este exemplo, vamos usar busca por texto
            
            query_filter = """
            SELECT 
                de.document_id,
                de.content_chunk,
                de.chunk_index,
                de.keywords,
                de.priority_score,
                de.has_composite_keywords,
                de.legal_references_count,
                0.5 as similarity_score
            FROM document_embeddings de
            WHERE LOWER(de.content_chunk) LIKE LOWER(%s)
            """
            
            if document_ids:
                query_filter += f" AND de.document_id = ANY(%s)"
                params = [f"%{query}%", document_ids]
            else:
                params = [f"%{query}%"]
            
            query_filter += f" ORDER BY de.priority_score DESC LIMIT {limit}"
            
            response = await self.supabase_client.rpc(
                'execute_sql',
                {'query': query_filter, 'params': params}
            ).execute()
            
            return response.data if response.data else []
            
        except Exception as e:
            print(f"Error in semantic search: {e}")
            return []
    
    async def _keyword_search(self, query_keywords: List, document_ids: Optional[List[str]], 
                             limit: int) -> List[Dict]:
        """Busca por chunks que contêm keywords específicas."""
        if not query_keywords:
            return []
        
        try:
            # Constrói filtros baseados nas keywords detectadas
            keyword_filters = []
            
            for keyword in query_keywords:
                keyword_text = keyword.text.lower()
                keyword_filters.append(f"LOWER(de.content_chunk) LIKE '%{keyword_text}%'")
            
            if not keyword_filters:
                return []
            
            query_filter = f"""
            SELECT 
                de.document_id,
                de.content_chunk,
                de.chunk_index,
                de.keywords,
                de.priority_score,
                de.has_composite_keywords,
                de.legal_references_count,
                1.0 as similarity_score
            FROM document_embeddings de
            WHERE ({' OR '.join(keyword_filters)})
            """
            
            if document_ids:
                query_filter += f" AND de.document_id = ANY(ARRAY{document_ids})"
            
            query_filter += f" ORDER BY de.priority_score DESC LIMIT {limit}"
            
            response = await self.supabase_client.rpc(
                'execute_sql',
                {'query': query_filter}
            ).execute()
            
            return response.data if response.data else []
            
        except Exception as e:
            print(f"Error in keyword search: {e}")
            return []
    
    def _combine_and_rank_results(self, semantic_results: List[Dict], 
                                 keyword_results: List[Dict], 
                                 query_keywords: List, limit: int) -> List[SearchResult]:
        """Combina resultados semânticos e de keywords, calculando scores finais."""
        
        # Cria dicionário para evitar duplicatas
        results_dict = {}
        
        # Processa resultados semânticos
        for result in semantic_results:
            key = f"{result['document_id']}_{result['chunk_index']}"
            if key not in results_dict:
                results_dict[key] = {
                    'chunk_text': result['content_chunk'],
                    'chunk_index': result['chunk_index'],
                    'document_id': result['document_id'],
                    'similarity_score': result.get('similarity_score', 0.5),
                    'keyword_score': 0.0,
                    'keywords': result.get('keywords', []),
                    'priority_score': result.get('priority_score', 0.0),
                    'has_composite_keywords': result.get('has_composite_keywords', False),
                    'legal_references_count': result.get('legal_references_count', 0)
                }
        
        # Adiciona/atualiza com resultados de keywords
        for result in keyword_results:
            key = f"{result['document_id']}_{result['chunk_index']}"
            if key in results_dict:
                # Atualiza score de keywords
                results_dict[key]['keyword_score'] = 1.0
            else:
                # Adiciona novo resultado
                results_dict[key] = {
                    'chunk_text': result['content_chunk'],
                    'chunk_index': result['chunk_index'],
                    'document_id': result['document_id'],
                    'similarity_score': 0.3,  # Score menor para resultados apenas de keywords
                    'keyword_score': 1.0,
                    'keywords': result.get('keywords', []),
                    'priority_score': result.get('priority_score', 0.0),
                    'has_composite_keywords': result.get('has_composite_keywords', False),
                    'legal_references_count': result.get('legal_references_count', 0)
                }
        
        # Calcula scores finais e converte para SearchResult
        search_results = []
        for result_data in results_dict.values():
            # Calcula keyword score baseado na query
            keyword_score = self._calculate_keyword_score(
                result_data['keywords'], query_keywords, result_data['chunk_text']
            )
            
            # Score combinado com pesos
            combined_score = (
                0.4 * result_data['similarity_score'] +  # 40% similaridade semântica
                0.4 * keyword_score +                    # 40% keywords
                0.2 * min(1.0, result_data['priority_score'])  # 20% prioridade do chunk
            )
            
            # Bonus para chunks com características especiais
            if result_data['has_composite_keywords']:
                combined_score += 0.1
            if result_data['legal_references_count'] > 0:
                combined_score += 0.05
            
            search_results.append(SearchResult(
                chunk_text=result_data['chunk_text'],
                chunk_index=result_data['chunk_index'],
                document_id=result_data['document_id'],
                similarity_score=result_data['similarity_score'],
                keyword_score=keyword_score,
                combined_score=combined_score,
                keywords_found=result_data['keywords'],
                has_composite_keywords=result_data['has_composite_keywords'],
                legal_references_count=result_data['legal_references_count']
            ))
        
        # Ordena por score combinado e retorna top results
        search_results.sort(key=lambda x: x.combined_score, reverse=True)
        return search_results[:limit]
    
    def _calculate_keyword_score(self, chunk_keywords: List[Dict], 
                               query_keywords: List, chunk_text: str) -> float:
        """Calcula score de keywords para um chunk específico."""
        if not query_keywords:
            return 0.0
        
        score = 0.0
        chunk_text_lower = chunk_text.lower()
        
        # Score baseado em keywords da query encontradas no chunk
        for query_kw in query_keywords:
            query_text = query_kw.text.lower()
            
            # Match exato
            if query_text in chunk_text_lower:
                base_score = 0.3
                
                # Bonus baseado no tipo de keyword
                type_bonus = {
                    KeywordType.COMPOSITE: 0.4,
                    KeywordType.LEGAL_REFERENCE: 0.3,
                    KeywordType.ZOT_REFERENCE: 0.25,
                    KeywordType.ENVIRONMENTAL: 0.2,
                    KeywordType.DISTRICT_REFERENCE: 0.15,
                    KeywordType.ANNEX_REFERENCE: 0.1,
                }.get(query_kw.type, 0.1)
                
                score += base_score + type_bonus
        
        # Score adicional baseado em keywords detectadas no chunk
        for chunk_kw in chunk_keywords:
            if chunk_kw.get('type') == 'composite':
                score += 0.1
            elif chunk_kw.get('type') == 'legal_reference':
                score += 0.05
        
        return min(1.0, score)  # Normaliza para máximo 1.0
    
    async def search_by_legal_reference(self, legal_ref: str, 
                                      document_ids: Optional[List[str]] = None) -> List[SearchResult]:
        """Busca específica por referências legais."""
        try:
            query_filter = """
            SELECT 
                de.document_id,
                de.content_chunk,
                de.chunk_index,
                de.keywords,
                de.priority_score,
                de.has_composite_keywords,
                de.legal_references_count
            FROM document_embeddings de
            WHERE de.legal_references_count > 0
            AND LOWER(de.content_chunk) LIKE LOWER(%s)
            """
            
            params = [f"%{legal_ref}%"]
            
            if document_ids:
                query_filter += " AND de.document_id = ANY(%s)"
                params.append(document_ids)
            
            query_filter += " ORDER BY de.legal_references_count DESC, de.priority_score DESC LIMIT 20"
            
            response = await self.supabase_client.rpc(
                'execute_sql',
                {'query': query_filter, 'params': params}
            ).execute()
            
            results = []
            for result in response.data or []:
                results.append(SearchResult(
                    chunk_text=result['content_chunk'],
                    chunk_index=result['chunk_index'],
                    document_id=result['document_id'],
                    similarity_score=0.8,
                    keyword_score=1.0,
                    combined_score=0.9,
                    keywords_found=result.get('keywords', []),
                    has_composite_keywords=result.get('has_composite_keywords', False),
                    legal_references_count=result.get('legal_references_count', 0)
                ))
            
            return results
            
        except Exception as e:
            print(f"Error in legal reference search: {e}")
            return []
    
    async def search_by_zot(self, zot_ref: str, 
                           document_ids: Optional[List[str]] = None) -> List[SearchResult]:
        """Busca específica por referências de ZOT."""
        try:
            # Normaliza referência ZOT
            zot_patterns = [
                zot_ref.lower(),
                f"zot {zot_ref}",
                f"zona {zot_ref}",
                f"zoneamento {zot_ref}"
            ]
            
            conditions = [f"LOWER(de.content_chunk) LIKE '%{pattern}%'" for pattern in zot_patterns]
            where_clause = " OR ".join(conditions)
            
            query_filter = f"""
            SELECT 
                de.document_id,
                de.content_chunk,
                de.chunk_index,
                de.keywords,
                de.priority_score,
                de.has_composite_keywords,
                de.legal_references_count
            FROM document_embeddings de
            WHERE ({where_clause})
            """
            
            if document_ids:
                query_filter += f" AND de.document_id = ANY(ARRAY{document_ids})"
            
            query_filter += " ORDER BY de.priority_score DESC LIMIT 15"
            
            response = await self.supabase_client.rpc(
                'execute_sql',
                {'query': query_filter}
            ).execute()
            
            results = []
            for result in response.data or []:
                results.append(SearchResult(
                    chunk_text=result['content_chunk'],
                    chunk_index=result['chunk_index'],
                    document_id=result['document_id'],
                    similarity_score=0.7,
                    keyword_score=0.9,
                    combined_score=0.8,
                    keywords_found=result.get('keywords', []),
                    has_composite_keywords=result.get('has_composite_keywords', False),
                    legal_references_count=result.get('legal_references_count', 0)
                ))
            
            return results
            
        except Exception as e:
            print(f"Error in ZOT search: {e}")
            return []

    def get_search_suggestions(self, partial_query: str) -> List[str]:
        """Gera sugestões de busca baseadas em keywords conhecidas."""
        suggestions = []
        partial_lower = partial_query.lower()
        
        # Sugestões de keywords compostas
        for keyword in self.keyword_detector.composite_keywords.keys():
            if partial_lower in keyword.lower() and len(partial_query) >= 3:
                suggestions.append(keyword)
        
        # Sugestões de padrões comuns
        common_patterns = [
            "lei complementar nº",
            "decreto nº",
            "zot 8.2",
            "4º distrito",
            "certificação em sustentabilidade ambiental",
            "estudo de impacto de vizinhança",
            "área de proteção ambiental",
            "coeficiente de aproveitamento",
            "taxa de ocupação"
        ]
        
        for pattern in common_patterns:
            if partial_lower in pattern.lower() and pattern not in suggestions:
                suggestions.append(pattern)
        
        return suggestions[:10]  # Máximo 10 sugestões


# Função utilitária para integração com o sistema RAG existente
async def enhanced_context_retrieval(supabase_client, query: str, 
                                   document_ids: Optional[List[str]] = None,
                                   max_chunks: int = 10) -> List[str]:
    """
    Função de conveniência para recuperar contexto melhorado com keywords.
    Integra com o sistema RAG existente.
    """
    try:
        search_service = IntelligentSearch(supabase_client)
        results = await search_service.search_with_keywords(query, document_ids, max_chunks)
        
        # Retorna apenas o texto dos chunks ordenados por relevância
        return [result.chunk_text for result in results]
        
    except Exception as e:
        print(f"Error in enhanced context retrieval: {e}")
        
        # Fallback para busca simples
        try:
            response = await supabase_client.table("document_embeddings")\
                .select("content_chunk")\
                .ilike("content_chunk", f"%{query}%")\
                .limit(max_chunks)\
                .execute()
            
            return [row["content_chunk"] for row in response.data or []]
            
        except Exception as fallback_error:
            print(f"Error in fallback search: {fallback_error}")
            return []