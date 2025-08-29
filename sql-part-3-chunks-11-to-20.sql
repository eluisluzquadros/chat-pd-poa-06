-- PARTE 3: Chunks 11 a 20
-- Document ID: 30014c0a-3b55-42a2-a22c-e8f4090d5591

-- Chunk 11
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.2313725490196079,-0.4901960784313726,0.584313725490196,-0.7411764705882353,-0.584313725490196/* ... mais 1526 valores ... */,0.5450980392156863,-0.2313725490196078,-0.2784313725490196,0.6941176470588235,-0.34901960784313724]::float[]::vector(1536),
  '🟩 Resposta:  O novo Plano Diretor fortalece o sistema de gestão urbana para garantir que os recursos arrecadados com instrumentos como a Outorga Onerosa — novo nome do solo criado — sejam usados com inteligência. Esses valores passam a ser direcionados de forma estratégica para melhorar a infraestrutura da cidade, qualificar os bairros e ampliar o acesso à moradia digna. A aplicação dos recursos será orientada por dados e prioridades territoriais, assegurando que o crescimento urbano traga retorno real para toda a população.

🟨 Pergunta: 

O plano está sendo conduzido em benefício do mercado imobiliário em detrimento da população?',
  '🟩 Resposta:  O novo Plano Diretor fortalece o sistema de gestão urbana para garantir que os recursos arrecadados com instrumentos como a Outorga Onerosa — novo nome do solo criado — sejam usados com ',
  10,
  '{"keywords":["bairro"],"chunk_size":640,"has_qa":false}'::jsonb
);

-- Chunk 12
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.6705882352941177,-0.1843137254901961,-0.050980392156862786,-0.30980392156862746,0.19999999999999996/* ... mais 1526 valores ... */,-0.4117647058823529,-0.4666666666666667,0.4509803921568627,-0.3254901960784313,0.11372549019607847]::float[]::vector(1536),
  '🟩 Resposta: Não. O Plano Diretor parte da lógica de que a cidade deve funcionar para todos, e isso exige que o mercado urbano esteja regulado com clareza, justiça e previsibilidade. A revisão não retira direitos sociais — ao contrário, amplia instrumentos como a Outorga Onerosa (solo criado) para gerar recursos para habitação, infraestrutura e espaços públicos. Além disso, o plano propõe a organização do território em sistemas que garantam equilíbrio entre adensamento, proteção ambiental e acesso à cidade para todas as classes sociais.

🟨 Pergunta: 

O processo é realmente participativo ou só formal?',
  '🟩 Resposta: Não. O Plano Diretor parte da lógica de que a cidade deve funcionar para todos, e isso exige que o mercado urbano esteja regulado com clareza, justiça e previsibilidade. A revisão não ret',
  11,
  '{"keywords":[],"chunk_size":609,"has_qa":false}'::jsonb
);

-- Chunk 13
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.4666666666666667,0.30980392156862746,0.48235294117647065,-0.050980392156862786,-0.9529411764705882/* ... mais 1526 valores ... */,-0.9921568627450981,-0.5764705882352941,-0.19999999999999996,-0.41960784313725485,-0.9137254901960784]::float[]::vector(1536),
  '🟩 Resposta: A participação foi estruturada em várias etapas: oficinas, audiências públicas, escutas setoriais, reuniões no CMDUA e canais digitais. Alguns números da participação social até o momento incluem:  9 Oficinas Territoriais, 15 Exposições Interativas, 2 Seminários, 2 Conferências, 7 Oficinas Temáticas, 24 Devolutivas, 4 Consultas Públicas, 184 Reuniões e 30 Reuniões do CMDUA e diversas visitas à entidades. Um debate que se estende desde 2019. O novo plano ainda propõe uma governança permanente da política urbana, com o Centro de Inteligência Territorial (CIT), o CMDUA fortalecido e o SGC (Sistema de Gestão, Controle e Planejamento) como pilares institucionais. Isso garante que a participação não acabe com a aprovação da lei — ela passa a ser contínua, auditável e com base em dados públicos. 

🟨 Pergunta: 

Quem ganha e quem perde com as 16 ZOTs e o novo zoneamento?',
  '🟩 Resposta: A participação foi estruturada em várias etapas: oficinas, audiências públicas, escutas setoriais, reuniões no CMDUA e canais digitais. Alguns números da participação social até o momento',
  12,
  '{"keywords":["zot","setor"],"chunk_size":889,"has_qa":false}'::jsonb
);

-- Chunk 14
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.3411764705882352,0.019607843137254832,-0.4117647058823529,0.1607843137254903,0.48235294117647065/* ... mais 1526 valores ... */,0.8352941176470587,0.9137254901960785,0.41960784313725497,0.21568627450980382,0.08235294117647052]::float[]::vector(1536),
  '🟩 Resposta: O novo zoneamento não distribui “ganhos” e “perdas” arbitrariamente: ele reorganiza o território para equilibrar densidade, infraestrutura e vocações locais. As 16 ZOTs (Zonas de Ordenamento Territorial) foram desenhadas a partir de dados reais sobre uso do solo, mobilidade, riscos ambientais e acesso a serviços. Em vez de regras fragmentadas por zoneamentos específicos, as ZOTs buscam coerência e equidade territorial. Ganham as pessoas — sobretudo onde havia travas ao uso urbano qualificado.

🟨 Pergunta: 

Os planos locais (zona Centro, 4º distrito, Ipiranga etc.) enfraquecem a consistência do Plano Diretor?',
  '🟩 Resposta: O novo zoneamento não distribui “ganhos” e “perdas” arbitrariamente: ele reorganiza o território para equilibrar densidade, infraestrutura e vocações locais. As 16 ZOTs (Zonas de Ordename',
  13,
  '{"keywords":["zona","zot","uso do solo"],"chunk_size":630,"has_qa":false}'::jsonb
);

-- Chunk 15
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.9764705882352942,0.8901960784313725,0.027450980392156765,0.1450980392156862,-0.8901960784313725/* ... mais 1526 valores ... */,0.6705882352941177,-0.7411764705882353,0.8823529411764706,-0.803921568627451,0.8666666666666667]::float[]::vector(1536),
  '🟩 Resposta: Não. Esses planos locais fazem parte da Componente Espacial, que permite que áreas com desafios e oportunidades específicas tenham diretrizes mais detalhadas, sem contrariar os princípios gerais do Plano Diretor. Eles são estratégicos para ativar o potencial urbano, cultural e econômico de cada território e obedecem aos objetivos e sistemas definidos pelo plano geral. Diversos municípios ao redor do mundo utilizam instrumentos equivalentes aos chamados planos parciais, planos locais, planos de bairro ou planos de detalhamento — que detalham regras urbanísticas mais específicas em certas áreas da cidade, em complemento ao plano diretor ou plano regulador geral. Esses instrumentos são comuns em cidades que adotam planejamento urbano por zonas, com diferentes níveis de detalhamento espacial. Aqui estão alguns exemplos internacionais relevantes: Paris, Lyon, Bordeaux (França); Berlim, Munique, Hamburgo (Alemanha); Londres, Manchester, Birmingham (Reino Unido); Toronto, Vancouver, Calgary (Canadá); San Francisco, Nova York, Portland (Estados Unidos); Barcelona, Madri, Sevilha (Espanha); Santiago e Valparaíso (Chile); Lisboa e Porto (Portugal); Bogotá (Colômbia).',
  '🟩 Resposta: Não. Esses planos locais fazem parte da Componente Espacial, que permite que áreas com desafios e oportunidades específicas tenham diretrizes mais detalhadas, sem contrariar os princípios',
  14,
  '{"keywords":["zona","bairro","área"],"chunk_size":1188,"has_qa":false}'::jsonb
);

-- Chunk 16
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.4666666666666667,-0.2313725490196078,0.30980392156862746,0.05882352941176472,0.4274509803921569/* ... mais 1526 valores ... */,0.2313725490196079,0.9372549019607843,0.48235294117647065,0.050980392156862786,-0.6862745098039216]::float[]::vector(1536),
  '🟨 Pergunta: 

O novo plano responde às enchentes de 2024 ou continua ignorando a necessidade de manutenção da infraestrutura de drenagem e diques?

🟩 Resposta: O Plano Diretor não substitui os planos operacionais de manutenção, mas organiza o território com o objetivo de prevenir novos riscos. A proposta valoriza a ampliação de áreas de preservação, a criação de corredores ecológicos, a integração de redes de drenagem e a definição de áreas prioritárias para ação pública. A adaptação climática é um dos objetivos centrais do plano, e a requalificação de áreas vulneráveis está prevista nas Áreas Estruturadoras e nos Sistemas de Espaços Abertos e Ecológicos.

É possível dividir o território de Porto Alegre em duas grandes áreas, considerando os eventos climáticos de 2024:

uma acima da cota de inundação,

e outra abaixo dessa cota, que foi diretamente impactada.

Para essa área diretamente afetada, o plano prevê, de forma geral, duas estratégias principais:',
  '🟨 Pergunta: 

O novo plano responde às enchentes de 2024 ou continua ignorando a necessidade de manutenção da infraestrutura de drenagem e diques?

🟩 Resposta: O Plano Diretor não substitui os plano',
  15,
  '{"keywords":["área"],"chunk_size":970,"has_qa":false}'::jsonb
);

-- Chunk 17
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.4039215686274509,0.9294117647058824,-0.019607843137254943,-0.9372549019607843,-0.2549019607843137/* ... mais 1526 valores ... */,0.5058823529411764,0.5529411764705883,-0.6313725490196078,-0.6235294117647059,-1]::float[]::vector(1536),
  'a recuperação do sistema nas áreas protegidas;

e a realização de estudos específicos para as ilhas e para a porção sul do território.

Nas áreas protegidas, o Plano Diretor orienta a ocupação com índices compatíveis com a infraestrutura disponível e com o acesso a serviços públicos. Já nas ilhas e na porção sul, onde não há zoneamento de proteção, são propostos índices e taxas urbanísticas mais restritivos, prevendo o posterior detalhamento por meio de estudos já contratados e em andamento.

🟨 Pergunta: 

O plano aborda o déficit habitacional e regularização de favelas?',
  'a recuperação do sistema nas áreas protegidas;

e a realização de estudos específicos para as ilhas e para a porção sul do território.

Nas áreas protegidas, o Plano Diretor orienta a ocupação com índ',
  16,
  '{"keywords":["área","ocupação"],"chunk_size":578,"has_qa":false}'::jsonb
);

-- Chunk 18
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.44313725490196076,-0.5294117647058824,0.5058823529411764,-0.9450980392156862,0.2078431372549019/* ... mais 1526 valores ... */,-0.3803921568627451,0.15294117647058814,0.027450980392156765,0.1215686274509804,0.7490196078431373]::float[]::vector(1536),
  '🟩 Resposta: Sim. O plano reconhece o déficit habitacional e inclui estratégias para regularização fundiária, reassentamento de famílias em áreas de risco e ampliação da oferta de habitação social em áreas com infraestrutura e emprego. Há zonas específicas para melhorias urbanas com foca na qualificação da HIS (Habitação de Interesse Social), além de regras mais claras para parcelamentos populares e para uso misto, o que permite moradia mais próxima de oportunidades.

🟨 Pergunta:

A revisão chega tarde demais: é eficaz após 5 anos de atraso e eventos críticos como enchentes?',
  '🟩 Resposta: Sim. O plano reconhece o déficit habitacional e inclui estratégias para regularização fundiária, reassentamento de famílias em áreas de risco e ampliação da oferta de habitação social em ',
  17,
  '{"keywords":["zona","área","parcelamento"],"chunk_size":582,"has_qa":false}'::jsonb
);

-- Chunk 19
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.43529411764705883,0.6470588235294117,-0.22352941176470587,-0.5294117647058824,0.37254901960784315/* ... mais 1526 valores ... */,0.23921568627450984,0.1843137254901961,-0.45882352941176474,0.05882352941176472,0.41176470588235303]::float[]::vector(1536),
  '🟩 Resposta: A revisão chega em um momento crítico — e por isso é ainda mais importante. Ela foi profundamente reformulada para responder aos desafios da mudança climática e ao esgotamento do modelo de crescimento disperso. A proposta incorpora sistemas de dados e governança permanente, como o CIT e o SGC, que garantem que o plano seja dinâmico, atualizado e vinculado a metas reais. Não é uma resposta pontual, mas uma base para decisões mais eficazes daqui em diante.

🟨 Pergunta:

Como saber se o Plano Diretor está funcionando? Existem metas mensuráveis?',
  '🟩 Resposta: A revisão chega em um momento crítico — e por isso é ainda mais importante. Ela foi profundamente reformulada para responder aos desafios da mudança climática e ao esgotamento do modelo d',
  18,
  '{"keywords":[],"chunk_size":561,"has_qa":false}'::jsonb
);

-- Chunk 20
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.6862745098039216,0.8274509803921568,0.7647058823529411,-0.3176470588235294,-0.803921568627451/* ... mais 1526 valores ... */,0.4980392156862745,-0.14509803921568631,0.6235294117647059,0.4039215686274509,0.3568627450980393]::float[]::vector(1536),
  '🟩 Resposta: Sim. O novo plano cria o Centro de Inteligência Territorial (CIT), que vai monitorar os dados do território em tempo real. Ele acompanha indicadores urbanos, avalia o impacto das políticas e orienta revisões futuras com base em evidências. Cada indicador será publicado com série histórica, metodologia e base geográfica, garantindo transparência e controle público. Isso marca uma ruptura com modelos anteriores de planejamento sem monitoramento efetivo.

🟨 Pergunta:

O que muda no novo plano diretor de porto alegre?

🟩 Resposta: O novo Plano Diretor de Porto Alegre propõe uma série de mudanças estruturais e estratégicas em relação ao plano vigente. A seguir, destaco os principais pontos de mudança:

🧭 1. Organização do Plano:

Criação de Sistemas Territoriais (Urbano, Ecológico, Socioeconômico e de Gestão) para integrar políticas setoriais e qualificar a aplicação das normas urbanísticas.',
  '🟩 Resposta: Sim. O novo plano cria o Centro de Inteligência Territorial (CIT), que vai monitorar os dados do território em tempo real. Ele acompanha indicadores urbanos, avalia o impacto das política',
  19,
  '{"keywords":["setor"],"chunk_size":915,"has_qa":false}'::jsonb
);


-- Verificar chunks inseridos
SELECT COUNT(*) as chunks_inserted FROM document_embeddings 
WHERE document_id = '30014c0a-3b55-42a2-a22c-e8f4090d5591' AND chunk_index >= 10 AND chunk_index < 20;