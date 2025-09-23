"""
Utilitário administrativo para gerenciar e monitorar o sistema de keywords.
Fornece ferramentas para análise, manutenção e otimização do sistema.
"""

import json
import asyncio
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from keywords_detector import KeywordDetector, KeywordType
from intelligent_search import IntelligentSearch


@dataclass
class KeywordStats:
    """Estatísticas de keywords de um documento ou do sistema."""
    keyword_text: str
    keyword_type: str
    frequency: int
    documents_count: int
    avg_confidence: float
    last_seen: datetime


@dataclass
class SystemHealthReport:
    """Relatório de saúde do sistema de keywords."""
    total_documents: int
    total_chunks: int
    chunks_with_keywords: int
    avg_keywords_per_chunk: float
    top_keywords: List[KeywordStats]
    documents_without_keywords: List[str]
    low_performance_patterns: List[str]
    recommendations: List[str]


class KeywordsAdmin:
    """Classe utilitária para administração do sistema de keywords."""
    
    def __init__(self, supabase_client):
        self.supabase_client = supabase_client
        self.keyword_detector = KeywordDetector()
        self.search_service = IntelligentSearch(supabase_client)
    
    async def generate_system_health_report(self) -> SystemHealthReport:
        """Gera relatório completo de saúde do sistema."""
        try:
            # Estatísticas básicas
            basic_stats = await self._get_basic_stats()
            
            # Top keywords mais frequentes
            top_keywords = await self._get_top_keywords()
            
            # Documentos sem keywords
            docs_without_keywords = await self._get_documents_without_keywords()
            
            # Padrões com baixa performance
            low_perf_patterns = await self._analyze_low_performance_patterns()
            
            # Gera recomendações
            recommendations = self._generate_recommendations(
                basic_stats, top_keywords, docs_without_keywords, low_perf_patterns
            )
            
            return SystemHealthReport(
                total_documents=basic_stats['total_documents'],
                total_chunks=basic_stats['total_chunks'],
                chunks_with_keywords=basic_stats['chunks_with_keywords'],
                avg_keywords_per_chunk=basic_stats['avg_keywords_per_chunk'],
                top_keywords=top_keywords,
                documents_without_keywords=docs_without_keywords,
                low_performance_patterns=low_perf_patterns,
                recommendations=recommendations
            )
            
        except Exception as e:
            print(f"Error generating health report: {e}")
            return SystemHealthReport(
                total_documents=0, total_chunks=0, chunks_with_keywords=0,
                avg_keywords_per_chunk=0.0, top_keywords=[], 
                documents_without_keywords=[], low_performance_patterns=[],
                recommendations=[f"Error generating report: {str(e)}"]
            )
    
    async def _get_basic_stats(self) -> Dict:
        """Coleta estatísticas básicas do sistema."""
        try:
            # Total de documentos
            docs_response = await self.supabase_client.table("documents").select("id").execute()
            total_documents = len(docs_response.data) if docs_response.data else 0
            
            # Estatísticas de chunks
            chunks_stats = await self.supabase_client.table("document_embeddings")\
                .select("id, keywords")\
                .execute()
            
            total_chunks = len(chunks_stats.data) if chunks_stats.data else 0
            
            chunks_with_keywords = 0
            total_keywords = 0
            
            for chunk in chunks_stats.data or []:
                keywords = chunk.get('keywords', [])
                if keywords and len(keywords) > 0:
                    chunks_with_keywords += 1
                    total_keywords += len(keywords)
            
            avg_keywords_per_chunk = total_keywords / max(1, total_chunks)
            
            return {
                'total_documents': total_documents,
                'total_chunks': total_chunks,
                'chunks_with_keywords': chunks_with_keywords,
                'avg_keywords_per_chunk': avg_keywords_per_chunk,
                'total_keywords': total_keywords
            }
            
        except Exception as e:
            print(f"Error getting basic stats: {e}")
            return {
                'total_documents': 0, 'total_chunks': 0, 
                'chunks_with_keywords': 0, 'avg_keywords_per_chunk': 0.0,
                'total_keywords': 0
            }
    
    async def _get_top_keywords(self, limit: int = 20) -> List[KeywordStats]:
        """Obtém as keywords mais frequentes do sistema."""
        try:
            # Busca todos os chunks com keywords
            response = await self.supabase_client.table("document_embeddings")\
                .select("keywords, document_id")\
                .neq("keywords", "[]")\
                .execute()
            
            keyword_counts = {}
            keyword_docs = {}
            keyword_confidences = {}
            
            for chunk in response.data or []:
                doc_id = chunk['document_id']
                keywords = chunk.get('keywords', [])
                
                for kw in keywords:
                    kw_text = kw.get('text', '')
                    kw_type = kw.get('type', 'unknown')
                    kw_confidence = kw.get('confidence', 0.0)
                    
                    key = f"{kw_text}|{kw_type}"
                    
                    # Conta frequência
                    keyword_counts[key] = keyword_counts.get(key, 0) + 1
                    
                    # Conta documentos únicos
                    if key not in keyword_docs:
                        keyword_docs[key] = set()
                    keyword_docs[key].add(doc_id)
                    
                    # Coleta confidências para média
                    if key not in keyword_confidences:
                        keyword_confidences[key] = []
                    keyword_confidences[key].append(kw_confidence)
            
            # Converte para lista de KeywordStats
            stats_list = []
            for key, frequency in keyword_counts.items():
                kw_text, kw_type = key.split('|', 1)
                docs_count = len(keyword_docs[key])
                avg_confidence = sum(keyword_confidences[key]) / len(keyword_confidences[key])
                
                stats_list.append(KeywordStats(
                    keyword_text=kw_text,
                    keyword_type=kw_type,
                    frequency=frequency,
                    documents_count=docs_count,
                    avg_confidence=avg_confidence,
                    last_seen=datetime.now()  # Placeholder
                ))
            
            # Ordena por frequência
            stats_list.sort(key=lambda x: x.frequency, reverse=True)
            return stats_list[:limit]
            
        except Exception as e:
            print(f"Error getting top keywords: {e}")
            return []
    
    async def _get_documents_without_keywords(self) -> List[str]:
        """Encontra documentos que não têm keywords detectadas."""
        try:
            # Documentos com resumo de keywords
            with_keywords = await self.supabase_client.table("document_keywords_summary")\
                .select("document_id")\
                .execute()
            
            with_keywords_ids = set(row['document_id'] for row in with_keywords.data or [])
            
            # Todos os documentos
            all_docs = await self.supabase_client.table("documents")\
                .select("id, title")\
                .execute()
            
            without_keywords = []
            for doc in all_docs.data or []:
                if doc['id'] not in with_keywords_ids:
                    without_keywords.append(f"{doc['title']} ({doc['id']})")
            
            return without_keywords
            
        except Exception as e:
            print(f"Error finding documents without keywords: {e}")
            return []
    
    async def _analyze_low_performance_patterns(self) -> List[str]:
        """Analisa padrões que podem ter baixa performance de detecção."""
        patterns = []
        
        try:
            # Verifica se há chunks longos sem keywords
            long_chunks = await self.supabase_client.table("document_embeddings")\
                .select("content_chunk, keywords")\
                .execute()
            
            long_without_keywords = 0
            total_long = 0
            
            for chunk in long_chunks.data or []:
                content = chunk.get('content_chunk', '')
                keywords = chunk.get('keywords', [])
                
                if len(content) > 500:  # Chunk longo
                    total_long += 1
                    if not keywords or len(keywords) == 0:
                        long_without_keywords += 1
            
            if total_long > 0:
                ratio = long_without_keywords / total_long
                if ratio > 0.3:  # Mais de 30% dos chunks longos sem keywords
                    patterns.append(f"High ratio of long chunks without keywords: {ratio:.1%}")
            
            # Verifica padrões de baixa confiança
            low_confidence_count = 0
            total_keywords_checked = 0
            
            for chunk in long_chunks.data or []:
                keywords = chunk.get('keywords', [])
                for kw in keywords:
                    total_keywords_checked += 1
                    if kw.get('confidence', 1.0) < 0.5:
                        low_confidence_count += 1
            
            if total_keywords_checked > 0:
                low_conf_ratio = low_confidence_count / total_keywords_checked
                if low_conf_ratio > 0.2:  # Mais de 20% com baixa confiança
                    patterns.append(f"High ratio of low-confidence keywords: {low_conf_ratio:.1%}")
            
        except Exception as e:
            patterns.append(f"Error analyzing patterns: {str(e)}")
        
        return patterns
    
    def _generate_recommendations(self, basic_stats: Dict, top_keywords: List[KeywordStats],
                                docs_without_keywords: List[str], 
                                low_perf_patterns: List[str]) -> List[str]:
        """Gera recomendações baseadas na análise do sistema."""
        recommendations = []
        
        # Recomendações baseadas em cobertura
        if basic_stats['total_chunks'] > 0:
            coverage = basic_stats['chunks_with_keywords'] / basic_stats['total_chunks']
            if coverage < 0.5:
                recommendations.append(
                    f"Low keyword coverage ({coverage:.1%}). Consider expanding keyword patterns."
                )
        
        # Recomendações baseadas em documentos sem keywords
        if len(docs_without_keywords) > 0:
            recommendations.append(
                f"{len(docs_without_keywords)} documents have no detected keywords. "
                f"Review document processing or expand keyword detection patterns."
            )
        
        # Recomendações baseadas em keywords mais frequentes
        if top_keywords:
            composite_keywords = [kw for kw in top_keywords if kw.keyword_type == 'composite']
            if len(composite_keywords) < 5:
                recommendations.append(
                    "Few composite keywords detected. Consider adding more domain-specific terms."
                )
        
        # Recomendações baseadas em padrões de baixa performance
        for pattern in low_perf_patterns:
            if "low-confidence" in pattern:
                recommendations.append(
                    "Many keywords have low confidence. Review regex patterns and composite keyword priorities."
                )
            elif "long chunks" in pattern:
                recommendations.append(
                    "Long chunks often lack keywords. Consider improving chunk splitting or keyword detection."
                )
        
        # Recomendações gerais
        avg_keywords = basic_stats.get('avg_keywords_per_chunk', 0)
        if avg_keywords < 0.5:
            recommendations.append(
                f"Low average keywords per chunk ({avg_keywords:.1f}). "
                f"Consider expanding keyword patterns or improving text preprocessing."
            )
        elif avg_keywords > 3.0:
            recommendations.append(
                f"High average keywords per chunk ({avg_keywords:.1f}). "
                f"Consider refining patterns to reduce false positives."
            )
        
        if not recommendations:
            recommendations.append("System appears to be functioning well. Monitor regularly.")
        
        return recommendations
    
    async def optimize_keyword_patterns(self) -> Dict[str, any]:
        """Analisa e sugere otimizações para os padrões de keywords."""
        try:
            # Coleta texto de todos os chunks para análise
            response = await self.supabase_client.table("document_embeddings")\
                .select("content_chunk, keywords")\
                .limit(1000)\
                .execute()
            
            # Analisa termos frequentes não detectados
            all_text = " ".join([chunk['content_chunk'] for chunk in response.data or []])
            suggestions = self._analyze_missing_patterns(all_text)
            
            return {
                "current_patterns": len(self.keyword_detector.composite_keywords),
                "suggested_new_patterns": suggestions,
                "analysis_sample_size": len(response.data or [])
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def _analyze_missing_patterns(self, text: str) -> List[Dict]:
        """Analisa texto em busca de padrões que poderiam ser keywords."""
        suggestions = []
        
        # Padrões que podem indicar termos técnicos
        import re
        
        # Busca por termos como "sistema de X", "processo de X", etc.
        technical_patterns = [
            r'sistema de [a-záéíóúàèìòùâêîôûãõç\s]+',
            r'processo de [a-záéíóúàèìòùâêîôûãõç\s]+',
            r'política de [a-záéíóúàèìòùâêîôûãõç\s]+',
            r'plano de [a-záéíóúàèìòùâêîôûãõç\s]+',
            r'programa de [a-záéíóúàèìòùâêîôûãõç\s]+',
        ]
        
        for pattern in technical_patterns:
            matches = re.findall(pattern, text.lower())
            for match in set(matches):  # Remove duplicatas
                if len(match.split()) >= 3:  # Pelo menos 3 palavras
                    suggestions.append({
                        "pattern": match.strip(),
                        "type": "composite",
                        "confidence": 0.7,
                        "reason": "Technical term pattern detected"
                    })
        
        return suggestions[:10]  # Limita a 10 sugestões
    
    async def export_keywords_report(self, format: str = "json") -> str:
        """Exporta relatório completo das keywords em diferentes formatos."""
        try:
            health_report = await self.generate_system_health_report()
            
            if format.lower() == "json":
                return json.dumps({
                    "generated_at": datetime.now().isoformat(),
                    "system_health": {
                        "total_documents": health_report.total_documents,
                        "total_chunks": health_report.total_chunks,
                        "chunks_with_keywords": health_report.chunks_with_keywords,
                        "coverage_percentage": (health_report.chunks_with_keywords / max(1, health_report.total_chunks)) * 100,
                        "avg_keywords_per_chunk": health_report.avg_keywords_per_chunk
                    },
                    "top_keywords": [
                        {
                            "text": kw.keyword_text,
                            "type": kw.keyword_type,
                            "frequency": kw.frequency,
                            "documents_count": kw.documents_count,
                            "avg_confidence": kw.avg_confidence
                        }
                        for kw in health_report.top_keywords
                    ],
                    "issues": {
                        "documents_without_keywords": len(health_report.documents_without_keywords),
                        "low_performance_patterns": health_report.low_performance_patterns
                    },
                    "recommendations": health_report.recommendations
                }, indent=2)
            
            elif format.lower() == "markdown":
                return self._generate_markdown_report(health_report)
            
            else:
                return f"Unsupported format: {format}"
                
        except Exception as e:
            return f"Error exporting report: {str(e)}"
    
    def _generate_markdown_report(self, report: SystemHealthReport) -> str:
        """Gera relatório em formato Markdown."""
        md = f"""# Keywords System Health Report
Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## System Overview
- **Total Documents**: {report.total_documents}
- **Total Chunks**: {report.total_chunks}
- **Chunks with Keywords**: {report.chunks_with_keywords}
- **Coverage**: {(report.chunks_with_keywords / max(1, report.total_chunks)) * 100:.1f}%
- **Avg Keywords per Chunk**: {report.avg_keywords_per_chunk:.2f}

## Top Keywords
| Keyword | Type | Frequency | Documents | Avg Confidence |
|---------|------|-----------|-----------|----------------|
"""
        
        for kw in report.top_keywords[:10]:
            md += f"| {kw.keyword_text} | {kw.keyword_type} | {kw.frequency} | {kw.documents_count} | {kw.avg_confidence:.2f} |\n"
        
        md += f"""
## Issues Detected
- **Documents without Keywords**: {len(report.documents_without_keywords)}
- **Performance Patterns**: {len(report.low_performance_patterns)}

### Low Performance Patterns
"""
        for pattern in report.low_performance_patterns:
            md += f"- {pattern}\n"
        
        md += "\n### Recommendations\n"
        for rec in report.recommendations:
            md += f"- {rec}\n"
        
        return md


# Função utilitária para uso direto
async def run_health_check(supabase_client) -> None:
    """Executa verificação de saúde do sistema e imprime relatório."""
    admin = KeywordsAdmin(supabase_client)
    
    print("Running keywords system health check...")
    report = await admin.generate_system_health_report()
    
    print(f"\n=== KEYWORDS SYSTEM HEALTH REPORT ===")
    print(f"Total Documents: {report.total_documents}")
    print(f"Total Chunks: {report.total_chunks}")
    print(f"Chunks with Keywords: {report.chunks_with_keywords}")
    print(f"Coverage: {(report.chunks_with_keywords / max(1, report.total_chunks)) * 100:.1f}%")
    print(f"Avg Keywords per Chunk: {report.avg_keywords_per_chunk:.2f}")
    
    print(f"\nTop Keywords:")
    for kw in report.top_keywords[:5]:
        print(f"  - {kw.keyword_text} ({kw.keyword_type}): {kw.frequency} occurrences")
    
    if report.documents_without_keywords:
        print(f"\nDocuments without keywords: {len(report.documents_without_keywords)}")
    
    if report.low_performance_patterns:
        print(f"\nPerformance Issues:")
        for pattern in report.low_performance_patterns:
            print(f"  - {pattern}")
    
    print(f"\nRecommendations:")
    for rec in report.recommendations:
        print(f"  - {rec}")
    
    print(f"\n=== END REPORT ===")


if __name__ == "__main__":
    # Exemplo de uso standalone
    print("Keywords Admin - System Health Check")
    print("This script requires a Supabase client to run.")
    print("Import this module and use run_health_check(supabase_client) function.")