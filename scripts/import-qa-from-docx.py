#!/usr/bin/env python3
"""
Script para extrair perguntas e respostas do arquivo PDPOA2025-QA.docx
e importá-las para a tabela qa_test_cases no Supabase
"""

import os
import json
import re
from docx import Document
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def clean_text(text):
    """Remove caracteres problemáticos do texto"""
    # Remover emojis e caracteres especiais
    text = text.encode('ascii', 'ignore').decode('ascii')
    # Limpar espaços extras
    text = ' '.join(text.split())
    return text

def extract_qa_from_docx(file_path):
    """Extrai perguntas e respostas do documento Word"""
    doc = Document(file_path)
    qa_pairs = []
    
    current_question = None
    current_answer = []
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
            
        # Limpar texto
        text = clean_text(text)
        
        # Detectar pergunta (geralmente começa com número ou tem "?")
        if re.match(r'^\d+[\.\)]\s*', text) or '?' in text:
            # Salvar QA anterior se existir
            if current_question and current_answer:
                qa_pairs.append({
                    'question': current_question,
                    'expected_answer': ' '.join(current_answer).strip()
                })
            
            # Iniciar nova pergunta
            current_question = re.sub(r'^\d+[\.\)]\s*', '', text).strip()
            current_answer = []
        else:
            # Adicionar à resposta atual
            if current_question:
                current_answer.append(text)
    
    # Adicionar último par se existir
    if current_question and current_answer:
        qa_pairs.append({
            'question': current_question,
            'expected_answer': ' '.join(current_answer).strip()
        })
    
    return qa_pairs

def categorize_question(question):
    """Categoriza a pergunta baseado no conteúdo"""
    question_lower = question.lower()
    
    if 'altura' in question_lower or 'gabarito' in question_lower:
        return 'altura_maxima'
    elif 'zot' in question_lower or 'zona' in question_lower:
        return 'zonas'
    elif 'coeficiente' in question_lower or 'ca' in question_lower:
        return 'coeficiente_aproveitamento'
    elif 'taxa' in question_lower or 'permeabilidade' in question_lower:
        return 'taxa_permeabilidade'
    elif 'recuo' in question_lower:
        return 'recuos'
    elif 'bairro' in question_lower:
        return 'bairros'
    elif 'construir' in question_lower or 'construção' in question_lower:
        return 'construcao'
    elif 'plano diretor' in question_lower:
        return 'conceitual'
    else:
        return 'geral'

def determine_complexity(question, answer):
    """Determina a complexidade da pergunta"""
    q_len = len(question.split())
    a_len = len(answer.split())
    
    if q_len < 10 and a_len < 50:
        return 'simple'
    elif q_len < 20 and a_len < 150:
        return 'medium'
    else:
        return 'high'

def import_to_supabase(qa_pairs):
    """Importa os pares QA para o Supabase"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Preparar dados para inserção
    test_cases = []
    for i, qa in enumerate(qa_pairs, start=1):
        # Extrair palavras-chave da resposta
        answer_words = qa['expected_answer'].lower().split()
        # Selecionar palavras relevantes (ignorar preposições, artigos, etc.)
        stop_words = {'o', 'a', 'os', 'as', 'de', 'da', 'do', 'dos', 'das', 'em', 'na', 'no', 'nas', 'nos', 
                      'para', 'com', 'sem', 'por', 'que', 'e', 'é', 'um', 'uma', 'como', 'mais', 'mas'}
        keywords = [w for w in answer_words if len(w) > 3 and w not in stop_words][:10]  # Top 10 keywords
        
        test_case = {
            'test_id': f'pdpoa_qa_{i:03d}',
            'query': qa['question'][:500],  # Limitar tamanho
            'expected_response': qa['expected_answer'][:2000],  # Limitar tamanho
            'expected_keywords': keywords,
            'category': categorize_question(qa['question']),
            'complexity': determine_complexity(qa['question'], qa['expected_answer']),
            'min_response_length': max(50, len(qa['expected_answer']) // 10),  # Pelo menos 10% do tamanho esperado
            'is_active': True
        }
        test_cases.append(test_case)
    
    # Inserir em lotes de 50
    batch_size = 50
    total_inserted = 0
    
    for i in range(0, len(test_cases), batch_size):
        batch = test_cases[i:i+batch_size]
        try:
            result = supabase.table('qa_test_cases').insert(batch).execute()
            total_inserted += len(batch)
            print(f"[OK] Inseridos {len(batch)} casos (total: {total_inserted}/{len(test_cases)})")
        except Exception as e:
            print(f"[ERRO] Erro ao inserir lote {i//batch_size + 1}: {e}")
    
    return total_inserted

def main():
    print(">>> Importando casos de teste do PDPOA2025-QA.docx\n")
    print("=" * 50)
    
    # Caminho do arquivo
    file_path = 'knowledgebase/PDPOA2025-QA.docx'
    
    if not os.path.exists(file_path):
        print(f"[ERRO] Arquivo não encontrado: {file_path}")
        return
    
    print(f"[INFO] Lendo arquivo: {file_path}")
    
    # Extrair QA pairs
    qa_pairs = extract_qa_from_docx(file_path)
    print(f"[OK] Extraídos {len(qa_pairs)} pares de pergunta/resposta")
    
    if qa_pairs:
        # Mostrar amostra
        print("\n[AMOSTRA] Casos extraídos:")
        for qa in qa_pairs[:3]:
            print(f"\nPergunta: {qa['question'][:100]}...")
            print(f"Resposta: {qa['expected_answer'][:100]}...")
        
        # Importar para Supabase
        print(f"\n[UPLOAD] Importando para Supabase...")
        total = import_to_supabase(qa_pairs)
        
        print(f"\n[SUCESSO] Importação concluída! {total} casos adicionados ao banco de dados.")
        print("\n[PRÓXIMOS PASSOS]:")
        print("1. Acesse http://localhost:8080/admin/benchmark")
        print("2. Execute o benchmark com todos os casos")
        print("3. Analise os resultados para identificar problemas")
    else:
        print("[AVISO] Nenhum par QA encontrado no documento")

if __name__ == "__main__":
    main()