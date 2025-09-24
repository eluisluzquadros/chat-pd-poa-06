-- PARTE 8: Chunks 61 a 68
-- Document ID: 30014c0a-3b55-42a2-a22c-e8f4090d5591

-- Chunk 61
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.3803921568627451,0.3647058823529412,0.07450980392156858,0.6470588235294117,-0.9529411764705882/* ... mais 1526 valores ... */,-0.07450980392156858,0.9450980392156862,-0.4980392156862745,0.6627450980392158,-0.5215686274509803]::float[]::vector(1536),
  'Na nova proposta, o foco dos parâmetros urbanísticos está na altura máxima, coeficiente de aproveitamento (ou seja, quanto pode ser construído em relação à área do terreno), e taxa de permeabilidade (solo livre e áreas verdes). A taxa de ocupação, tradicionalmente usada para limitar o quanto do terreno pode ser coberto por edificações no térreo, foi retirada dos novos regramentos.

Resumo:

Taxa de ocupação: Não é mais utilizada na proposta revisada.

Taxa de permeabilidade: Continua como parâmetro obrigatório, determinando o mínimo de solo livre para infiltração de água. Outros parâmetros de controle: altura máxima, coeficiente de aproveitamento e, em alguns casos, área mínima de terreno.

Por quê?

A retirada da taxa de ocupação visa dar mais flexibilidade para a implantação dos projetos, incentivando formas construtivas mais adequadas à cidade compacta, sustentabilidade e soluções inovadoras, desde que respeitada a permeabilidade, altura e coeficiente estabelecidos para cada ZOT.',
  'Na nova proposta, o foco dos parâmetros urbanísticos está na altura máxima, coeficiente de aproveitamento (ou seja, quanto pode ser construído em relação à área do terreno), e taxa de permeabilidade (',
  60,
  '{"keywords":["altura","altura máxima","metros","zot","área","urbanístico","ocupação","aproveitamento"],"chunk_size":997,"has_qa":false}'::jsonb
);

-- Chunk 62
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.7568627450980392,0.5921568627450979,0.06666666666666665,0.5450980392156863,-0.8274509803921568/* ... mais 1526 valores ... */,-0.2549019607843137,-0.45882352941176474,0.8196078431372549,-0.7098039215686274,0.41176470588235303]::float[]::vector(1536),
  'Esses parâmetros fazem parte da proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre.

Se precisar de explicação sobre outro parâmetro ou quiser saber os valores de taxa de permeabilidade do seu bairro, me informe o nome do bairro que faço a consulta!

🟨 Pergunta:

Qual a diferença entre taxa de ocupação e taxa de permeabilidade?

🟩 Resposta:  A proposta do novo Plano Diretor Urbano Sustentável e a minuta da Lei de Uso e Ocupação do Solo de Porto Alegre (LUOS) incluem um conjunto de diretrizes técnicas específicas e instrumentos normativos integrados voltados para o aprimoramento da capacidade do município em lidar com fenômenos climáticos. Abaixo, descrevo como essa abordagem se reflete no plano:

Integração das Mudanças Climáticas no PDUS',
  'Esses parâmetros fazem parte da proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre.

Se precisar de explicação sobre outro parâmetro ou quiser saber os valores de taxa de permeabilid',
  61,
  '{"keywords":["metros","bairro","ocupação"],"chunk_size":768,"has_qa":false}'::jsonb
);

-- Chunk 63
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.19215686274509802,0.8274509803921568,-0.050980392156862786,0.7647058823529411,-0.6470588235294117/* ... mais 1526 valores ... */,0.9372549019607843,0.06666666666666665,-0.6,0.5686274509803921,0.019607843137254832]::float[]::vector(1536),
  '1.Sustentabilidade Ambiental: O PDUS busca promover práticas de construção e urbanização que respeitem e integrem os princípios de sustentabilidade, incluindo a redução das emissões de carbono e o uso eficiente dos recursos naturais.

2.Certificação em Sustentabilidade: O plano prevê acréscimos nas alturas máximas permitidas para edificações que obtêm certificações em sustentabilidade ambiental. Essa medida incentiva projetos que adotem tecnologias e práticas que minimizem os impactos ambientais.

3.Zoneamento e Uso do Solo: As diretrizes de zoneamento são projetadas para garantir que as áreas urbanas sejam desenvolvidas de forma a mitigar os riscos associados às mudanças climáticas, como enchentes e ilhas de calor. Isso envolve a definição de áreas de preservação e a ordenação do uso do solo.

Considerações Finais',
  '1.Sustentabilidade Ambiental: O PDUS busca promover práticas de construção e urbanização que respeitem e integrem os princípios de sustentabilidade, incluindo a redução das emissões de carbono e o uso',
  62,
  '{"keywords":["altura","área","construção","uso do solo"],"chunk_size":826,"has_qa":false}'::jsonb
);

-- Chunk 64
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.33333333333333337,-0.8196078431372549,0.10588235294117654,-0.019607843137254943,-0.11372549019607847/* ... mais 1526 valores ... */,0.9058823529411764,-0.8196078431372549,-0.592156862745098,0.5686274509803921,-0.9921568627450981]::float[]::vector(1536),
  'Os parâmetros e diretrizes do PDUS relacionados às mudanças climáticas variam de acordo com as Zonas de Ordenamento Territorial (ZOT) e os bairros. Para obter informações específicas sobre como esses aspectos se aplicam a uma determinada área, recomendo consultar o mapa interativo ou informar o bairro de interesse.

🟨 Pergunta:

O plano incentiva construções sustentáveis?',
  'Os parâmetros e diretrizes do PDUS relacionados às mudanças climáticas variam de acordo com as Zonas de Ordenamento Territorial (ZOT) e os bairros. Para obter informações específicas sobre como esses ',
  63,
  '{"keywords":["metros","zona","zot","bairro","área"],"chunk_size":375,"has_qa":false}'::jsonb
);

-- Chunk 65
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.26274509803921564,-0.5294117647058824,-0.30980392156862746,-0.6627450980392157,0.03529411764705892/* ... mais 1526 valores ... */,-0.15294117647058825,0.15294117647058814,-0.5764705882352941,0.5372549019607844,0.3019607843137255]::float[]::vector(1536),
  '🟩 Resposta:  O Plano Diretor Urbano Sustentável (PDUS) e a Lei de Uso e Ocupação do Solo (LUOS) de Porto Alegre incentiva construções sustentáveis através de várias diretrizes. Uma das principais iniciativas é a concessão de acréscimos nos limites de altura para projetos que obtêm Certificação em Sustentabilidade Ambiental. Isso significa que, ao adotar práticas sustentáveis em seus empreendimentos, os construtores podem ter a oportunidade de construir em maior altura do que o permitido normalmente. Além disso, os empreendimentos são orientados a considerar aspectos ambientais e de sustentabilidade em seus projetos, refletindo uma preocupação com o desenvolvimento sustentável e a qualidade de vida dos cidadãos.',
  '🟩 Resposta:  O Plano Diretor Urbano Sustentável (PDUS) e a Lei de Uso e Ocupação do Solo (LUOS) de Porto Alegre incentiva construções sustentáveis através de várias diretrizes. Uma das principais ini',
  64,
  '{"keywords":["altura","ocupação"],"chunk_size":721,"has_qa":false}'::jsonb
);

-- Chunk 66
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.08235294117647063,-0.7254901960784313,0.19215686274509802,0.28627450980392166,0.8745098039215686/* ... mais 1526 valores ... */,-0.6862745098039216,0.8980392156862744,0.3411764705882352,-0.45882352941176474,-0.45882352941176474]::float[]::vector(1536),
  'É importante ressaltar que os parâmetros de construção, como altura máxima, coeficientes de aproveitamento e outros regulamentos, podem variar de acordo com a Zona de Ordenamento Territorial (ZOT) e o bairro específico. Para obter informações detalhadas sobre as regras construtivas em uma área específica, recomendo consultar o mapa interativo do PDUS ou informar o bairro de interesse.

REFERÊNCIAS 

Site oficial com as informações do Plano Diretor de Porto Alegre: https://prefeitura.poa.br/planodiretor  

Formulário para Contribuições: https://survey123.arcgis.com/share/7b40f94a827c48d0bc43e5b53077b17f?portalUrl=https://gis-smamus.portoalegre.rs.gov.br/portal 

Plataforma para consulta em mapa das regras construtivas (regime urbanístico): Secretaria de Meio Ambiente, Urbanismo e Sustentabilidade

Acesso à relatórios técnicos e informações sobre a audiência pública: Audiência Pública | Prefeitura de Porto Alegre',
  'É importante ressaltar que os parâmetros de construção, como altura máxima, coeficientes de aproveitamento e outros regulamentos, podem variar de acordo com a Zona de Ordenamento Territorial (ZOT) e o',
  65,
  '{"keywords":["altura","altura máxima","metros","zona","zot","bairro","área","urbanístico","construção","aproveitamento"],"chunk_size":924,"has_qa":false}'::jsonb
);

-- Chunk 67
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.4745098039215687,-0.7490196078431373,0.6862745098039216,0.37254901960784315,0.615686274509804/* ... mais 1526 valores ... */,-0.05882352941176472,-0.050980392156862786,0.0980392156862746,0.6627450980392158,-0.6]::float[]::vector(1536),
  'Minuta Preliminar do Plano Diretor: https://prefeitura.poa.br/sites/default/files/usu_doc/%5BNOVO%5D%20Plano%20Diretor%202023/Audiencia%20Publica%20Plano%20Diretor%202025/Minuta%20Preliminar%20do%20Plano%20Diretor.pdf  

Anexos da Minuta Preliminar do Plano Diretor: https://prefeitura.poa.br/sites/default/files/usu_doc/%5BNOVO%5D%20Plano%20Diretor%202023/Audiencia%20Publica%20Plano%20Diretor%202025/Anexos%20da%20Minuta%20Preliminar%20do%20Plano%20Diretor_compressed.pdf  

Minuta Preliminar da Lei de Uso e Ocupação do Solo: https://prefeitura.poa.br/sites/default/files/usu_doc/%5BNOVO%5D%20Plano%20Diretor%202023/Audiencia%20Publica%20Plano%20Diretor%202025/Minuta%20Preliminar%20da%20Lei%20de%20Uso%20e%20Ocupa%C3%A7%C3%A3o%20do%20Solo.pdf',
  'Minuta Preliminar do Plano Diretor: https://prefeitura.poa.br/sites/default/files/usu_doc/%5BNOVO%5D%20Plano%20Diretor%202023/Audiencia%20Publica%20Plano%20Diretor%202025/Minuta%20Preliminar%20do%20Pl',
  66,
  '{"keywords":["ocupação"],"chunk_size":746,"has_qa":false}'::jsonb
);

-- Chunk 68
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.8666666666666667,-0.5058823529411764,-0.0117647058823529,0.9215686274509804,-0.10588235294117643/* ... mais 1526 valores ... */,0.13725490196078427,-0.7725490196078432,0.8352941176470587,-0.8588235294117648,0.5294117647058822]::float[]::vector(1536),
  'Anexos da Minuta Preliminar da Lei de Uso e Ocupação do Solo: https://prefeitura.poa.br/sites/default/files/usu_doc/%5BNOVO%5D%20Plano%20Diretor%202023/Audiencia%20Publica%20Plano%20Diretor%202025/Anexos%20da%20Minuta%20Preliminar%20da%20Lei%20de%20Uso%20e%20Ocupa%C3%A7%C3%A3o%20do%20Solo.pdf  

Transparência - acesso a documentos, relatórios dos processos participativos, publicações e relatórios dos grupos de trabalho: https://prefeitura.poa.br/planodiretor/transparencia  

Agenda do plano com datas dos eventos já realizados e próximas agendas: https://prefeitura.poa.br/planodiretor/agenda  

Envie sua sugestão para o e-mail: planodiretor@portoalegre.rs.gov.br',
  'Anexos da Minuta Preliminar da Lei de Uso e Ocupação do Solo: https://prefeitura.poa.br/sites/default/files/usu_doc/%5BNOVO%5D%20Plano%20Diretor%202023/Audiencia%20Publica%20Plano%20Diretor%202025/Ane',
  67,
  '{"keywords":["ocupação"],"chunk_size":669,"has_qa":false}'::jsonb
);


-- Verificar chunks inseridos
SELECT COUNT(*) as chunks_inserted FROM document_embeddings 
WHERE document_id = '30014c0a-3b55-42a2-a22c-e8f4090d5591' AND chunk_index >= 60 AND chunk_index < 68;