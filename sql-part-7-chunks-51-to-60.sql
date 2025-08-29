-- PARTE 7: Chunks 51 a 60
-- Document ID: 30014c0a-3b55-42a2-a22c-e8f4090d5591

-- Chunk 51
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.7647058823529411,-0.8588235294117648,-0.4274509803921569,0.7333333333333334,0.9137254901960785/* ... mais 1526 valores ... */,-0.1686274509803921,0.9137254901960785,0.46666666666666656,0.12941176470588234,0.7882352941176471]::float[]::vector(1536),
  '🟨 Pergunta:Como ficam as contrapartidas dos Empreendimentos no Plano Diretor:

🟩 Resposta: As contrapartidas dos empreendimentos no novo Plano Diretor de Porto Alegre são regulamentadas por diversos instrumentos urbanísticos, com critérios claros e foco na qualificação do território. A Outorga Onerosa do Direito de Construir exige pagamento proporcional ao potencial construtivo adicional utilizado, com possibilidade de contrapartidas financeiras ou em obras, serviços e doação de áreas ou imóveis, vinculadas ao Fundo Municipal de Gestão do Território (FMGT) e ao Fundo Municipal de Habitação de Interesse Social (FMHIS).',
  '🟨 Pergunta:Como ficam as contrapartidas dos Empreendimentos no Plano Diretor:

🟩 Resposta: As contrapartidas dos empreendimentos no novo Plano Diretor de Porto Alegre são regulamentadas por diversos',
  50,
  '{"keywords":["área","urbanístico"],"chunk_size":627,"has_qa":false}'::jsonb
);

-- Chunk 52
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.09019607843137245,-0.7647058823529411,-0.1215686274509804,-0.050980392156862786,0.6627450980392158/* ... mais 1526 valores ... */,-0.3254901960784313,-0.19999999999999996,0.9764705882352942,-0.19999999999999996,0.388235294117647]::float[]::vector(1536),
  'No parcelamento do solo, é possível a conversão da obrigação de destinação de área pública, mediante transferência de terrenos urbanizados ou não, execução de obras ou pagamento pecuniário, conforme viabilidade e interesse público, com formalização por Termo de Conversão de Área Pública. Também há previsão de compensação por Transferência do Direito de Construir (TDC) quando exigências urbanísticas ultrapassarem os limites máximos estabelecidos para a ZOT.

As Operações Urbanas Consorciadas preveem contrapartidas específicas, como recursos financeiros, imóveis, execução de obras ou produção de habitação de interesse social, definidas por lei para cada operação. Já o Estudo de Impacto de Vizinhança (EIV) exige medidas mitigadoras e compensatórias proporcionais aos impactos diagnosticados, como condição para aprovação do empreendimento. Esses instrumentos asseguram que os benefícios gerados pelas transformações urbanas retornem em melhorias para a coletividade.',
  'No parcelamento do solo, é possível a conversão da obrigação de destinação de área pública, mediante transferência de terrenos urbanizados ou não, execução de obras ou pagamento pecuniário, conforme v',
  51,
  '{"keywords":["zot","área","parcelamento"],"chunk_size":973,"has_qa":false}'::jsonb
);

-- Chunk 53
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.6313725490196078,0.9294117647058824,0.3176470588235294,-0.21568627450980393,0.8196078431372549/* ... mais 1526 valores ... */,0.4980392156862745,-0.8980392156862745,-0.8431372549019608,-0.37254901960784315,0.7098039215686274]::float[]::vector(1536),
  '🟨 Pergunta:Moro no bairro…qual o risco da minha casa alagar?

🟩 Resposta: Considerando os impactos dos eventos climáticos extremos de 2024, propõe-se a seguinte divisão do território municipal para orientar políticas de adaptação:

1. Áreas Protegidas pelo Sistema Atual: Regiões já abrangidas pela infraestrutura existente de proteção contra inundações. A prioridade nestas áreas é a recuperação, manutenção e eventual modernização dos sistemas de proteção, garantindo sua resiliência frente ao aumento da frequência e intensidade dos eventos climáticos.

2. Áreas em Estudo: Territórios diretamente impactados pelas inundações e ainda não plenamente protegidos pelo sistema atual — como ilhas e orla sul. Nestas áreas, estão em andamento estudos e projetos para definição de novas soluções de adaptação, incorporando inovação, soluções baseadas na natureza e a participação das comunidades locais.',
  '🟨 Pergunta:Moro no bairro…qual o risco da minha casa alagar?

🟩 Resposta: Considerando os impactos dos eventos climáticos extremos de 2024, propõe-se a seguinte divisão do território municipal para ',
  52,
  '{"keywords":["bairro","área"],"chunk_size":901,"has_qa":false}'::jsonb
);

-- Chunk 54
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.027450980392156765,0.5137254901960784,0.7333333333333334,0.8274509803921568,0.3254901960784313/* ... mais 1526 valores ... */,-0.09019607843137256,-0.22352941176470587,0.06666666666666665,-0.0980392156862745,-0.08235294117647063]::float[]::vector(1536),
  '3. Áreas com Ocupação Urbana acima da Cota de Inundação de 2024: Bairros cuja urbanização se dá predominantemente acima da cota atingida pela inundação de 2024. Nessas áreas, a prioridade é a prevenção, o monitoramento permanente e a incorporação de estratégias de resiliência urbana, garantindo que futuros processos de urbanização e adensamento não ampliem o risco.

🟨 Pergunta:Neste plano inexiste a taxa de ocupação das edificações nos terrenos?

🟩 Resposta: Exatamente, sua percepção está correta! Na proposta de revisão da Lei de Uso e Ocupação do Solo (LUOS) de Porto Alegre, NÃO existe mais o parâmetro de "taxa de ocupação" para as edificações nos terrenos.

Como funciona na nova proposta?',
  '3. Áreas com Ocupação Urbana acima da Cota de Inundação de 2024: Bairros cuja urbanização se dá predominantemente acima da cota atingida pela inundação de 2024. Nessas áreas, a prioridade é a prevençã',
  53,
  '{"keywords":["bairro","área","ocupação"],"chunk_size":701,"has_qa":false}'::jsonb
);

-- Chunk 55
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.33333333333333337,-0.4901960784313726,0.11372549019607847,0.17647058823529416,-0.6392156862745098/* ... mais 1526 valores ... */,0.5607843137254902,0.05882352941176472,0.39607843137254894,0.15294117647058814,-0.6784313725490196]::float[]::vector(1536),
  'A taxa de ocupação, que limitava a porcentagem do terreno que podia ser coberta pela edificação, foi retirada dos parâmetros urbanísticos no novo modelo. Os principais parâmetros agora são: altura máxima, coeficiente de aproveitamento e taxa de permeabilidade do solo (esta última, sim, está prevista para garantir áreas livres e permeáveis, especialmente em terrenos maiores).

O controle sobre o adensamento e o volume construído se dá principalmente pelo coeficiente de aproveitamento e os recuos obrigatórios, variando conforme a ZOT (Zona de Ordenamento Territorial).

Por que essa mudança?

A exclusão da taxa de ocupação visa simplificar e modernizar a legislação urbanística, focando em parâmetros mais flexíveis e adaptados à realidade contemporânea das cidades, sem comprometer o controle urbanístico essencial. 

Essas diretrizes fazem parte da proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre.',
  'A taxa de ocupação, que limitava a porcentagem do terreno que podia ser coberta pela edificação, foi retirada dos parâmetros urbanísticos no novo modelo. Os principais parâmetros agora são: altura máx',
  54,
  '{"keywords":["altura","altura máxima","metros","zona","zot","área","urbanístico","edificação","ocupação","aproveitamento"],"chunk_size":925,"has_qa":false}'::jsonb
);

-- Chunk 56
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.2705882352941177,0.07450980392156858,-0.22352941176470587,0.04313725490196085,-0.9294117647058824/* ... mais 1526 valores ... */,-0.30980392156862746,-0.12941176470588234,-0.8745098039215686,-0.6313725490196078,0.0117647058823529]::float[]::vector(1536),
  'Se quiser saber os parâmetros urbanísticos exatos (altura, coeficiente de aproveitamento, taxa de permeabilidade) de algum bairro, basta informar o nome!

🟨 Pergunta:Que dia é a audiência pública?

🟩 Resposta: A audiência pública do Plano Diretor será realizada no dia 09 de agosto de 2025 (sábado), às 9h, no Auditório Araújo Vianna, localizado no Parque Farroupilha, nº 685.

Participe!

🟨 Pergunta:Qual a altura máxima da construção dos prédios em Porto Alegre?

🟩 Resposta: A altura máxima permitida para construção de prédios em Porto Alegre depende exclusivamente da Zona de Ordenamento Territorial (ZOT) em que está localizado o terreno. Não existe um único valor para toda a cidade; cada ZOT tem uma altura máxima específica, estabelecida na proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre.

Como funciona:

- Cada bairro pode ter mais de uma ZOT.

- Cada ZOT possui uma altura máxima definida na proposta.',
  'Se quiser saber os parâmetros urbanísticos exatos (altura, coeficiente de aproveitamento, taxa de permeabilidade) de algum bairro, basta informar o nome!

🟨 Pergunta:Que dia é a audiência pública?

�',
  55,
  '{"keywords":["altura","altura máxima","metros","zona","zot","bairro","urbanístico","construção","ocupação","aproveitamento"],"chunk_size":939,"has_qa":false}'::jsonb
);

-- Chunk 57
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.41960784313725485,-0.05882352941176472,-0.7647058823529411,0.8666666666666667,-0.8901960784313725/* ... mais 1526 valores ... */,0.3176470588235294,-0.9921568627450981,-0.13725490196078427,-0.17647058823529416,-0.43529411764705883]::float[]::vector(1536),
  'Para saber a altura máxima permitida em um local, é necessário primeiro identificar o bairro e depois consultar quais ZOTs existem nele. Só então é possível informar os valores.

Exemplo prático:

Se você informar o nome do bairro, posso listar todas as ZOTs presentes nele e informar a altura máxima proposta para cada uma delas.

Regras importantes:

Não há um valor único para toda Porto Alegre. A altura máxima é sempre definida por ZOT, não por endereço individual. A flexibilização de altura só é possível mediante Estudo de Impacto de Vizinhança (EIV), conforme previsto na proposta da LUOS.

Em caso de dúvidas ou ausência de ZOT correspondente, é necessário consultar a base oficial. Esses parâmetros fazem parte da proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre. 

Se quiser saber a altura máxima para um bairro específico, por favor, informe o nome do bairro. Assim, trago as informações completas e atualizadas para você!

🟨 Pergunta:Como será o EVU no novo Plano?',
  'Para saber a altura máxima permitida em um local, é necessário primeiro identificar o bairro e depois consultar quais ZOTs existem nele. Só então é possível informar os valores.

Exemplo prático:

Se ',
  56,
  '{"keywords":["altura","altura máxima","metros","zot","bairro","ocupação"],"chunk_size":999,"has_qa":false}'::jsonb
);

-- Chunk 58
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.2705882352941176,0.46666666666666656,-0.7490196078431373,-0.1843137254901961,0.780392156862745/* ... mais 1526 valores ... */,0.15294117647058814,-0.050980392156862786,-0.8666666666666667,-0.8117647058823529,-0.5764705882352941]::float[]::vector(1536),
  '🟩 Resposta: O novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre não prevê o Estudo de Viabilidade Urbanística (EVU) como instrumento, mas sim o Estudo de Impacto de Vizinhança (EIV), que passa a ser o principal mecanismo para avaliação prévia dos impactos urbanos dos empreendimentos.

O que é o EIV no novo Plano Diretor?

O Estudo de Impacto de Vizinhança (EIV) é um instrumento previsto no Estatuto da Cidade e está detalhadamente regulamentado na proposta de revisão do Plano Diretor e da Lei de Uso e Ocupação do Solo de Porto Alegre. O EIV deve ser apresentado para o licenciamento de empreendimentos e atividades que, pelo seu porte ou natureza, possam gerar impactos relevantes na vizinhança, como alterações no trânsito, na paisagem, na oferta de serviços urbanos, no meio ambiente e na dinâmica social.

Principais pontos sobre o EIV no novo Plano:',
  '🟩 Resposta: O novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre não prevê o Estudo de Viabilidade Urbanística (EVU) como instrumento, mas sim o Estudo de Impacto de Vizinhança (EIV), que p',
  57,
  '{"keywords":["ocupação"],"chunk_size":870,"has_qa":false}'::jsonb
);

-- Chunk 59
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.12941176470588234,-0.0980392156862745,0.6549019607843136,-0.4901960784313726,-0.33333333333333337/* ... mais 1526 valores ... */,0.5058823529411764,-0.5686274509803921,0.2078431372549019,-0.7411764705882353,-0.6862745098039216]::float[]::vector(1536),
  'Obrigatoriedade: O EIV será exigido para empreendimentos definidos em regulamento próprio, conforme critérios de porte, localização e impacto potencial.

Conteúdo mínimo: O EIV deverá conter, entre outros aspectos, análise dos impactos sobre o trânsito, infraestrutura urbana, meio ambiente, valorização imobiliária, oferta de equipamentos públicos, patrimônio cultural e paisagem urbana.

Participação social: O processo de avaliação do EIV prevê transparência e participação da comunidade, podendo incluir audiências públicas e consulta a conselhos municipais.

Mitigação de impactos: O EIV não serve apenas para apontar impactos, mas também para propor medidas de mitigação, compensação ou adequação do projeto ao contexto urbano.

Integração com outros instrumentos: O EIV deve estar articulado com o zoneamento urbano, diretrizes ambientais e políticas setoriais do município.

Diferença em relação ao EVU:',
  'Obrigatoriedade: O EIV será exigido para empreendimentos definidos em regulamento próprio, conforme critérios de porte, localização e impacto potencial.

Conteúdo mínimo: O EIV deverá conter, entre ou',
  58,
  '{"keywords":["setor"],"chunk_size":911,"has_qa":false}'::jsonb
);

-- Chunk 60
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.17647058823529416,0.24705882352941178,0.2784313725490195,0.5372549019607844,-0.0980392156862745/* ... mais 1526 valores ... */,0.5294117647058822,-0.3176470588235294,-0.48235294117647054,0.9215686274509804,0.09019607843137245]::float[]::vector(1536),
  'Enquanto o EVU tinha foco em viabilidade urbanística (parâmetros construtivos, uso do solo etc.), o EIV aprofunda a análise nos impactos que o empreendimento pode causar à vizinhança e à cidade, promovendo uma avaliação mais ampla e transparente, com participação da sociedade e foco em soluções para conflitos urbanos.

Essas diretrizes fazem parte da proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre.

🟨 Pergunta:

 Qual a diferença entre taxa de ocupação e taxa de permeabilidade?

🟩 Resposta:  A proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre não utiliza mais a taxa de ocupação como parâmetro urbanístico.',
  'Enquanto o EVU tinha foco em viabilidade urbanística (parâmetros construtivos, uso do solo etc.), o EIV aprofunda a análise nos impactos que o empreendimento pode causar à vizinhança e à cidade, promo',
  59,
  '{"keywords":["metros","urbanístico","ocupação","uso do solo"],"chunk_size":654,"has_qa":false}'::jsonb
);


-- Verificar chunks inseridos
SELECT COUNT(*) as chunks_inserted FROM document_embeddings 
WHERE document_id = '30014c0a-3b55-42a2-a22c-e8f4090d5591' AND chunk_index >= 50 AND chunk_index < 60;