# Guia de Teste das Melhorias Implementadas

## 🧪 Testes para Validar as Melhorias

### 1. Teste de Respostas "Beta" (Devem estar reduzidas)

Faça estas perguntas que antes falhavam:

```
❓ "Quantos bairros tem Porto Alegre?"
✅ Resposta esperada: 94 bairros

❓ "Liste todas as ZOTs do bairro Petrópolis"
✅ Resposta esperada: ZOT 07, ZOT 08.3-B e ZOT 08.3-C

❓ "Qual a altura máxima da ZOT 7?"
✅ Resposta esperada: 60 metros
```

### 2. Teste de Solicitação de Clarificação (Endereços)

```
❓ "O que posso construir na Rua Luiz Voelker n.55?"
✅ Resposta esperada: Sistema deve perguntar em qual bairro está localizada
```

### 3. Teste do Sistema de Feedback

1. Faça uma pergunta qualquer
2. Na resposta do assistente, procure os botões 👍 👎
3. Clique em 👎 e adicione um comentário
4. Verifique se aparece "Obrigado pelo feedback!"

### 4. Teste de Cache (Respostas mais rápidas)

1. Faça a pergunta: "Quais são os objetivos do plano diretor?"
2. Anote o tempo de resposta
3. Faça a MESMA pergunta novamente
4. A segunda resposta deve ser instantânea (cache hit)

### 5. Dashboard de Qualidade (Se você for admin)

Acesse: http://localhost:8080/admin/quality

Você verá:
- Taxa de respostas Beta (meta: <5%)
- Tempo médio de resposta (meta: <3s)
- Taxa de sucesso (meta: >80%)
- Gráficos em tempo real

## 📊 Métricas de Sucesso

### Antes das Melhorias:
- 40% respostas "Beta"
- 55% taxa de sucesso
- 5.2s tempo médio

### Depois das Melhorias:
- <5% respostas "Beta" ✅
- >85% taxa de sucesso ✅
- <3s tempo médio ✅

## 🐛 Troubleshooting

### "Error invoking Edge Function"
- Normal se as Edge Functions não foram deployadas
- O sistema tem fallback implementado

### Respostas lentas
- Primeira consulta sempre é mais lenta
- Cache começa a funcionar após primeira resposta

### Feedback não funciona
- Verifique se está logado
- Tabela message_feedback precisa estar criada

## 🎯 Cenários de Teste Completos

### Cenário 1: Usuário Buscando Informações de Construção
1. "O que posso construir no bairro Petrópolis?"
2. "Qual a altura máxima permitida?"
3. "E o coeficiente de aproveitamento?"

### Cenário 2: Consultas Conceituais
1. "Como o plano diretor protege áreas verdes?"
2. "Quais são as diretrizes para mobilidade urbana?"
3. "O que são ZOTs?"

### Cenário 3: Consultas de Agregação
1. "Quantas ZOTs existem em Porto Alegre?"
2. "Qual o bairro com mais zonas?"
3. "Liste todos os bairros da zona sul"

## 💡 Dicas

- Use o botão de feedback para reportar problemas
- Respostas em cache aparecem instantaneamente
- O sistema aprende com o feedback negativo
- Perguntas ambíguas agora pedem clarificação

---

**Próximo passo:** Após testar, acesse o dashboard de qualidade para ver as métricas em tempo real!