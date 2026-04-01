

## Plano: Atualizar Credenciais Dify no Formulário de Agentes

### Problema
Os defaults e placeholders do formulário de criação de agentes Dify estão desatualizados. A API Dify agora usa `https://api.dify.ai/v1` como base URL e `/chat-messages` como endpoint (sem o prefixo `/api`).

### Mudanças

#### 1. Atualizar defaults e placeholders (`src/pages/admin/AgentsConfig.tsx`)

| Campo | Atual | Novo |
|---|---|---|
| `base_url` | `https://cloud.dify.ai` | `https://api.dify.ai/v1` |
| `service_api_endpoint` | `/api/chat-messages` | `/chat-messages` |
| `public_url` | `https://cloud.dify.ai` | `https://api.dify.ai/v1` |
| `server_url` | `https://cloud.dify.ai` | `https://udify.app/chat/XXXXX` |
| App ID placeholder | UUID format | `app-xxxxxxxxxxxxxxxxxxxxxxxx` |

- Atualizar `defaultApiConfig` (linha 70-78)
- Atualizar `handlePlatformChange` defaults para Dify (linhas 214-221)
- Atualizar placeholders dos inputs (linhas 821-963)
- Atualizar tooltips/hints para refletir os novos valores

#### 2. Atualizar DifyAdapter defaults (`src/services/adapters/difyAdapter.ts`)

- Atualizar `getDefaultConfig()` (linha ~650) com os mesmos novos defaults

#### 3. Atualizar AgentsService types (`src/services/agentsService.ts`)

- Sem mudanças estruturais — os campos já existem no `ApiConfig`

### Escopo
Apenas atualização de valores default, placeholders e tooltips. Sem mudanças na lógica ou estrutura do formulário.

