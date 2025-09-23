#!/usr/bin/env python3
"""
Script de teste para validar o sistema inteligente de keywords.
Testa a detecção de keywords, chunking melhorado e busca inteligente.
"""

import sys
import os
import asyncio
from typing import List

# Adiciona o path das funções shared
sys.path.append('./supabase/functions/shared')

from keywords_detector import KeywordDetector, KeywordType, enhance_chunks_with_keywords
from intelligent_search import IntelligentSearch

def test_keyword_detection():
    """Testa a detecção básica de keywords."""
    print("[TESTE] Testando detecção de keywords...")
    
    detector = KeywordDetector()
    
    # Textos de teste
    test_texts = [
        "A certificação em sustentabilidade ambiental é obrigatória para construções no 4º distrito conforme Lei Complementar nº 434/1999.",
        "O estudo de impacto de vizinhança deve ser apresentado para a ZOT 8.2 conforme determina o Anexo 5.",
        "A área de proteção ambiental do Morro Santana está regulamentada pelo Decreto nº 15.958/2008.",
        "O coeficiente de aproveitamento para a região 3 foi definido na Lei nº 12.112/2016.",
        "Para projetos habitacionais, consulte o zoneamento especial de interesse social definido no Plano Diretor."
    ]
    
    for i, text in enumerate(test_texts, 1):
        print(f"\n--- Texto {i} ---")
        print(f"Texto: {text[:80]}...")
        
        keywords = detector.extract_all_keywords(text)
        print(f"Keywords detectadas: {len(keywords)}")
        
        for kw in keywords:
            print(f"  - {kw.text} ({kw.type.value}) - Confiança: {kw.confidence:.2f}")
    
    print("\n[OK] Teste de detecção de keywords concluído.")

def test_chunk_enhancement():
    """Testa o melhoramento de chunks com keywords."""
    print("\n[TESTE] Testando melhoramento de chunks...")
    
    # Chunks de teste
    test_chunks = [
        "Art. 15. A certificação em sustentabilidade ambiental será obrigatória para empreendimentos com área superior a 5.000m² no 4º distrito, conforme estabelecido na Lei Complementar nº 434 de 1999.",
        "O estudo de impacto de vizinhança deverá ser apresentado para todos os projetos localizados na ZOT 8.2, seguindo as diretrizes do Anexo 3 deste regulamento.",
        "As áreas de preservação permanente ao longo dos cursos d'água devem manter uma faixa mínima de 30 metros, conforme Resolução CONAMA nº 303/2002.",
        "O coeficiente de aproveitamento básico para a zona central é de 2,0, podendo ser alterado mediante outorga onerosa do direito de construir.",
        "Texto simples sem keywords especiais para teste de comparação de scores."
    ]
    
    enhanced_chunks = enhance_chunks_with_keywords(test_chunks)
    
    print(f"Chunks processados: {len(enhanced_chunks)}")
    
    for chunk in enhanced_chunks:
        print(f"\n--- Chunk {chunk['index']} ---")
        print(f"Texto: {chunk['text'][:60]}...")
        print(f"Score de prioridade: {chunk['priority_score']:.2f}")
        print(f"Keywords compostas: {chunk['has_composite_keywords']}")
        print(f"Referências legais: {chunk['legal_references_count']}")
        print(f"Keywords detectadas: {len(chunk['keywords'])}")
        
        for kw in chunk['keywords'][:3]:  # Mostra apenas as 3 primeiras
            print(f"  - {kw['text']} ({kw['type']}) - {kw['confidence']:.2f}")
    
    print("\n[OK] Teste de melhoramento de chunks concluído.")

def test_priority_ranking():
    """Testa o sistema de rankeamento por prioridade."""
    print("\n[TESTE] Testando rankeamento por prioridade...")
    
    detector = KeywordDetector()
    
    # Chunks com diferentes níveis de prioridade
    test_chunks = [
        "Texto simples sobre urbanismo geral sem termos específicos.",
        "O 4º distrito possui regulamentação especial para construções.",
        "A certificação em sustentabilidade ambiental é obrigatória conforme Lei nº 123.",
        "Estudo de impacto de vizinhança necessário para ZOT 8.2 segundo Anexo 5.",
        "Lei Complementar nº 434/1999 estabelece diretrizes para certificação em sustentabilidade ambiental no 4º distrito."
    ]
    
    chunk_keywords_list = detector.process_document_chunks(test_chunks)
    
    # Ordena por prioridade
    sorted_chunks = sorted(chunk_keywords_list, key=lambda x: x.priority_score, reverse=True)
    
    print("Chunks ordenados por prioridade:")
    for i, chunk_kw in enumerate(sorted_chunks, 1):
        print(f"\n{i}. Score: {chunk_kw.priority_score:.2f}")
        print(f"   Texto: {chunk_kw.chunk_text[:50]}...")
        print(f"   Keywords: {len(chunk_kw.keywords)}")
        print(f"   Compostas: {chunk_kw.has_composite_keywords}")
        print(f"   Legais: {chunk_kw.legal_references_count}")
    
    print("\n[OK] Teste de rankeamento concluído.")

def test_query_analysis():
    """Testa a análise de queries do usuário."""
    print("\n[TESTE] Testando análise de queries...")
    
    detector = KeywordDetector()
    
    test_queries = [
        "Qual o 4º distrito?",
        "Como funciona a certificação em sustentabilidade ambiental?",
        "Lei complementar nº 434 sobre construções",
        "ZOT 8.2 e estudo de impacto",
        "Regulamentação do anexo 3 para área de proteção ambiental"
    ]
    
    for query in test_queries:
        print(f"\n--- Query: {query} ---")
        keywords = detector.extract_all_keywords(query)
        
        print(f"Keywords detectadas: {len(keywords)}")
        
        # Analisa tipos de keywords
        types_found = set(kw.type for kw in keywords)
        for kw_type in types_found:
            type_keywords = [kw.text for kw in keywords if kw.type == kw_type]
            print(f"  {kw_type.value}: {', '.join(type_keywords)}")
        
        # Determina estratégia de busca
        if KeywordType.LEGAL_REFERENCE in types_found:
            print("  -> Estratégia: Busca por referência legal")
        elif KeywordType.ZOT_REFERENCE in types_found:
            print("  -> Estratégia: Busca por ZOT específica")
        elif KeywordType.COMPOSITE in types_found:
            print("  -> Estratégia: Busca por termo técnico")
        else:
            print("  -> Estratégia: Busca semântica geral")
    
    print("\n[OK] Teste de análise de queries concluído.")

def test_search_suggestions():
    """Testa o sistema de sugestões de busca."""
    print("\n[TESTE] Testando sugestões de busca...")
    
    search_service = IntelligentSearch(None)  # Mock do supabase_client
    
    partial_queries = [
        "cert",
        "4º",
        "lei comp",
        "zot",
        "impacto",
        "sustent",
        "distrito"
    ]
    
    for partial in partial_queries:
        suggestions = search_service.get_search_suggestions(partial)
        print(f"\n'{partial}' -> {len(suggestions)} sugestões:")
        for suggestion in suggestions[:5]:  # Mostra apenas as 5 primeiras
            print(f"  - {suggestion}")
    
    print("\n[OK] Teste de sugestões concluído.")

def test_pattern_matching():
    """Testa os padrões regex para diferentes tipos de referências."""
    print("\n[TESTE] Testando padrões de detecção...")
    
    detector = KeywordDetector()
    
    # Testa padrões específicos
    test_cases = {
        "Referências Legais": [
            "Lei Complementar nº 434/1999",
            "Decreto n° 15.958 de 2008",
            "Resolução nº 303/2002",
            "Portaria n° 123/2020"
        ],
        "Referências ZOT": [
            "ZOT 8.2",
            "zot 1.5",
            "Zona 3",
            "Zoneamento 12.4"
        ],
        "Referências Anexos": [
            "Anexo 3",
            "anexo 5.1",
            "Apêndice 2",
            "Tabela 4.2",
            "Figura 1.5",
            "Mapa 7"
        ],
        "Referências Distritos": [
            "4º distrito",
            "distrito 2",
            "região 5"
        ]
    }
    
    for category, examples in test_cases.items():
        print(f"\n--- {category} ---")
        for example in examples:
            keywords = detector.extract_all_keywords(example)
            matches = [kw.text for kw in keywords]
            print(f"  '{example}' -> {matches if matches else 'Nenhum match'}")
    
    print("\n[OK] Teste de padrões concluído.")

def run_comprehensive_test():
    """Executa uma bateria completa de testes."""
    print("INICIANDO TESTES DO SISTEMA DE KEYWORDS")
    print("=" * 50)
    
    try:
        test_keyword_detection()
        test_chunk_enhancement()
        test_priority_ranking()
        test_query_analysis()
        test_search_suggestions()
        test_pattern_matching()
        
        print("\n" + "=" * 50)
        print("[SUCESSO] Todos os testes concluídos com sucesso!")
        print("\nResumo do sistema implementado:")
        print("- Detecção de keywords compostas prioritárias")
        print("- Reconhecimento automático de referências legais")
        print("- Identificação de ZOTs e anexos")
        print("- Sistema de priorização de chunks")
        print("- Análise inteligente de queries")
        print("- Sugestões de busca contextuais")
        print("- Integração com sistema de chunking")
        
    except Exception as e:
        print(f"\n[ERRO] Erro durante os testes: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_comprehensive_test()