# 🚀 Deploy da Edge Function RAG Corrigida

## ⚡ Passos Rápidos (5 minutos)

### 1. Acesse o Supabase Dashboard
https://app.supabase.com/project/ngrqwmvuhvjkeohesbxs/functions

### 2. Crie Nova Edge Function

1. Clique em **"New Function"**
2. Nome: `response-synthesizer-rag`
3. Clique em **"Create"**

### 3. Cole o Código

1. Copie TODO o conteúdo do arquivo:
   ```
   supabase/functions/response-synthesizer-rag/index.ts
   ```

2. Cole no editor da Edge Function

3. Clique em **"Deploy"**

### 4. Aguarde o Deploy
- Deve aparecer "Deployed successfully" em verde
- A função ficará disponível em ~30 segundos

## 🧪 Teste Imediato

Após o deploy, teste no chat as 3 perguntas:

1. **"Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?"**
   - ✅ Deve retornar: **Art. 81 - III**

2. **"Qual a regra para empreendimentos do 4º distrito?"**
   - ✅ Deve retornar: **Art. 74**

3. **"Quais bairros têm risco de inundação?"**
   - ✅ Deve listar: Navegantes, Humaitá, Ilhas, etc.

## 📝 O que foi feito?

- Criada nova Edge Function que usa as funções SQL corrigidas
- Integração com busca vetorial hierárquica
- Detecção automática de queries que precisam de RAG
- Respostas específicas com referências aos artigos

## ⚠️ Importante

Esta função funciona em paralelo com o sistema existente. Apenas queries específicas (certificação, 4º distrito, riscos) usarão o novo sistema RAG otimizado.