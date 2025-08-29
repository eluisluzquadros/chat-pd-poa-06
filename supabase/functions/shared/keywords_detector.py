"""
Sistema inteligente de detecção e extração de keywords para o Plano Diretor de Porto Alegre.
Integra com o sistema de chunking existente para marcar chunks com keywords especiais.
"""

import re
from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class KeywordType(Enum):
    """Tipos de keywords detectadas."""
    COMPOSITE = "composite"  # Keywords compostas prioritárias
    LEGAL_REFERENCE = "legal_reference"  # Referências legais (leis, decretos)
    ZOT_REFERENCE = "zot_reference"  # Referências a ZOTs
    ANNEX_REFERENCE = "annex_reference"  # Referências a anexos
    DISTRICT_REFERENCE = "district_reference"  # Referências a distritos
    ENVIRONMENTAL = "environmental"  # Termos ambientais


@dataclass
class Keyword:
    """Representa uma keyword detectada."""
    text: str
    type: KeywordType
    position: int
    length: int
    confidence: float = 1.0
    context: str = ""


@dataclass
class ChunkKeywords:
    """Keywords associadas a um chunk específico."""
    chunk_text: str
    chunk_index: int
    keywords: List[Keyword]
    priority_score: float = 0.0
    has_composite_keywords: bool = False
    legal_references_count: int = 0


class KeywordDetector:
    """Detector inteligente de keywords para documentos do Plano Diretor."""
    
    def __init__(self):
        # Keywords compostas prioritárias
        self.composite_keywords = {
            'certificação em sustentabilidade ambiental': 10.0,
            'estudo de impacto de vizinhança': 9.0,
            'zoneamento especial de interesse social': 8.5,
            'área de proteção ambiental': 8.0,
            'plano diretor participativo': 7.5,
            'desenvolvimento urbano sustentável': 7.0,
            'política habitacional de interesse social': 6.5,
            'sistema viário estrutural': 6.0,
            'patrimônio histórico cultural': 5.5,
            'área de preservação permanente': 8.5,
            'coeficiente de aproveitamento': 5.0,
            'taxa de ocupação': 4.5,
            'índice de permeabilidade': 4.0,
            # CORREÇÃO CRÍTICA: Sinônimos para altura
            'altura máxima': 7.5,
            'gabarito máximo': 7.5,
            'limite de altura': 7.0,
            'elevação máxima': 6.5,
            'altura da edificação': 6.0,
            'altura do prédio': 6.0,
            'metros de altura': 5.5,
            'cota máxima': 5.5,
            'nível máximo': 5.0,
            'teto de altura': 5.0,
        }
        
        # Padrões regex para diferentes tipos de referências
        self.regex_patterns = {
            KeywordType.LEGAL_REFERENCE: [
                r'lei\s+(?:complementar\s+)?n[º°]\s*\d+(?:[\./]\d+)*(?:\s*de\s+\d{4})?',
                r'decreto\s+n[º°]\s*\d+(?:[\./]\d+)*(?:\s*de\s+\d{4})?',
                r'resolução\s+n[º°]\s*\d+(?:[\./]\d+)*(?:\s*de\s+\d{4})?',
                r'portaria\s+n[º°]\s*\d+(?:[\./]\d+)*(?:\s*de\s+\d{4})?',
            ],
            KeywordType.ZOT_REFERENCE: [
                r'zot\s*\d+(?:\.\d+)?',
                r'zona\s+\d+(?:\.\d+)?',
                r'zoneamento\s+\d+(?:\.\d+)?',
            ],
            KeywordType.ANNEX_REFERENCE: [
                r'anexo\s*\d+(?:\.\d+)?(?:\s*-\s*\w+)?',
                r'apêndice\s*\d+(?:\.\d+)?',
                r'tabela\s*\d+(?:\.\d+)?',
                r'figura\s*\d+(?:\.\d+)?',
                r'mapa\s*\d+(?:\.\d+)?',
            ],
            KeywordType.DISTRICT_REFERENCE: [
                r'\d+[º°]\s*distrito',
                r'distrito\s+\d+',
                r'região\s+\d+',
            ],
            KeywordType.ENVIRONMENTAL: [
                r'área\s+de\s+proteção\s+ambiental',
                r'unidade\s+de\s+conservação',
                r'mata\s+atlântica',
                r'recursos\s+hídricos',
                r'saneamento\s+ambiental',
                r'impacto\s+ambiental',
                r'licenciamento\s+ambiental',
                r'estudo\s+de\s+impacto',
                r'relatório\s+de\s+impacto',
            ]
        }
        
        # Compile all regex patterns for better performance
        self.compiled_patterns = {}
        for keyword_type, patterns in self.regex_patterns.items():
            self.compiled_patterns[keyword_type] = [
                re.compile(pattern, re.IGNORECASE | re.MULTILINE)
                for pattern in patterns
            ]

    def extract_composite_keywords(self, text: str) -> List[Keyword]:
        """Extrai keywords compostas prioritárias do texto."""
        keywords = []
        text_lower = text.lower()
        
        for keyword, priority in self.composite_keywords.items():
            # Procura por matches exatos ou parciais
            pattern = re.compile(r'\b' + re.escape(keyword) + r'\b', re.IGNORECASE)
            matches = pattern.finditer(text)
            
            for match in matches:
                # Extrai contexto ao redor da keyword
                start = max(0, match.start() - 50)
                end = min(len(text), match.end() + 50)
                context = text[start:end].strip()
                
                keywords.append(Keyword(
                    text=match.group(),
                    type=KeywordType.COMPOSITE,
                    position=match.start(),
                    length=len(match.group()),
                    confidence=priority / 10.0,  # Normaliza para 0-1
                    context=context
                ))
        
        return keywords

    def extract_pattern_keywords(self, text: str, keyword_type: KeywordType) -> List[Keyword]:
        """Extrai keywords baseadas em padrões regex."""
        keywords = []
        
        if keyword_type not in self.compiled_patterns:
            return keywords
            
        for pattern in self.compiled_patterns[keyword_type]:
            matches = pattern.finditer(text)
            
            for match in matches:
                # Extrai contexto ao redor da keyword
                start = max(0, match.start() - 30)
                end = min(len(text), match.end() + 30)
                context = text[start:end].strip()
                
                # Calcula confiança baseada no tipo
                confidence = self._calculate_confidence(keyword_type, match.group())
                
                keywords.append(Keyword(
                    text=match.group(),
                    type=keyword_type,
                    position=match.start(),
                    length=len(match.group()),
                    confidence=confidence,
                    context=context
                ))
        
        return keywords

    def _calculate_confidence(self, keyword_type: KeywordType, text: str) -> float:
        """Calcula a confiança da detecção baseada no tipo e texto."""
        base_confidence = {
            KeywordType.LEGAL_REFERENCE: 0.9,
            KeywordType.ZOT_REFERENCE: 0.8,
            KeywordType.ANNEX_REFERENCE: 0.7,
            KeywordType.DISTRICT_REFERENCE: 0.85,
            KeywordType.ENVIRONMENTAL: 0.75,
        }
        
        confidence = base_confidence.get(keyword_type, 0.5)
        
        # Ajusta confiança baseada em características do texto
        if re.search(r'\d{4}', text):  # Contém ano
            confidence += 0.1
        if len(text) > 20:  # Texto mais detalhado
            confidence += 0.05
        
        return min(1.0, confidence)

    def extract_all_keywords(self, text: str) -> List[Keyword]:
        """Extrai todas as keywords do texto."""
        all_keywords = []
        
        # Extrai keywords compostas
        all_keywords.extend(self.extract_composite_keywords(text))
        
        # Extrai keywords por padrão
        for keyword_type in KeywordType:
            if keyword_type != KeywordType.COMPOSITE:
                all_keywords.extend(self.extract_pattern_keywords(text, keyword_type))
        
        # Remove duplicatas e ordena por posição
        unique_keywords = self._remove_duplicates(all_keywords)
        return sorted(unique_keywords, key=lambda k: k.position)

    def _remove_duplicates(self, keywords: List[Keyword]) -> List[Keyword]:
        """Remove keywords duplicadas ou sobrepostas."""
        if not keywords:
            return []
        
        # Ordena por posição
        sorted_keywords = sorted(keywords, key=lambda k: k.position)
        unique_keywords = [sorted_keywords[0]]
        
        for keyword in sorted_keywords[1:]:
            last_keyword = unique_keywords[-1]
            
            # Verifica se há sobreposição
            if keyword.position >= last_keyword.position + last_keyword.length:
                unique_keywords.append(keyword)
            elif keyword.confidence > last_keyword.confidence:
                # Substitui se a confiança for maior
                unique_keywords[-1] = keyword
        
        return unique_keywords

    def analyze_chunk_keywords(self, chunk_text: str, chunk_index: int) -> ChunkKeywords:
        """Analisa keywords em um chunk específico."""
        keywords = self.extract_all_keywords(chunk_text)
        
        # Calcula métricas do chunk
        composite_keywords = [k for k in keywords if k.type == KeywordType.COMPOSITE]
        legal_references = [k for k in keywords if k.type == KeywordType.LEGAL_REFERENCE]
        
        # Calcula score de prioridade
        priority_score = self._calculate_chunk_priority(keywords)
        
        return ChunkKeywords(
            chunk_text=chunk_text,
            chunk_index=chunk_index,
            keywords=keywords,
            priority_score=priority_score,
            has_composite_keywords=len(composite_keywords) > 0,
            legal_references_count=len(legal_references)
        )

    def _calculate_chunk_priority(self, keywords: List[Keyword]) -> float:
        """Calcula o score de prioridade de um chunk baseado em suas keywords."""
        if not keywords:
            return 0.0
        
        total_score = 0.0
        
        for keyword in keywords:
            base_score = keyword.confidence
            
            # Multiplica por peso baseado no tipo
            type_weights = {
                KeywordType.COMPOSITE: 3.0,
                KeywordType.LEGAL_REFERENCE: 2.0,
                KeywordType.ZOT_REFERENCE: 1.8,
                KeywordType.ENVIRONMENTAL: 1.5,
                KeywordType.DISTRICT_REFERENCE: 1.3,
                KeywordType.ANNEX_REFERENCE: 1.0,
            }
            
            weight = type_weights.get(keyword.type, 1.0)
            total_score += base_score * weight
        
        # Normaliza pelo número de keywords para evitar favorecimento de chunks longos
        return total_score / max(1, len(keywords))

    def process_document_chunks(self, chunks: List[str]) -> List[ChunkKeywords]:
        """Processa todos os chunks de um documento e extrai keywords."""
        chunk_keywords_list = []
        
        for i, chunk in enumerate(chunks):
            chunk_keywords = self.analyze_chunk_keywords(chunk, i)
            chunk_keywords_list.append(chunk_keywords)
        
        return chunk_keywords_list

    def get_priority_chunks(self, chunk_keywords_list: List[ChunkKeywords], 
                          top_n: int = 10) -> List[ChunkKeywords]:
        """Retorna os chunks com maior prioridade baseado nas keywords."""
        return sorted(
            chunk_keywords_list, 
            key=lambda x: x.priority_score, 
            reverse=True
        )[:top_n]

    def search_keywords_in_chunks(self, chunk_keywords_list: List[ChunkKeywords], 
                                query_keywords: List[str]) -> List[ChunkKeywords]:
        """Busca chunks que contêm keywords específicas da query."""
        relevant_chunks = []
        query_lower = [kw.lower() for kw in query_keywords]
        
        for chunk_keywords in chunk_keywords_list:
            chunk_text_lower = chunk_keywords.chunk_text.lower()
            
            # Verifica se alguma keyword da query está presente
            has_query_keyword = any(
                query_kw in chunk_text_lower for query_kw in query_lower
            )
            
            # Verifica se há keywords detectadas relacionadas
            has_related_keywords = any(
                any(query_kw in kw.text.lower() for query_kw in query_lower)
                for kw in chunk_keywords.keywords
            )
            
            if has_query_keyword or has_related_keywords:
                relevant_chunks.append(chunk_keywords)
        
        # Ordena por relevância (prioridade + número de matches)
        return sorted(relevant_chunks, key=lambda x: x.priority_score, reverse=True)

    def generate_keywords_summary(self, chunk_keywords_list: List[ChunkKeywords]) -> Dict:
        """Gera um resumo das keywords detectadas no documento."""
        all_keywords = []
        for chunk_keywords in chunk_keywords_list:
            all_keywords.extend(chunk_keywords.keywords)
        
        # Conta keywords por tipo
        type_counts = {}
        for keyword_type in KeywordType:
            type_counts[keyword_type.value] = len([
                k for k in all_keywords if k.type == keyword_type
            ])
        
        # Top keywords compostas
        composite_keywords = [k for k in all_keywords if k.type == KeywordType.COMPOSITE]
        top_composite = sorted(composite_keywords, key=lambda x: x.confidence, reverse=True)[:5]
        
        # Referências legais únicas
        legal_refs = list(set([
            k.text for k in all_keywords if k.type == KeywordType.LEGAL_REFERENCE
        ]))
        
        return {
            "total_keywords": len(all_keywords),
            "keywords_by_type": type_counts,
            "top_composite_keywords": [k.text for k in top_composite],
            "legal_references": legal_refs,
            "chunks_with_high_priority": len([
                ck for ck in chunk_keywords_list if ck.priority_score > 1.0
            ]),
            "average_priority_score": sum(ck.priority_score for ck in chunk_keywords_list) / max(1, len(chunk_keywords_list))
        }


# Funções utilitárias para integração com o sistema existente
def enhance_chunks_with_keywords(chunks: List[str]) -> List[Dict]:
    """Melhora chunks existentes com informações de keywords."""
    detector = KeywordDetector()
    chunk_keywords_list = detector.process_document_chunks(chunks)
    
    enhanced_chunks = []
    for chunk_keywords in chunk_keywords_list:
        enhanced_chunks.append({
            "text": chunk_keywords.chunk_text,
            "index": chunk_keywords.chunk_index,
            "keywords": [
                {
                    "text": kw.text,
                    "type": kw.type.value,
                    "confidence": kw.confidence,
                    "context": kw.context
                }
                for kw in chunk_keywords.keywords
            ],
            "priority_score": chunk_keywords.priority_score,
            "has_composite_keywords": chunk_keywords.has_composite_keywords,
            "legal_references_count": chunk_keywords.legal_references_count
        })
    
    return enhanced_chunks


def filter_chunks_by_query(chunks: List[str], query: str) -> List[str]:
    """Filtra chunks baseado na query usando detecção de keywords."""
    detector = KeywordDetector()
    chunk_keywords_list = detector.process_document_chunks(chunks)
    
    # Extrai keywords da query
    query_keywords = detector.extract_all_keywords(query)
    query_terms = [kw.text for kw in query_keywords]
    
    # Se não há keywords especiais na query, usa termos simples
    if not query_terms:
        query_terms = query.split()
    
    # Busca chunks relevantes
    relevant_chunks = detector.search_keywords_in_chunks(chunk_keywords_list, query_terms)
    
    # Retorna apenas o texto dos chunks mais relevantes
    return [ck.chunk_text for ck in relevant_chunks[:10]]  # Top 10 chunks