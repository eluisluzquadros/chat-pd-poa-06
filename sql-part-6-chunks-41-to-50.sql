-- PARTE 6: Chunks 41 a 50
-- Document ID: 30014c0a-3b55-42a2-a22c-e8f4090d5591

-- Chunk 41
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.7490196078431373,-0.4666666666666667,-0.3647058823529412,-0.1215686274509804,0.7254901960784315/* ... mais 1526 valores ... */,0.7254901960784315,-0.14509803921568631,-0.403921568627451,-0.9294117647058824,-0.2705882352941177]::float[]::vector(1536),
  'Esse sistema orienta a ocupação do solo com base na capacidade instalada de atendimento à população, promovendo a integração entre moradia, transporte e serviços públicos. Também qualifica os territórios a partir da lógica da infraestrutura social e ambiental, priorizando o adensamento em áreas com boa oferta de equipamentos e redes, e induzindo investimentos onde há déficit. Com isso, o sistema busca garantir eficiência urbana, reduzir desigualdades territoriais e aumentar a resiliência da cidade frente a eventos climáticos extremos.

DO CONTEÚDO - Sistema  Socioeconômico

🟨 Pergunta:O que é o Sistema Socioeconômico?

🟩 Resposta:  O Sistema Socioeconômico é um dos quatro sistemas estruturantes do território no novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre. Ele organiza as atividades econômicas, sociais e produtivas da cidade, articulando o uso do solo à geração de empregos, à oferta de serviços, ao comércio, à inovação e às dinâmicas culturais e comunitárias.',
  'Esse sistema orienta a ocupação do solo com base na capacidade instalada de atendimento à população, promovendo a integração entre moradia, transporte e serviços públicos. Também qualifica os territór',
  40,
  '{"keywords":["área","ocupação","uso do solo"],"chunk_size":991,"has_qa":false}'::jsonb
);

-- Chunk 42
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.3803921568627451,0.7098039215686274,-0.4117647058823529,0.027450980392156765,-0.3647058823529412/* ... mais 1526 valores ... */,-0.4666666666666667,0.1843137254901961,-0.5686274509803921,0.8117647058823529,0.8901960784313725]::float[]::vector(1536),
  'Esse sistema se articula diretamente com as Áreas Estruturadoras do PDUS, que são porções do território com alto potencial de transformação urbana e relevância estratégica para o desenvolvimento sustentável da cidade. Ao integrar as diretrizes do Sistema Socioeconômico a essas áreas — como o Centro Histórico, o 4º Distrito, os eixos de transporte coletivo e os corredores de centralidades — o plano orienta a aplicação de incentivos urbanísticos e o direcionamento de investimentos públicos, promovendo adensamento qualificado, aproveitamento da infraestrutura existente e integração entre moradia e emprego.',
  'Esse sistema se articula diretamente com as Áreas Estruturadoras do PDUS, que são porções do território com alto potencial de transformação urbana e relevância estratégica para o desenvolvimento suste',
  41,
  '{"keywords":["área","urbanístico","aproveitamento"],"chunk_size":610,"has_qa":false}'::jsonb
);

-- Chunk 43
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.9607843137254902,-0.8980392156862745,0.8196078431372549,-0.39607843137254906,0.3254901960784313/* ... mais 1526 valores ... */,-0.5058823529411764,-0.13725490196078427,0.0980392156862746,-0.3019607843137255,-0.5215686274509803]::float[]::vector(1536),
  'O sistema também contempla as Áreas de Requalificação Urbana (ARU) como territórios prioritários, por combinarem déficit urbano com localização estratégica próxima a centralidades e áreas de emprego. Com isso, o Sistema Socioeconômico apoia decisões estruturantes de desenvolvimento econômico e territorial, ampliando oportunidades e promovendo uma ocupação urbana mais equilibrada, inclusiva e eficiente.

DO CONTEÚDO - Sistema de Gestão

🟨 Pergunta:

Qual o papel do CMDUA no PDUS?

🟩 Resposta: O CMDUA – Conselho Municipal de Desenvolvimento Urbano e Ambiental tem um papel central no novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre como instância de gestão democrática da política urbana. Ele atua na formulação, acompanhamento, fiscalização e avaliação da implementação do plano, contribuindo para assegurar a efetividade das diretrizes e instrumentos definidos.',
  'O sistema também contempla as Áreas de Requalificação Urbana (ARU) como territórios prioritários, por combinarem déficit urbano com localização estratégica próxima a centralidades e áreas de emprego. ',
  42,
  '{"keywords":["área","ocupação"],"chunk_size":882,"has_qa":false}'::jsonb
);

-- Chunk 44
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.6941176470588235,0.1215686274509804,-0.06666666666666665,0.6235294117647059,0.4039215686274509/* ... mais 1526 valores ... */,0.9607843137254901,-0.15294117647058825,0.803921568627451,-0.5294117647058824,0.8117647058823529]::float[]::vector(1536),
  'O CMDUA será responsável por deliberar sobre temas estratégicos, como a aplicação de instrumentos urbanísticos, a definição de áreas prioritárias, a aprovação de planos locais e planos de pormenor, e a análise de propostas de alteração da legislação urbanística. Também participa do processo de monitoramento permanente do plano, contribuindo com a leitura técnica e social do território, a partir da representação da sociedade civil e do poder público.

Com isso, o CMDUA consolida-se como espaço de participação institucionalizada e qualificada, essencial para garantir a transparência, o controle social e a continuidade da política urbana estabelecida pelo PDUS.

🟨 Pergunta:

O que é o Sistema de Gestão, Controle, Planejamento e Financiamento Urbano (SGC)?',
  'O CMDUA será responsável por deliberar sobre temas estratégicos, como a aplicação de instrumentos urbanísticos, a definição de áreas prioritárias, a aprovação de planos locais e planos de pormenor, e ',
  43,
  '{"keywords":["área","urbanístico"],"chunk_size":763,"has_qa":false}'::jsonb
);

-- Chunk 45
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.8745098039215686,-0.8666666666666667,0.19999999999999996,-0.12941176470588234,-0.6705882352941177/* ... mais 1526 valores ... */,-0.6784313725490196,0.2784313725490195,0.9843137254901961,-0.19215686274509802,0.7019607843137254]::float[]::vector(1536),
  '🟩 Resposta: O Sistema de Gestão, Controle, Planejamento e Financiamento Urbano (SGC) é o núcleo institucional responsável por garantir a implementação efetiva do Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre. Ele articula, coordena e monitora o conjunto de ações necessárias para transformar as diretrizes do plano em resultados concretos no território.

Entre suas funções estratégicas estão: a coordenação integrada da política urbana, a atualização periódica do PDUS, da LUOS e dos planos urbanísticos, e a execução de planos locais, planos de pormenor e projetos urbanos prioritários, com foco especial nas Áreas Estruturadoras e nas intervenções de requalificação urbana. O sistema também atua na aplicação dos instrumentos de desenvolvimento urbano previstos no plano, como outorga onerosa, operações urbanas consorciadas, reparcelamento, regularização fundiária e transferência do direito de construir.',
  '🟩 Resposta: O Sistema de Gestão, Controle, Planejamento e Financiamento Urbano (SGC) é o núcleo institucional responsável por garantir a implementação efetiva do Plano Diretor Urbano Sustentável (PDU',
  44,
  '{"keywords":["área","urbanístico","parcelamento"],"chunk_size":920,"has_qa":false}'::jsonb
);

-- Chunk 46
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.615686274509804,-0.4666666666666667,-0.19999999999999996,-0.23921568627450984,-0.6627450980392157/* ... mais 1526 valores ... */,0.6000000000000001,-0.08235294117647063,0.06666666666666665,-0.6862745098039216,0.3176470588235294]::float[]::vector(1536),
  'Além disso, o SGC realiza o monitoramento contínuo do território, com base em indicadores de desempenho urbano, subsidiando decisões técnicas, revisões normativas e a alocação de recursos. Ele é o elo entre planejamento, gestão, financiamento e participação social, apoiando a implementação de projetos urbanos integrados e sustentáveis, com foco na qualificação do espaço público, na eficiência territorial e na promoção do desenvolvimento equilibrado da cidade.

DO CONTEÚDO - Zona Rural

🟨 Pergunta:

O Plano diretor contempla ou aborda a Zona Rural?

🟩 Resposta: O novo Plano Diretor de Porto Alegre não realiza a revisão da zona rural, mantendo os limites estabelecidos pela legislação vigente. No entanto, a proposta reconhece a importância estratégica da zona rural e prevê que sua revisão será objeto de estudo específico, a ser elaborado posteriormente, com base nos critérios definidos pela Lei Complementar nº 775/2015.',
  'Além disso, o SGC realiza o monitoramento contínuo do território, com base em indicadores de desempenho urbano, subsidiando decisões técnicas, revisões normativas e a alocação de recursos. Ele é o elo',
  45,
  '{"keywords":["zona"],"chunk_size":932,"has_qa":false}'::jsonb
);

-- Chunk 47
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.7725490196078431,-0.5529411764705883,0.050980392156862786,0.019607843137254832,-0.5450980392156863/* ... mais 1526 valores ... */,-0.44313725490196076,0.4039215686274509,-0.16078431372549018,0.027450980392156765,-0.23921568627450984]::float[]::vector(1536),
  'Além disso, o plano estabelece que a ZOT 16, incluída no zoneamento da nova LUOS, poderá ser avaliada como área de possível expansão da zona rural, desde que fundamentada por análise técnica e submetida a processo de alteração legislativa adequado. Com isso, o plano mantém a zona rural sob regime próprio, mas abre caminho para ajustes futuros alinhados ao planejamento territorial integrado.

DO CONTEÚDO - Programas do Centro e do 4º Distrito

🟨 Pergunta:Os programas do Centro e do 4º Distrito foram contemplados?

🟩 Resposta:  Sim. O novo Plano Diretor contempla os programas em andamento para o Centro Histórico e o 4º Distrito, integrando-os ao modelo territorial e às estratégias de requalificação urbana da cidade.',
  'Além disso, o plano estabelece que a ZOT 16, incluída no zoneamento da nova LUOS, poderá ser avaliada como área de possível expansão da zona rural, desde que fundamentada por análise técnica e submeti',
  46,
  '{"keywords":["zona","zot","área"],"chunk_size":725,"has_qa":false}'::jsonb
);

-- Chunk 48
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.45882352941176474,-0.7098039215686274,-0.6235294117647059,-0.6392156862745098,-0.0980392156862745/* ... mais 1526 valores ... */,-0.2784313725490196,0.5921568627450979,-0.0980392156862745,0.3803921568627451,-0.592156862745098]::float[]::vector(1536),
  'Essas áreas estão inseridas em Zonas de Ordenamento Territorial (ZOTs) com alto potencial de transformação e estão vinculadas às Áreas de Requalificação Urbana (ARU), o que lhes confere prioridade para ações coordenadas de requalificação, adensamento e diversificação de usos. No caso do Centro, trata-se de consolidar sua função como centralidade metropolitana, promovendo a habitação, o uso misto e a qualificação dos espaços públicos. Já o 4º Distrito é reconhecido como território estratégico para o desenvolvimento econômico, inovação e revitalização urbana.

Além disso, o plano prevê a possibilidade de elaboração de Planos de Pormenor para essas áreas, permitindo a articulação entre os projetos existentes — como o Programa Centro+, o Programa de Reabilitação do 4º Distrito e os projetos financiados por organismos internacionais — e os novos instrumentos e diretrizes do PDUS. Isso garante continuidade institucional e base normativa para sua implementação integrada.',
  'Essas áreas estão inseridas em Zonas de Ordenamento Territorial (ZOTs) com alto potencial de transformação e estão vinculadas às Áreas de Requalificação Urbana (ARU), o que lhes confere prioridade par',
  47,
  '{"keywords":["zona","zot","área"],"chunk_size":978,"has_qa":false}'::jsonb
);

-- Chunk 49
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.7960784313725491,-0.4509803921568627,0.6235294117647059,0.6470588235294117,-0.7568627450980392/* ... mais 1526 valores ... */,0.9372549019607843,0.615686274509804,-0.788235294117647,0.968627450980392,-0.5529411764705883]::float[]::vector(1536),
  'DO CONTEÚDO - Instrumentos

🟨 Pergunta:Vai ter cobrança de outorga onerosa?

🟩 Resposta:  Sim, a proposta da revisão do Plano Diretor Urbano Sustentável de Porto Alegre prevê a possibilidade de cobrança de outorga onerosa do direito de construir.

A outorga onerosa é um instrumento previsto pelo Estatuto da Cidade (Lei Federal nº 10.257/2001), que permite ao município cobrar do proprietário ou empreendedor uma contrapartida financeira quando deseja construir acima do coeficiente de aproveitamento básico definido para a sua área, dentro dos limites estabelecidos pela legislação municipal.',
  'DO CONTEÚDO - Instrumentos

🟨 Pergunta:Vai ter cobrança de outorga onerosa?

🟩 Resposta:  Sim, a proposta da revisão do Plano Diretor Urbano Sustentável de Porto Alegre prevê a possibilidade de cobr',
  48,
  '{"keywords":["área","aproveitamento"],"chunk_size":596,"has_qa":false}'::jsonb
);

-- Chunk 50
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.04313725490196085,0.4274509803921569,0.5450980392156863,-0.39607843137254906,0.6235294117647059/* ... mais 1526 valores ... */,-0.4901960784313726,0.7333333333333334,0.46666666666666656,0.968627450980392,-0.0980392156862745]::float[]::vector(1536),
  'O texto preliminar do Plano Diretor destaca, entre seus princípios e diretrizes, a recuperação dos investimentos públicos que tenham resultado na valorização de imóveis urbanos e a distribuição equitativa dos benefícios e ônus decorrentes do processo de urbanização. Esses são fundamentos para aplicação de instrumentos como a outorga onerosa do direito de construir, como parte das formas de financiamento do desenvolvimento urbano sustentável e para promover justiça urbana.

Os detalhes sobre o cálculo, a aplicação e as exceções da outorga onerosa serão definidos na regulamentação específica, que normalmente é detalhada na Lei de Uso e Ocupação do Solo (LUOS) e em decretos posteriores.

Portanto:Sim, a proposta prevê o uso da outorga onerosa como instrumento para o financiamento urbano e distribuição de benefícios e ônus do desenvolvimento, conforme diretrizes do Plano Diretor Urbano Sustentável de Porto Alegre.',
  'O texto preliminar do Plano Diretor destaca, entre seus princípios e diretrizes, a recuperação dos investimentos públicos que tenham resultado na valorização de imóveis urbanos e a distribuição equita',
  49,
  '{"keywords":["ocupação"],"chunk_size":923,"has_qa":false}'::jsonb
);


-- Verificar chunks inseridos
SELECT COUNT(*) as chunks_inserted FROM document_embeddings 
WHERE document_id = '30014c0a-3b55-42a2-a22c-e8f4090d5591' AND chunk_index >= 40 AND chunk_index < 50;