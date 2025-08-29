-- PARTE 2: Chunks 1 a 10
-- Document ID: 30014c0a-3b55-42a2-a22c-e8f4090d5591

-- Chunk 1
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.6235294117647059,-0.6392156862745098,0.45882352941176463,0.4901960784313726,0.615686274509804/* ... mais 1526 valores ... */,0.7098039215686274,-0.1686274509803921,0.615686274509804,0.4039215686274509,-0.9686274509803922]::float[]::vector(1536),
  '🟨 Pergunta:

 O que muda na forma como Porto Alegre cuida dos seus espaços públicos?

🟩 Resposta:  Pela primeira vez, o Plano Diretor propõe uma estrutura permanente e integrada para planejar, coordenar e qualificar os espaços públicos da cidade. Isso significa que, em vez de cada secretaria atuar isoladamente, haverá uma instância dedicada à compatibilização de projetos, à solução de conflitos e à valorização do espaço público com o mesmo nível de atenção técnica que hoje é dedicado ao setor privado. A gestão passa a ser mais estratégica, garantindo que obras e investimentos públicos estejam bem articulados entre si — com mais eficiência e foco nas pessoas.

🟨 Pergunta:

 Como o Guaíba vai fazer mais parte da vida das pessoas com o novo Plano Diretor?',
  '🟨 Pergunta:

 O que muda na forma como Porto Alegre cuida dos seus espaços públicos?

🟩 Resposta:  Pela primeira vez, o Plano Diretor propõe uma estrutura permanente e integrada para planejar, coord',
  0,
  '{"keywords":["setor"],"chunk_size":765,"has_qa":false}'::jsonb
);

-- Chunk 2
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.4274509803921569,-0.9215686274509804,-0.30980392156862746,-0.8117647058823529,0.4901960784313726/* ... mais 1526 valores ... */,-0.4901960784313726,0.06666666666666665,0.9372549019607843,0.8509803921568628,0.6313725490196078]::float[]::vector(1536),
  '🟩 Resposta:  O Plano Diretor propõe transformar o Guaíba em protagonista da vida urbana. Isso significa fomentar atividades náuticas, culturais e de lazer ao longo da orla, conectar os bairros ao lago com infraestrutura acessível e integrar o Guaíba aos sistemas de mobilidade, cultura e meio ambiente da cidade. Em vez de ser apenas paisagem, o Guaíba passa a ser espaço de convivência, turismo, transporte e valorização das comunidades que vivem em suas margens.

🟨 Pergunta:

 Como o novo Plano Diretor vai ajudar as pessoas a perderem menos tempo no trânsito?

🟩 Resposta:  O novo Plano Diretor reorganiza o crescimento da cidade para aproximar moradia, trabalho e serviços. Ele permite mais habitação nos lugares com transporte coletivo e infraestrutura urbana, como corredores de ônibus e áreas com muitos empregos. Além disso, valoriza o uso misto do solo e propõe redes de centralidades mais bem conectadas — tudo isso para facilitar o dia a dia de quem vive longe de onde precisa estar.',
  '🟩 Resposta:  O Plano Diretor propõe transformar o Guaíba em protagonista da vida urbana. Isso significa fomentar atividades náuticas, culturais e de lazer ao longo da orla, conectar os bairros ao lag',
  1,
  '{"keywords":["bairro","área"],"chunk_size":998,"has_qa":false}'::jsonb
);

-- Chunk 3
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-1,-0.5686274509803921,0.1843137254901961,0.5294117647058822,-0.28627450980392155/* ... mais 1526 valores ... */,0.4039215686274509,-0.1843137254901961,-0.28627450980392155,-0.3254901960784313,0.2941176470588236]::float[]::vector(1536),
  '🟨 Pergunta:

 O novo Plano Diretor ajuda mesmo a melhorar a mobilidade em Porto Alegre?

🟩 Resposta:  Sim. O plano incentiva que mais pessoas morem perto de onde trabalham, estudam e usam serviços, reduzindo a necessidade de grandes deslocamentos. Ao promover o uso misto do solo e concentrar o adensamento nas áreas com melhor infraestrutura, o plano favorece trajetos mais curtos, fortalece o transporte coletivo e estimula modos ativos, como caminhar e pedalar. Isso também ajuda a reduzir a poluição: segundo o Plano de Ação Climática de Porto Alegre, o transporte por automóvel é o principal responsável pelas emissões de gases de efeito estufa na cidade.

🟨 Pergunta:

 Como o novo Plano Diretor vai ajudar a reduzir o custo da moradia?',
  '🟨 Pergunta:

 O novo Plano Diretor ajuda mesmo a melhorar a mobilidade em Porto Alegre?

🟩 Resposta:  Sim. O plano incentiva que mais pessoas morem perto de onde trabalham, estudam e usam serviços, ',
  2,
  '{"keywords":["área"],"chunk_size":745,"has_qa":false}'::jsonb
);

-- Chunk 4
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.050980392156862786,0.5921568627450979,-0.9372549019607843,-0.7098039215686274,-0.3647058823529412/* ... mais 1526 valores ... */,-0.43529411764705883,-0.6862745098039216,0.3176470588235294,0.19999999999999996,1]::float[]::vector(1536),
  '🟩 Resposta:  O Plano Diretor facilita a construção de mais moradias em áreas bem localizadas, próximas ao transporte coletivo e aos empregos. Ele estimula o uso de terrenos ociosos, permite diferentes tipos de moradia, incentiva reformas de prédios existentes e simplifica as regras urbanísticas. Com mais oferta onde a cidade já tem infraestrutura, o custo por moradia tende a cair — e morar bem se torna mais acessível para mais gente.

🟨 Pergunta:

 Como a simplificação das regras urbanísticas reduz o custo da habitação?',
  '🟩 Resposta:  O Plano Diretor facilita a construção de mais moradias em áreas bem localizadas, próximas ao transporte coletivo e aos empregos. Ele estimula o uso de terrenos ociosos, permite diferente',
  3,
  '{"keywords":["área","construção"],"chunk_size":527,"has_qa":false}'::jsonb
);

-- Chunk 5
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.5137254901960784,-0.5686274509803921,-0.7568627450980392,0.5215686274509803,0.19215686274509802/* ... mais 1526 valores ... */,-0.8745098039215686,-0.6941176470588235,-0.28627450980392155,-0.9137254901960784,-0.08235294117647063]::float[]::vector(1536),
  '🟩 Resposta:  Porque regras mais simples e claras ajudam a destravar projetos e reduzir os custos com estudos, revisões e prazos de aprovação. O novo Plano Diretor e a nova LUOS substituem centenas de zonas específicas por uma lógica mais enxuta e coerente com a realidade da cidade. Isso permite construir com mais segurança jurídica, amplia as possibilidades de uso dos terrenos e facilita a regularização de imóveis. Quanto menos barreiras, mais moradias podem ser viabilizadas — e mais acessíveis elas se tornam.

🟨 Pergunta:

 Onde a moradia vai ficar mais acessível com o novo Plano Diretor?',
  '🟩 Resposta:  Porque regras mais simples e claras ajudam a destravar projetos e reduzir os custos com estudos, revisões e prazos de aprovação. O novo Plano Diretor e a nova LUOS substituem centenas de',
  4,
  '{"keywords":["zona"],"chunk_size":598,"has_qa":false}'::jsonb
);

-- Chunk 6
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.24705882352941178,0.9607843137254901,-0.2705882352941177,0.13725490196078427,-0.4666666666666667/* ... mais 1526 valores ... */,-0.19999999999999996,0.8745098039215686,0.5921568627450979,-0.07450980392156858,0.24705882352941178]::float[]::vector(1536),
  '🟩 Resposta:  Nas áreas com melhor infraestrutura urbana e transporte coletivo, como os corredores de ônibus, centros de bairro e zonas mais consolidadas da cidade. O novo Plano Diretor permite mais unidades habitacionais nesses locais e incentiva o uso de terrenos vazios ou subutilizados. Isso aproxima as pessoas dos serviços e empregos, reduz os custos com transporte e aumenta a oferta de moradia onde já é possível viver com qualidade.

🟨 Pergunta:

 Como o novo Plano Diretor vai preparar Porto Alegre para os efeitos das mudanças climáticas?',
  '🟩 Resposta:  Nas áreas com melhor infraestrutura urbana e transporte coletivo, como os corredores de ônibus, centros de bairro e zonas mais consolidadas da cidade. O novo Plano Diretor permite mais u',
  5,
  '{"keywords":["zona","bairro","área"],"chunk_size":550,"has_qa":false}'::jsonb
);

-- Chunk 7
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.48235294117647065,0.8745098039215686,0.027450980392156765,-0.8431372549019608,0.7411764705882353/* ... mais 1526 valores ... */,0.6705882352941177,-0.5764705882352941,0.6549019607843136,-0.6784313725490196,0.2078431372549019]::float[]::vector(1536),
  '🟩 Resposta:  O Plano Diretor propõe transformar a forma como a cidade lida com o clima extremo. Em vez de afastar a população das áreas vulneráveis, o plano organiza o território com foco na adaptação — fortalecendo a drenagem urbana, valorizando soluções baseadas na natureza e conectando áreas verdes para formar redes ecológicas. Áreas expostas a alagamentos passam a ser priorizadas para investimentos públicos, com infraestrutura segura e resiliência ambiental. É uma nova forma de planejar: reconhecendo os riscos, mas sem abandonar quem mais precisa de proteção.

🟨 Pergunta:

 O novo Plano Diretor ajuda a reduzir as emissões que causam as mudanças climáticas?',
  '🟩 Resposta:  O Plano Diretor propõe transformar a forma como a cidade lida com o clima extremo. Em vez de afastar a população das áreas vulneráveis, o plano organiza o território com foco na adaptaçã',
  6,
  '{"keywords":["área"],"chunk_size":670,"has_qa":false}'::jsonb
);

-- Chunk 8
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.6392156862745098,-0.8431372549019608,-0.5529411764705883,0.9058823529411764,0.780392156862745/* ... mais 1526 valores ... */,-0.05882352941176472,0.6705882352941177,0.5215686274509803,0.7568627450980392,-0.7490196078431373]::float[]::vector(1536),
  '🟩 Resposta:  Sim. O plano estimula que mais pessoas morem perto do transporte coletivo e dos empregos, o que reduz o uso do carro — hoje o principal responsável pelas emissões em Porto Alegre, segundo o Plano de Ação Climática. Além disso, ele promove o uso misto do solo, valoriza a mobilidade ativa (como caminhar e pedalar) e protege áreas verdes, que ajudam a regular o clima. É um passo importante para tornar a cidade mais sustentável e justa com o meio ambiente.

🟨 Pergunta:

 Como o novo Plano Diretor ajuda Porto Alegre a atrair investimentos e gerar desenvolvimento?',
  '🟩 Resposta:  Sim. O plano estimula que mais pessoas morem perto do transporte coletivo e dos empregos, o que reduz o uso do carro — hoje o principal responsável pelas emissões em Porto Alegre, segund',
  7,
  '{"keywords":["área"],"chunk_size":579,"has_qa":false}'::jsonb
);

-- Chunk 9
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[0.9294117647058824,0.9215686274509804,-0.39607843137254906,0.03529411764705892,-0.2705882352941177/* ... mais 1526 valores ... */,-0.9294117647058824,0.12941176470588234,-0.22352941176470587,0.8431372549019607,-0.5137254901960784]::float[]::vector(1536),
  '🟩 Resposta:  O novo Plano Diretor organiza o crescimento da cidade com mais clareza e previsibilidade. Isso dá mais segurança para quem quer investir, empreender ou construir. O plano também fortalece o papel do planejamento urbano como motor da economia, conectando as decisões sobre o uso do solo à infraestrutura, ao orçamento público e às oportunidades de financiamento. Com regras mais simples, uso mais eficiente do território e visão de longo prazo, a cidade se torna mais preparada para receber projetos que geram emprego, renda e qualidade de vida.

🟨 Pergunta:

 Como o novo Plano Diretor garante que a cidade acompanhe suas transformações e tome decisões com base em dados?',
  '🟩 Resposta:  O novo Plano Diretor organiza o crescimento da cidade com mais clareza e previsibilidade. Isso dá mais segurança para quem quer investir, empreender ou construir. O plano também fortalec',
  8,
  '{"keywords":["uso do solo"],"chunk_size":686,"has_qa":false}'::jsonb
);

-- Chunk 10
INSERT INTO document_embeddings (
  document_id, 
  embedding, 
  content, 
  content_preview, 
  chunk_index, 
  metadata
) VALUES (
  '30014c0a-3b55-42a2-a22c-e8f4090d5591',
  ARRAY[-0.07450980392156858,0.30980392156862746,-1,-0.15294117647058825,-0.6235294117647059/* ... mais 1526 valores ... */,-0.6862745098039216,-0.4745098039215686,-0.3647058823529412,-0.0117647058823529,-0.45882352941176474]::float[]::vector(1536),
  '🟩 Resposta:  O novo Plano Diretor cria o CIT – Centro de Inteligência Territorial –, uma estrutura permanente que integra dados, mapas e indicadores para entender como a cidade está mudando. Ele permite que o planejamento urbano seja feito com base em evidências técnicas, ajudando a Prefeitura a tomar decisões mais rápidas, inteligentes e transparentes. Isso significa mais capacidade de resposta diante das transformações da cidade — e mais eficiência no uso dos recursos públicos.

🟨 Pergunta:

 Como o novo Plano Diretor garante que os recursos gerados pelo desenvolvimento urbano sejam bem aplicados?',
  '🟩 Resposta:  O novo Plano Diretor cria o CIT – Centro de Inteligência Territorial –, uma estrutura permanente que integra dados, mapas e indicadores para entender como a cidade está mudando. Ele perm',
  9,
  '{"keywords":[],"chunk_size":608,"has_qa":false}'::jsonb
);


-- Verificar chunks inseridos
SELECT COUNT(*) as chunks_inserted FROM document_embeddings 
WHERE document_id = '30014c0a-3b55-42a2-a22c-e8f4090d5591' AND chunk_index >= 0 AND chunk_index < 10;