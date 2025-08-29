#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Analisar o documento LUOS original para verificar a estrutura correta
"""

import docx
import re
import os
import sys

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Caminho do arquivo
file_path = 'knowledgebase/PDPOA2025-Minuta_Preliminar_LUOS.docx'

if not os.path.exists(file_path):
    print(f"❌ Arquivo não encontrado: {file_path}")
    exit(1)

print('📖 ANÁLISE DO DOCUMENTO LUOS ORIGINAL')
print('=' * 70)
print(f'Arquivo: {file_path}')
print()

try:
    # Abrir o documento
    doc = docx.Document(file_path)
    
    # Coletar todo o texto
    all_paragraphs = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            all_paragraphs.append(text)
    
    print(f'Total de parágrafos: {len(all_paragraphs)}')
    print()
    
    # Buscar títulos
    titles = {}
    roman_numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
    
    for para in all_paragraphs:
        # Buscar padrão TÍTULO
        if 'TÍTULO' in para.upper():
            for num in roman_numerals:
                pattern = f'TÍTULO\\s+{num}(?:\\s*[-–]\\s*|\\s+)(.*)'.replace('\\', '\\\\')
                match = re.search(pattern, para, re.IGNORECASE)
                if match:
                    title_name = match.group(1).strip() if match.group(1) else para
                    titles[num] = title_name
                    break
    
    # Mostrar títulos encontrados
    print('📚 TÍTULOS ENCONTRADOS:')
    print('-' * 70)
    
    # Ordenar por número romano
    roman_to_int = {r: i for i, r in enumerate(roman_numerals, 1)}
    sorted_titles = sorted(titles.items(), key=lambda x: roman_to_int.get(x[0], 99))
    
    for num, name in sorted_titles:
        print(f'  TÍTULO {num}: {name[:60]}')
    
    print(f'\n✅ Total de títulos: {len(titles)}')
    
    # Verificar títulos específicos VII, VIII, IX, X
    print('\n🎯 VERIFICAÇÃO DE TÍTULOS CRÍTICOS:')
    print('-' * 70)
    
    critical_titles = ['VII', 'VIII', 'IX', 'X']
    for title_num in critical_titles:
        if title_num in titles:
            print(f'  ✅ TÍTULO {title_num} EXISTE: {titles[title_num][:50]}')
        else:
            print(f'  ❌ TÍTULO {title_num} NÃO ENCONTRADO')
    
    # Buscar artigos das disposições finais
    print('\n📝 ARTIGOS DAS DISPOSIÇÕES FINAIS:')
    print('-' * 70)
    
    for art_num in [119, 120, 121, 122, 123]:
        found = False
        for para in all_paragraphs:
            if f'Art. {art_num}' in para or f'Artigo {art_num}' in para:
                print(f'  ✅ Art. {art_num}º: {para[:60]}...')
                found = True
                break
        if not found:
            print(f'  ❌ Art. {art_num}º não encontrado')
    
    # Buscar menção a "Disposições Finais"
    print('\n🔍 BUSCA POR "DISPOSIÇÕES FINAIS":')
    print('-' * 70)
    
    for para in all_paragraphs:
        if 'disposições finais' in para.lower() or 'disposições transitórias' in para.lower():
            print(f'  ✅ Encontrado: {para[:80]}...')
            break
    
except Exception as e:
    print(f'❌ Erro ao processar documento: {e}')

print('\n' + '=' * 70)
print('ANÁLISE CONCLUÍDA')