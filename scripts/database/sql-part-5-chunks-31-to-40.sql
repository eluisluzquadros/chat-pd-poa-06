-- PARTE 5: Chunks 31 a 40
-- Document ID: 30014c0a-3b55-42a2-a22c-e8f4090d5591

-- Chunk 31
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.33333333333333326,-0.4666666666666667,0.4901960784313726,0.3254901960784313,0.5372549019607844/* ... mais 1526 valores ... */,0.5372549019607844,0.0117647058823529,-0.9058823529411765,-0.7411764705882353,0.2549019607843137]::float[]::vector(1536),
  '🟩 Resposta:  Sim, o novo Plano Diretor contempla as ZEIS por meio de uma abordagem atualizada e mais propositiva. Entretanto, o novo plano adota o conceito de AEIS - Área de Especial Interesse Social integrando ao conjunto das Áreas de Requalificação Urbana (ARU). As AEIS previstas no plano anterior (PDDUA) são automaticamente incorporadas ao novo PDUS, mas agora inseridas em um contexto mais amplo, que busca não apenas reconhecer essas áreas, mas atuar ativamente na sua qualificação urbana.

Essa integração amplia o papel tradicional das ZEIS, indo além da simples demarcação para fins de regularização. No PDUS, as AEIS nas ARUs são tratadas como territórios prioritários para políticas públicas que promovam acesso à cidade, inclusão territorial, infraestrutura, regularização fundiária, produção habitacional e melhoria da qualidade de vida, articulando a política habitacional com os instrumentos de planejamento e ordenamento do solo urbano.',
  '🟩 Resposta:  Sim, o novo Plano Diretor contempla as ZEIS por meio de uma abordagem atualizada e mais propositiva. Entretanto, o novo plano adota o conceito de AEIS - Área de Especial Interesse Social',
  30,
  '{"keywords":["área"],"chunk_size":954,"has_qa":false}'::jsonb
);

-- Chunk 32
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.43529411764705883,-0.9450980392156862,-0.37254901960784315,0.4509803921568627,-0.1215686274509804/* ... mais 1526 valores ... */,-0.7490196078431373,-0.592156862745098,-0.5215686274509803,0.3803921568627451,0.6549019607843136]::float[]::vector(1536),
  '🟨 Pergunta:Como o novo Plano Diretor trata a regularização fundiária?

🟩 Resposta:  O plano:

Define procedimentos específicos de licenciamento e regularização de edificações e assentamentos consolidados;

Cria Áreas de Requalificação Urbana, com prioridade de investimento em infraestrutura, serviços e habitação;

Estabelece políticas contínuas de regularização fundiária integrada, com foco na permanência das famílias, salvo em áreas de risco ou em casos de requalificação necessária;

Cria incentivos específicos para parcelamento e uso do solo voltados à regularização.

DO CONTEÚDO - Sistema Ecológico

🟨 Pergunta: O que o plano prevê sobre a política ambiental do município?

🟩 Resposta:  

🌱 1. Sistema Ecológico

O plano cria o Sistema Ecológico como uma nova estrutura de ordenamento ambiental. Ele organiza os ativos ambientais do território municipal, integrando:

	• Áreas de Preservação Permanente (APPs)

	• Unidades de Conservação

	• Áreas Verdes Públicas

	• Áreas de Risco',
  '🟨 Pergunta:Como o novo Plano Diretor trata a regularização fundiária?

🟩 Resposta:  O plano:

Define procedimentos específicos de licenciamento e regularização de edificações e assentamentos consoli',
  31,
  '{"keywords":["área","parcelamento","uso do solo"],"chunk_size":997,"has_qa":false}'::jsonb
);

-- Chunk 33
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.5607843137254902,0.7960784313725491,-0.07450980392156858,-0.7098039215686274,-0.03529411764705881/* ... mais 1526 valores ... */,-0.8901960784313725,0.3647058823529412,0.12941176470588234,-0.6,0.21568627450980382]::float[]::vector(1536),
  '• Corredores de Biodiversidade (ecológicos e verdes)

Esse sistema é a base para orientar políticas de conservação, recuperação ambiental, drenagem urbana e adaptação às mudanças climáticas.

🌿 2. Corredores de Biodiversidade

Dentro do Sistema Ecológico, o plano define dois tipos de corredores:

• Corredores Ecológicos: conectam áreas ambientalmente protegidas (ex: matas ciliares, morros).

	• Corredores Verdes: fazem a transição entre áreas densamente urbanizadas e as ecológicas, ajudando na absorção de água, na ventilação e na conectividade ambiental.

Eles ajudam a formar uma malha contínua de preservação e adaptação urbana.

💧 3. Permeabilidade e infraestrutura verde

O plano institui índices de permeabilidade obrigatórios, ampliando de 32% para até 45% a exigência de solo permeável em determinadas áreas, considerando o novo modelo de ocupação. Além disso, articula a drenagem urbana como parte dos sistemas estruturantes da cidade.

🏗️ 4. Certificação de Edificação Sustentável',
  '• Corredores de Biodiversidade (ecológicos e verdes)

Esse sistema é a base para orientar políticas de conservação, recuperação ambiental, drenagem urbana e adaptação às mudanças climáticas.

🌿 2. Co',
  32,
  '{"keywords":["área","edificação","ocupação"],"chunk_size":998,"has_qa":false}'::jsonb
);

-- Chunk 34
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.9215686274509804,0.4039215686274509,0.03529411764705892,-0.6313725490196078,0.5921568627450979/* ... mais 1526 valores ... */,-0.6705882352941177,0.44313725490196076,0.15294117647058814,0.06666666666666665,-0.24705882352941178]::float[]::vector(1536),
  'O plano fortalece esse instrumento já existente, criando incentivos para edificações verdes e resilientes — com uso racional de energia e água, melhor conforto térmico, e maior integração com o ambiente urbano.

📊 5. Integração com planejamento territorial

A política ambiental não é tratada como algo apartado. Ela se integra ao zoneamento, aos planos locais e de pormenor, e ao Sistema de Inteligência Territorial (CIT), permitindo que o monitoramento e a aplicação dos instrumentos urbanísticos respeitem os limites ambientais do território.

🟨 Pergunta:O que é o Sistema Ecológico?',
  'O plano fortalece esse instrumento já existente, criando incentivos para edificações verdes e resilientes — com uso racional de energia e água, melhor conforto térmico, e maior integração com o ambien',
  33,
  '{"keywords":["urbanístico"],"chunk_size":588,"has_qa":false}'::jsonb
);

-- Chunk 35
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.5764705882352941,0.23921568627450984,0.5607843137254902,0.584313725490196,0.8117647058823529/* ... mais 1526 valores ... */,-0.019607843137254943,0.3176470588235294,0.7568627450980392,-0.1686274509803921,-0.26274509803921564]::float[]::vector(1536),
  '🟩 Resposta:  O Sistema Ecológico é um dos quatro sistemas estruturantes do território definidos pelo novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre. Ele organiza e integra os elementos ambientais da cidade — como áreas de preservação permanente (APPs), morros, matas, banhados, arroios, várzeas e áreas permeáveis — com o objetivo de proteger os recursos naturais, conter riscos e fortalecer a resiliência urbana frente às mudanças climáticas.',
  '🟩 Resposta:  O Sistema Ecológico é um dos quatro sistemas estruturantes do território definidos pelo novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre. Ele organiza e integra os elementos ',
  34,
  '{"keywords":["área"],"chunk_size":458,"has_qa":false}'::jsonb
);

-- Chunk 36
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.7411764705882353,0.23921568627450984,-0.8431372549019608,-0.21568627450980393,-0.803921568627451/* ... mais 1526 valores ... */,-0.0117647058823529,-0.9058823529411765,-0.13725490196078427,-0.10588235294117643,0.3176470588235294]::float[]::vector(1536),
  'Esse sistema trata o meio ambiente como infraestrutura urbana essencial, e não apenas como área de restrição. Ele orienta o ordenamento territorial e a ocupação do solo, articulando a preservação ambiental com a qualidade de vida urbana, a partir de diretrizes que incentivam a renaturalização de cursos d’água, a recuperação de áreas degradadas, a ampliação da permeabilidade e a criação de corredores ecológicos. Ao estruturar o território com base nos seus atributos ambientais, o Sistema Ecológico contribui para um modelo de cidade mais sustentável, segura e adaptada às condições climáticas extremas.

DO CONTEÚDO - Enchente

🟨 Pergunta:O Plano Diretor considerou as enchentes de 2024?',
  'Esse sistema trata o meio ambiente como infraestrutura urbana essencial, e não apenas como área de restrição. Ele orienta o ordenamento territorial e a ocupação do solo, articulando a preservação ambi',
  35,
  '{"keywords":["área","ocupação"],"chunk_size":692,"has_qa":false}'::jsonb
);

-- Chunk 37
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.207843137254902,-0.9450980392156862,-0.803921568627451,0.2313725490196079,-0.34901960784313724/* ... mais 1526 valores ... */,0.7568627450980392,-0.8117647058823529,0.6313725490196078,-1,-0.5372549019607843]::float[]::vector(1536),
  '🟩 Resposta:  Sim. O novo Plano Diretor Urbano Sustentável (PDUS) incorpora as enchentes de 2024 como elemento central de sua estratégia de adaptação climática e gestão de riscos. O evento reforçou a urgência de reestruturar a relação da cidade com seus sistemas naturais, especialmente os arroios e áreas de várzea, motivando a adoção de medidas mais rígidas de prevenção e resiliência.

Entre as principais ações previstas estão: a criação do Sistema Ecológico, que valoriza áreas de preservação e corredores de biodiversidade; a exigência de cotas mínimas de proteção contra cheias para novas edificações e obras públicas; a ampliação da permeabilidade urbana; e a priorização de soluções baseadas na natureza para drenagem e contenção de riscos. Essas diretrizes consolidam uma mudança de paradigma no planejamento urbano, colocando a gestão ambiental e climática como parte integrante da estrutura territorial da cidade.

DO CONTEÚDO - Sistema de Espaços Abertos',
  '🟩 Resposta:  Sim. O novo Plano Diretor Urbano Sustentável (PDUS) incorpora as enchentes de 2024 como elemento central de sua estratégia de adaptação climática e gestão de riscos. O evento reforçou a ',
  36,
  '{"keywords":["área"],"chunk_size":967,"has_qa":false}'::jsonb
);

-- Chunk 38
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.9450980392156862,0.6235294117647059,-0.050980392156862786,-0.4509803921568627,-0.19999999999999996/* ... mais 1526 valores ... */,-0.8745098039215686,0.03529411764705892,-0.5215686274509803,0.7960784313725491,-0.26274509803921564]::float[]::vector(1536),
  '🟨 Pergunta:O que é o Sistema de Espaços Abertos?

🟩 Resposta:  O Sistema de Espaços Abertos é um dos quatro sistemas estruturantes do território no novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre. Ele organiza os espaços públicos não edificados — como praças, parques, largos, calçadas amplas, áreas verdes e espaços de lazer — reconhecendo-os como infraestrutura urbana essencial para a convivência, a mobilidade ativa, o bem-estar e a identidade da cidade. Esses espaços são aquilo que o cidadão percebe como o rosto público da cidade, essenciais para a vida urbana cotidiana.',
  '🟨 Pergunta:O que é o Sistema de Espaços Abertos?

🟩 Resposta:  O Sistema de Espaços Abertos é um dos quatro sistemas estruturantes do território no novo Plano Diretor Urbano Sustentável (PDUS) de Po',
  37,
  '{"keywords":["área"],"chunk_size":593,"has_qa":false}'::jsonb
);

-- Chunk 39
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[1,0.15294117647058814,0.09019607843137245,0.43529411764705883,-0.9058823529411765/* ... mais 1526 valores ... */,-0.08235294117647063,0.5058823529411764,0.7490196078431373,0.6862745098039216,-0.7803921568627451]::float[]::vector(1536),
  'O sistema busca promover continuidade, acessibilidade e integração entre os espaços públicos, articulando-os à paisagem, à estrutura ecológica e aos equipamentos urbanos. Também valoriza as Áreas de Interesse Cultural (AIC), que incluem territórios com relevância simbólica, histórica e social — entre eles, espaços vinculados a povos tradicionais, cuja relação com o entorno urbano deve ser qualificada e respeitada. Dessa forma, o Sistema de Espaços Abertos fortalece os vínculos entre espaço público, memória e pertencimento.

DO CONTEÚDO - Sistema de Estrutura e Infraestrutura

🟨 Pergunta:O que é o Sistema de Estrutura e Infraestrutura?',
  'O sistema busca promover continuidade, acessibilidade e integração entre os espaços públicos, articulando-os à paisagem, à estrutura ecológica e aos equipamentos urbanos. Também valoriza as Áreas de I',
  38,
  '{"keywords":["área"],"chunk_size":643,"has_qa":false}'::jsonb
);

-- Chunk 40
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.9529411764705882,-0.43529411764705883,-0.21568627450980393,-0.5764705882352941,0.8196078431372549/* ... mais 1526 valores ... */,0.8745098039215686,-0.3411764705882353,0.8431372549019607,-0.2784313725490196,0.4274509803921569]::float[]::vector(1536),
  '🟩 Resposta:  O Sistema de Estrutura e Infraestrutura é um dos quatro sistemas estruturantes do território no novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre. Ele organiza os elementos físicos que estruturam o funcionamento da cidade e sustentam seu desenvolvimento, incluindo a mobilidade urbana, os equipamentos urbanos e comunitários (como escolas, postos de saúde, centros culturais), as redes de infraestrutura técnica (abastecimento, saneamento, energia, comunicação) e os sistemas de proteção contra cheias e drenagem.',
  '🟩 Resposta:  O Sistema de Estrutura e Infraestrutura é um dos quatro sistemas estruturantes do território no novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre. Ele organiza os elementos fí',
  39,
  '{"keywords":[],"chunk_size":538,"has_qa":false}'::jsonb
);


-- Verificar chunks inseridos
SELECT COUNT(*) as chunks_inserted FROM document_embeddings 
WHERE document_id = '30014c0a-3b55-42a2-a22c-e8f4090d5591' AND chunk_index >= 30 AND chunk_index < 40;