-- Seed initial legal documents

-- Insert Terms of Use
INSERT INTO legal_documents (
  document_type,
  version,
  title,
  content,
  effective_date,
  is_active
) VALUES (
  'terms',
  '1.0',
  'Termos de Uso - ChatPDPOA',
  '# TERMOS DE USO

## 1.1 Apresentação da Plataforma

Bem-vindo ao ChatPDPOA, plataforma digital desenvolvida pela Prefeitura de Porto Alegre, através da Secretaria Municipal de Meio Ambiente, Urbanismo e Sustentabilidade (SMAMUS) junto ao Escritório de Reconstrução e Adaptação Climática para auxiliar cidadãos a esclarecerem dúvidas sobre a proposta do novo Plano Diretor de Desenvolvimento Urbano Ambiental de Porto Alegre.

## 1.2 Aceitação dos Termos

Ao acessar e utilizar a plataforma ChatPDPOA, você concorda integralmente com estes Termos de Uso. Caso não concorde com qualquer disposição aqui prevista, solicitamos que não utilize a plataforma.

## 1.3 Objetivo da Plataforma

O ChatPDPOA utiliza tecnologia de inteligência artificial para:

- Responder dúvidas sobre o Plano Diretor de Porto Alegre
- Facilitar o acesso à informação urbanística
- Promover a participação cidadã nos processos de planejamento urbano
- Democratizar o conhecimento sobre desenvolvimento urbano

## 1.4 Uso Permitido

Você pode utilizar a plataforma para:

- Fazer perguntas sobre o Plano Diretor
- Obter informações sobre legislação urbanística
- Esclarecer dúvidas sobre zoneamento, parâmetros construtivos e normas urbanas
- Acessar informações públicas relacionadas ao planejamento da cidade

## 1.5 Uso Proibido

É expressamente proibido:

- Utilizar a plataforma para fins ilegais ou não autorizados
- Tentar violar a segurança do sistema
- Transmitir vírus, malware ou qualquer código malicioso
- Fazer uso comercial não autorizado das informações
- Sobrecarregar propositalmente o sistema

## 1.6 Limitações e Responsabilidades

A Prefeitura de Porto Alegre:

- Não garante disponibilidade ininterrupta da plataforma
- Pode modificar, suspender ou descontinuar funcionalidades
- Não se responsabiliza por interpretações equivocadas das respostas da IA
- Recomenda consultar documentação oficial para decisões importantes

O usuário reconhece que:

- As respostas são geradas por inteligência artificial
- Informações devem ser confirmadas em fontes oficiais para decisões formais
- A plataforma é um instrumento de orientação e educação
- Consultas técnicas complexas devem ser direcionadas aos órgãos competentes

## 1.7 Alterações nos Termos

A Prefeitura de Porto Alegre reserva-se o direito de modificar estes Termos de Uso a qualquer momento. As alterações entrarão em vigor imediatamente após sua publicação na plataforma.',
  NOW(),
  true
) ON CONFLICT (document_type, version) DO NOTHING;

-- Insert Privacy Policy
INSERT INTO legal_documents (
  document_type,
  version,
  title,
  content,
  effective_date,
  is_active
) VALUES (
  'privacy',
  '1.0',
  'Política de Privacidade - ChatPDPOA',
  '# POLÍTICA DE PRIVACIDADE

## 2.1 Compromisso com a Privacidade

A Prefeitura de Porto Alegre compromete-se a proteger a privacidade dos usuários do ChatPDPOA, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e demais legislações aplicáveis.

## 2.2 Dados Coletados

### 2.2.1 Dados fornecidos pelo usuário:

- Perguntas e mensagens enviadas à IA
- Feedback sobre as respostas (quando fornecido)

### 2.2.2 Dados coletados automaticamente:

- Endereço IP
- Tipo de navegador e dispositivo
- Data e horário de acesso
- Páginas visitadas
- Tempo de permanência na plataforma
- Interações com o chatbot

## 2.3 Finalidade do Tratamento de Dados

Os dados são coletados e tratados para:

- Fornecer respostas adequadas às suas perguntas
- Melhorar a qualidade e precisão das respostas da IA
- Analisar o uso da plataforma e identificar melhorias
- Gerar estatísticas agregadas e anônimas
- Cumprir obrigações legais e regulatórias
- Garantir a segurança da plataforma

## 2.4 Base Legal

O tratamento de dados é realizado com base nas seguintes hipóteses legais:

- Execução de serviço público (Art. 7º, III, LGPD)
- Interesse público (Art. 7º, II e III, LGPD)
- Consentimento do titular (quando aplicável)

## 2.5 Compartilhamento de Dados

Não compartilhamos seus dados pessoais com terceiros, exceto:

- Quando exigido por lei ou ordem judicial
- Com prestadores de serviços técnicos, sob rígidas obrigações de confidencialidade
- Para proteção de direitos da administração pública
- Em formato agregado e anonimizado para fins estatísticos

## 2.6 Armazenamento e Segurança

- Os dados são armazenados em servidores seguros
- Implementamos medidas técnicas e administrativas de segurança
- O acesso aos dados é restrito a pessoal autorizado
- Mantemos os dados pelo tempo necessário aos fins estabelecidos

## 2.7 Direitos dos Titulares

De acordo com a LGPD, você tem direito a:

- Confirmar a existência de tratamento de dados
- Acessar seus dados
- Corrigir dados incompletos ou inexatos
- Solicitar anonimização ou eliminação de dados
- Revogar consentimento (quando aplicável)
- Obter informações sobre compartilhamento
- Solicitar portabilidade dos dados

Para exercer seus direitos, entre em contato:

**E-mail:** planodiretor@portoalegre.rs.gov.br  
**SMAMUS:** https://www.portoalegre.rs.gov.br/smamus  
**Endereço:** Rua Luiz Voelcker, 55 - Três Figueiras, Porto Alegre - RS, 91330-190

## 2.8 Dados de Menores

A plataforma não coleta intencionalmente dados de menores de 18 anos. Caso identifiquemos coleta inadvertida, os dados serão excluídos.

## 2.9 Alterações na Política

Esta Política de Privacidade pode ser atualizada periodicamente. Recomendamos revisá-la regularmente.',
  NOW(),
  true
) ON CONFLICT (document_type, version) DO NOTHING;

-- Insert Cookies Policy
INSERT INTO legal_documents (
  document_type,
  version,
  title,
  content,
  effective_date,
  is_active
) VALUES (
  'cookies',
  '1.0',
  'Política de Cookies - ChatPDPOA',
  '# POLÍTICA DE COOKIES E TECNOLOGIAS SIMILARES

## 3.1 O que são Cookies?

Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você acessa a plataforma. Eles permitem reconhecer seu navegador e melhorar sua experiência.

## 3.2 Como Utilizamos Cookies

Usamos tecnologias para melhorar sua experiência e analisar o uso da plataforma.

Especificamente, utilizamos cookies e tecnologias similares para:

- Manter sua sessão ativa durante o uso
- Lembrar suas preferências
- Analisar padrões de navegação
- Melhorar o desempenho da plataforma
- Compreender como os usuários interagem com o chatbot
- Gerar estatísticas de uso

## 3.3 Tipos de Cookies Utilizados

### 3.3.1 Cookies Essenciais (Necessários)

- Indispensáveis para o funcionamento da plataforma
- Não podem ser desabilitados
- Exemplo: cookies de sessão

### 3.3.2 Cookies de Desempenho e Análise

- Coletam informações sobre como você usa a plataforma
- Ajudam a melhorar funcionalidades
- Geram relatórios de uso agregados

### 3.3.3 Cookies de Funcionalidade

- Permitem que a plataforma lembre suas escolhas
- Melhoram sua experiência personalizada

## 3.4 Cookies de Terceiros

Podemos utilizar serviços de terceiros que instalam cookies, como:

- Google Analytics (análise de uso)
- Ferramentas de monitoramento de desempenho

Estes serviços possuem suas próprias políticas de privacidade.

## 3.5 Gerenciamento de Cookies

Você pode controlar e gerenciar cookies através:

### 3.5.1 Configurações do navegador:

- **Chrome:** Configurações > Privacidade e segurança > Cookies
- **Firefox:** Opções > Privacidade e Segurança
- **Safari:** Preferências > Privacidade
- **Edge:** Configurações > Cookies e permissões de site

### 3.5.2 Ferramentas da plataforma:

- Acesse o painel de preferências de cookies
- Escolha quais categorias aceitar

## 3.6 Consequências da Desativação

A desativação de cookies pode:

- Limitar funcionalidades da plataforma
- Afetar sua experiência de navegação
- Impedir o uso de recursos personalizados

Cookies essenciais não podem ser desativados sem comprometer o funcionamento básico.

## 3.7 Outras Tecnologias

Além de cookies, podemos utilizar:

- Local Storage: armazenamento local de preferências
- Session Storage: dados temporários da sessão

## 3.8 Duração dos Cookies

- **Cookies de sessão:** expiram ao fechar o navegador
- **Cookies persistentes:** permanecem por período determinado ou até exclusão manual

## 3.9 Atualizações

Esta política de cookies pode ser atualizada para refletir mudanças tecnológicas ou legais.

---

**Versão:** 1.0  
**Última atualização:** ' || TO_CHAR(NOW(), 'DD/MM/YYYY') || '

A Prefeitura de Porto Alegre está comprometida com a transparência, a proteção de dados e o uso ético de tecnologias para melhor servir aos cidadãos.',
  NOW(),
  true
) ON CONFLICT (document_type, version) DO NOTHING;