# Base de Conhecimento PDPOA 2025 - Casos de QA

## Sobre este Documento

Esta base de conhecimento contém respostas validadas sobre o Plano Diretor de Porto Alegre (PDPOA) 2025, extraídas dos casos de teste de QA oficial, organizadas por categoria temática para facilitar a implementação em sistemas de RAG (Retrieval-Augmented Generation).

## Metadados

- **Total de Casos:** 124
- **Total de Categorias:** 16
- **Data de Processamento:** 20/08/2025 15:44
- **Fonte:** PDPOA2025-QA-2025-08-17.docx

## Estatísticas

### Por Dificuldade
- **Easy:** 4 casos
- **High:** 49 casos
- **Medium:** 67 casos
- **Simple:** 4 casos

## Índice de Categorias

- [Altura Maxima](#altura_maxima) (4 casos)
- [Altura Maxima | Relacionado A Sql](#altura_maxima-relacionado-a-sql) (1 casos)
- [Ambiental](#ambiental) (2 casos)
- [Bairro](#bairro) (1 casos)
- [Bairros](#bairros) (26 casos)
- [Coeficiente Aproveitamento](#coeficiente_aproveitamento) (4 casos)
- [Conceitual](#conceitual) (27 casos)
- [Geral](#geral) (28 casos)
- [Habitacao](#habitacao) (3 casos)
- [Legal](#legal) (8 casos)
- [Lei](#lei) (1 casos)
- [Recuos](#recuos) (4 casos)
- [Taxa Permeabilidade](#taxa_permeabilidade) (5 casos)
- [Teste](#teste) (1 casos)
- [Teste-Browser](#teste-browser) (1 casos)
- [Zonas](#zonas) (8 casos)

---

## Altura Maxima

**Total de casos nesta categoria:** 4

### Caso #454

**Tags:** altura_maxima
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

A altura máxima permitida para construção de prédios em Porto Alegre depende exclusivamente da Zona de Ordenamento Territorial (ZOT) em que está localizado o terreno. Não existe um único valor para toda a cidade; cada ZOT tem uma altura máxima específica, estabelecida na proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre. Como funciona: Cada bairro pode ter mais de uma ZOT. Cada ZOT possui uma altura máxima definida na proposta. Para saber a altura máxima permitida em um local, é necessário primeiro identificar o bairro e depois consultar quais ZOTs existem nele. Só então é possível informar os valores. Exemplo prático: Se você informar o nome do bairro, posso listar todas as ZOTs presentes nele e informar a altura máxima proposta para cada uma delas. Regras importantes: Não há um valor único para toda Porto Alegre. A altura máxima é sempre definida por ZOT, não por endereço individual. A flexibilização de altura só é possível mediante Estudo de Impacto de Vizinhança (EIV), conforme previsto na proposta da LUOS. Em caso de dúvidas ou ausência de ZOT correspondente, é necessário consultar a base oficial. Esses parâmetros fazem parte da proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre. Se quiser saber a altura máxima para um bairro específico, por favor, informe o nome do bairro. Assim, trago as informações completas e atualizadas para você!

---

### Caso #471

**Tags:** altura_maxima
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

No bairro Três Figueiras de Porto Alegre, a altura máxima permitida varia de acordo com a zona de ocupação do terreno. Com base nos dados fornecidos, a altura máxima permitida na ZOT 08.3 - C é de 90.0 metros, na ZOT 04 é de 18.0 metros e na ZOT 07 é de 60.0 metros. Portanto, é necessário verificar em qual zona específica do bairro Três Figueiras se encontra o terreno em questão para determinar a altura máxima permitida.

---

### Caso #486

**Tags:** altura_maxima
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

A altura máxima permitida mais alta é de 130 metros, presente em algumas ZOTs específicas.

---

### Caso #497

**Tags:** altura_maxima
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

As alturas máximas variam por ZOT: 0m, 9m, 18m, 33m, 42m, 60m, 75m, 90m, 100m e 130m, dependendo da zona e suas características específicas.

---

## Altura Maxima | Relacionado A Sql

**Total de casos nesta categoria:** 1

### Caso #485

**Tags:** altura_maxima | Relacionado a SQL
**Dificuldade:** medium
**Versão:** 2

**Conteúdo:**

Os bairros com altura máxima de 90 metros incluem: Zona Bairro ZOT 08 AZENHA ZOT 08 MENINO DEUS ZOT 08 PRAIA DE BELAS ZOT 08.1 - C CENTRO HISTÓRICO ZOT 08.3 - B AZENHA ZOT 08.3 - B BOM JESUS ZOT 08.3 - B JARDIM BOTÂNICO ZOT 08.3 - B JARDIM CARVALHO ZOT 08.3 - B JARDIM DO SALSO ZOT 08.3 - B MEDIANEIRA ZOT 08.3 - B MENINO DEUS ZOT 08.3 - B PARTENON ZOT 08.3 - B PETRÓPOLIS ZOT 08.3 - B PRAIA DE BELAS ZOT 08.3 - B SANTA CECÍLIA ZOT 08.3 - B SANTANA ZOT 08.3 - B SANTO ANTÔNIO ZOT 08.3 - B VILA JOÃO PESSOA ZOT 08.3 - B VILA SÃO JOSÉ ZOT 08.3 - C AUXILIADORA ZOT 08.3 - C BELA VISTA ZOT 08.3 - C BOA VISTA ZOT 08.3 - C BOM JESUS ZOT 08.3 - C CHÁCARA DAS PEDRAS ZOT 08.3 - C HIGIENÓPOLIS ZOT 08.3 - C JARDIM BOTÂNICO ZOT 08.3 - C JARDIM CARVALHO ZOT 08.3 - C JARDIM DO SALSO ZOT 08.3 - C JARDIM EUROPA ZOT 08.3 - C JARDIM SABARÁ ZOT 08.3 - C MOINHOS DE VENTO ZOT 08.3 - C MONTSERRAT ZOT 08.3 - C PETRÓPOLIS ZOT 08.3 - C RIO BRANCO ZOT 08.3 - C SANTA CECÍLIA ZOT 08.3 - C SÃO JOÃO ZOT 08.3 - C TRÊS FIGUEIRAS ZOT 08.3 - C VILA JARDIM

---

## Ambiental

**Total de casos nesta categoria:** 2

### Caso #427

**Tags:** ambiental, enchentes_2024
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

A revisão chega em um momento crítico --- e por isso é ainda mais importante. Ela foi profundamente reformulada para responder aos desafios da mudança climática e ao esgotamento do modelo de crescimento disperso. A proposta incorpora sistemas de dados e governança permanente, como o CIT e o SGC, que garantem que o plano seja dinâmico, atualizado e vinculado a metas reais. Não é uma resposta pontual, mas uma base para decisões mais eficazes daqui em diante.

---

### Caso #438

**Tags:** ambiental
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Sistema Ecológico O plano cria o Sistema Ecológico como uma nova estrutura de ordenamento ambiental. Ele organiza os ativos ambientais do território municipal, integrando: • Áreas de Preservação Permanente (APPs) • Unidades de Conservação • Áreas Verdes Públicas • Áreas de Risco • Corredores de Biodiversidade (ecológicos e verdes) Esse sistema é a base para orientar políticas de conservação, recuperação ambiental, drenagem urbana e adaptação às mudanças climáticas. Corredores de Biodiversidade Dentro do Sistema Ecológico, o plano define dois tipos de corredores: • Corredores Ecológicos: conectam áreas ambientalmente protegidas (ex: matas ciliares, morros). • Corredores Verdes: fazem a transição entre áreas densamente urbanizadas e as ecológicas, ajudando na absorção de água, na ventilação e na conectividade ambiental. Eles ajudam a formar uma malha contínua de preservação e adaptação urbana. Permeabilidade e infraestrutura verde O plano institui índices de permeabilidade obrigatórios, ampliando de 32% para até 45% a exigência de solo permeável em determinadas áreas, considerando o novo modelo de ocupação. Além disso, articula a drenagem urbana como parte dos sistemas estruturantes da cidade. Certificação de Edificação Sustentável O plano fortalece esse instrumento já existente, criando incentivos para edificações verdes e resilientes --- com uso racional de energia e água, melhor conforto térmico, e maior integração com o ambiente urbano. Integração com planejamento territorial A política ambiental não é tratada como algo apartado. Ela se integra ao zoneamento, aos planos locais e de pormenor, e ao Sistema de Inteligência Territorial (CIT), permitindo que o monitoramento e a aplicação dos instrumentos urbanísticos respeitem os limites ambientais do território.

---

## Bairro

**Total de casos nesta categoria:** 1

### Caso #561

**Tags:** bairro, boa-vista, coeficiente, aproveitamento, zot, atualizado
**Dificuldade:** medium
**Versão:** 4

**Conteúdo:**

O bairro Boa Vista possui diferentes coeficientes de aproveitamento conforme a zona: - ZOT 04: Coeficiente básico de 2.0, altura máxima de 18m - ZOT 07: Coeficiente básico de 3.6, altura máxima de 60m - ZOT 08.3-C: Coeficiente básico de 3.6, altura máxima de 90m - Zona Especial: Coeficiente 0.0 (área não edificável)

---

## Bairros

**Total de casos nesta categoria:** 26

### Caso #433

**Tags:** bairros
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

No bairro Três Figueiras, de acordo com o Plano Diretor de Porto Alegre, podem ser construídos edifícios seguindo as diretrizes das seguintes zonas: ZOT 08.3 - C: Coeficiente de aproveitamento básico de 3.6, coeficiente de aproveitamento máximo de 7.5 e altura máxima de 90.0 metros. ZOT 04: Coeficiente de aproveitamento básico de 2.0, coeficiente de aproveitamento máximo de 4.0 e altura máxima de 18.0 metros. ZOT 07: Coeficiente de aproveitamento básico de 3.6, coeficiente de aproveitamento máximo de 6.5 e altura máxima de 60.0 metros. Essas informações definem as restrições e possibilidades de construção no bairro Três Figueiras, de acordo com o Plano Diretor de Porto Alegre. Detalhes das ZOTs ZOT 08.3 - C: Permite uma altura máxima de 90 metros, com coeficiente de aproveitamento básico de 3.6 e máximo de 7.5. ZOT 04: Permite uma altura máxima de 18 metros, com coeficiente de aproveitamento básico de 2.0 e máximo de 4.0. ZOT 07: Permite uma altura máxima de 60 metros, com coeficiente de aproveitamento básico de 3.6 e máximo de 6.5. Essas informações permitem que você compreenda as possibilidades de construção dentro do bairro Três Figueiras, considerando os parâmetros de altura e coeficientes de aproveitamento.

---

### Caso #447

**Tags:** bairros, centro
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Sim. O novo Plano Diretor contempla os programas em andamento para o Centro Histórico e o 4º Distrito, integrando-os ao modelo territorial e às estratégias de requalificação urbana da cidade. Essas áreas estão inseridas em Zonas de Ordenamento Territorial (ZOTs) com alto potencial de transformação e estão vinculadas às Áreas de Requalificação Urbana (ARU), o que lhes confere prioridade para ações coordenadas de requalificação, adensamento e diversificação de usos. No caso do Centro, trata-se de consolidar sua função como centralidade metropolitana, promovendo a habitação, o uso misto e a qualificação dos espaços públicos. Já o 4º Distrito é reconhecido como território estratégico para o desenvolvimento econômico, inovação e revitalização urbana. Além disso, o plano prevê a possibilidade de elaboração de Planos de Pormenor para essas áreas, permitindo a articulação entre os projetos existentes --- como o Programa Centro+, o Programa de Reabilitação do 4º Distrito e os projetos financiados por organismos internacionais --- e os novos instrumentos e diretrizes do PDUS. Isso garante continuidade institucional e base normativa para sua implementação integrada.

---

### Caso #449

**Tags:** bairros, areas_risco
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Considerando os impactos dos eventos climáticos extremos de 2024, propõe-se a seguinte divisão do território municipal para orientar políticas de adaptação: Áreas Protegidas pelo Sistema Atual: Regiões já abrangidas pela infraestrutura existente de proteção contra inundações. A prioridade nestas áreas é a recuperação, manutenção e eventual modernização dos sistemas de proteção, garantindo sua resiliência frente ao aumento da frequência e intensidade dos eventos climáticos. Áreas em Estudo: Territórios diretamente impactados pelas inundações e ainda não plenamente protegidos pelo sistema atual --- como ilhas e orla sul. Nestas áreas, estão em andamento estudos e projetos para definição de novas soluções de adaptação, incorporando inovação, soluções baseadas na natureza e a participação das comunidades locais. Áreas com Ocupação Urbana acima da Cota de Inundação de 2024: Bairros cuja urbanização se dá predominantemente acima da cota atingida pela inundação de 2024. Nessas áreas, a prioridade é a prevenção, o monitoramento permanente e a incorporação de estratégias de resiliência urbana, garantindo que futuros processos de urbanização e adensamento não ampliem o risco.

---

### Caso #468

**Tags:** bairros
**Dificuldade:** high
**Versão:** 2

**Conteúdo:**

Considerando os impactos dos eventos climáticos extremos de 2024, propõe-se a seguinte divisão do território municipal para orientar políticas de adaptação: - Áreas Protegidas pelo Sistema Atual: Regiões já abrangidas pela infraestrutura existente de proteção contra inundações. A prioridade nestas áreas é a recuperação, manutenção e eventual modernização dos sistemas de proteção, garantindo sua resiliência frente ao aumento da frequência e intensidade dos eventos climáticos. - Áreas em Estudo: Territórios diretamente impactados pelas inundações e ainda não plenamente protegidos pelo sistema atual --- como ilhas e orla sul. Nestas áreas, estão em andamento estudos e projetos para definição de novas soluções de adaptação, incorporando inovação, soluções baseadas na natureza e a participação das comunidades locais. - Áreas com Ocupação Urbana acima da Cota de Inundação de 2024: Bairros cuja urbanização se dá predominantemente acima da cota atingida pela inundação de 2024. Nessas áreas, a prioridade é a prevenção, o monitoramento permanente e a incorporação de estratégias de resiliência urbana, garantindo que futuros processos de urbanização e adensamento não ampliem o risco. O bairro Mário Quintana encontra-se em Área com Ocupação Urbana Acima da Cota de Inundação 2024.

---

### Caso #469

**Tags:** bairros
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Os principais índices do regime urbanístico do bairro Três Figueiras em Porto Alegre são os seguintes: - ZOT 08.3 - C: Coeficiente de aproveitamento básico (CA básico) de 3.6, coeficiente de aproveitamento máximo (CA máximo) de 7.5 e altura máxima de 90.0 metros. - ZOT 04: Coeficiente de aproveitamento básico (CA básico) de 2.0, coeficiente de aproveitamento máximo (CA máximo) de 4.0 e altura máxima de 18.0 metros. - ZOT 07: Coeficiente de aproveitamento básico (CA básico) de 3.6, coeficiente de aproveitamento máximo (CA máximo) de 6.5 e altura máxima de 60.0 metros. Resuma o regime urbanístico do bairro três figueiras. O regime urbanístico do bairro Três Figueiras em Porto Alegre é composto por três conjuntos com diferentes parâmetros de ocupação do solo: 1. Conjunto 1 (ZOT 08.3 - C): - Coeficiente de Aproveitamento Básico (CA) de 3.6 - Coeficiente de Aproveitamento Máximo (CA) de 7.5 - Altura máxima de 90.0 metros 2. Conjunto 2 (ZOT 04): - Coeficiente de Aproveitamento Básico (CA) de 2.0 - Coeficiente de Aproveitamento Máximo (CA) de 4.0 - Altura máxima de 18.0 metros 3. Conjunto 3 (ZOT 07): - Coeficiente de Aproveitamento Básico (CA) de 3.6 - Coeficiente de Aproveitamento Máximo (CA) de 6.5 - Altura máxima de 60.0 metros Esses parâmetros indicam as restrições e possibilidades de construção e ocupação do solo no bairro Três Figueiras de acordo com o Plano Diretor de Porto Alegre. Qual é o potencial construtivo do bairro três figueiras. Com base nos dados encontrados para o bairro Três Figueiras em Porto Alegre, o potencial construtivo varia de acordo com a zona de ocupação do local. Seguem as informações encontradas: 1. ZOT 08.3 - C: Coeficiente de aproveitamento básico (CA básico) de 3.6, coeficiente de aproveitamento máximo (CA máximo) de 7.5 e altura máxima de 90.0 metros. 2. ZOT 04: Coeficiente de aproveitamento básico (CA básico) de 2.0, coeficiente de aproveitamento máximo (CA máximo) de 4.0 e altura máxima de 18.0 metros. 3. ZOT 07: Coeficiente de aproveitamento básico (CA básico) de 3.6, coeficiente de aproveitamento máximo (CA máximo) de 6.5 e altura máxima de 60.0 metros. Esses dados indicam o potencial de construção permitido em cada zona do bairro Três Figueiras. Recomenda-se verificar junto à Prefeitura de Porto Alegre para mais informações específicas sobre o potencial construtivo do local.

---

### Caso #470

**Tags:** bairros
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

No bairro Três Figueiras de Porto Alegre, a altura máxima permitida varia de acordo com a zona de ocupação do terreno. Com base nos dados fornecidos, a altura máxima permitida na ZOT 08.3 - C é de 90.0 metros, na ZOT 04 é de 18.0 metros e na ZOT 07 é de 60.0 metros. Portanto, é necessário verificar em qual zona específica do bairro Três Figueiras se encontra o terreno em questão para determinar a altura máxima permitida.

---

### Caso #472

**Tags:** bairros
**Dificuldade:** medium
**Versão:** 2

**Conteúdo:**

Para a zona de Três Figueiras em Porto Alegre, as regras de construção são as seguintes: - Altura máxima: - ZOT 04: 18 metros - ZOT 07: 60 metros - ZOT 08.3 - C: 90 metros - Coeficiente de aproveitamento básico: - ZOT 04: 2.0 - ZOT 07: 3.6 - ZOT 08.3 - C: 3.6 - Coeficiente de aproveitamento máximo: - ZOT 04: 4.0 - ZOT 07: 6.5 - ZOT 08.3 - C: 7.5

---

### Caso #474

**Tags:** bairros
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Os principais índices do regime urbanístico do bairro Petrópolis são os seguintes: - Zona: ZOT 07 - Coeficiente de Aproveitamento Básico (CA básico): 3.6 - Coeficiente de Aproveitamento Máximo (CA máximo): 6.5 - Altura Máxima: 60.0 metros - Zona: ZOT 08.3 - C - Coeficiente de Aproveitamento Básico (CA básico): 3.6 - Coeficiente de Aproveitamento Máximo (CA máximo): 7.5 - Altura Máxima: 90.0 metros - Zona: ZOT 08.3 - B - Coeficiente de Aproveitamento Básico (CA básico): 3.6 - Coeficiente de Aproveitamento Máximo (CA máximo): 7.5 - Altura Máxima: 90.0 metros Esses são os principais índices do regime urbanístico do bairro Petrópolis de acordo com os dados encontrados.

---

### Caso #475

**Tags:** bairros
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

No bairro Petrópolis, em Porto Alegre, podem ser construídos edifícios de acordo com as diretrizes estabelecidas para as zonas ZOT 07, ZOT 08.3 - C e ZOT 08.3 - B, conforme os registros encontrados: 1. ZOT 07: - Coeficiente de aproveitamento básico (CA básico): 3.6 - Coeficiente de aproveitamento máximo (CA máximo): 6.5 - Altura máxima: 60.0 metros 2. ZOT 08.3 - C: - Coeficiente de aproveitamento básico (CA básico): 3.6 - Coeficiente de aproveitamento máximo (CA máximo): 7.5 - Altura máxima: 90.0 metros 3. ZOT 08.3 - B: - Coeficiente de aproveitamento básico (CA básico): 3.6 - Coeficiente de aproveitamento máximo (CA máximo): 7.5 - Altura máxima: 90.0 metros Esses dados indicam as restrições e possibilidades de construção de edifícios nos respectivos zonas do bairro Petrópolis, conforme estabelecido no Plano Diretor de Porto Alegre.

---

### Caso #477

**Tags:** bairros
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Os principais índices do regime urbanístico do bairro Três Figueiras em Porto Alegre são os seguintes: - ZOT 04: Coeficiente de Aproveitamento Básico (CA básico) de 2.0, Coeficiente de Aproveitamento Máximo (CA máximo) de 4.0 e Altura Máxima de 18.0 metros. - ZOT 08.3 - C: Coeficiente de Aproveitamento Básico (CA básico) de 3.6, Coeficiente de Aproveitamento Máximo (CA máximo) de 7.5 e Altura Máxima de 90.0 metros. - ZOT 07: Coeficiente de Aproveitamento Básico (CA básico) de 3.6, Coeficiente de Aproveitamento Máximo (CA máximo) de 6.5 e Altura Máxima de 60.0 metros. Esses índices são importantes para orientar o uso e ocupação do solo no bairro Três Figueiras de acordo com o Plano Diretor de Porto Alegre.

---

### Caso #478

**Tags:** bairros
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

A ZOT 08 pertence aos seguintes bairros: Bairros com ZOT 08 (específica): AZENHA MENINO DEUS PRAIA DE BELAS Bairros com subdivisões da ZOT 08: ZOT 08.1 (subdivisões A a G): CENTRO HISTÓRICO (possui todas as subdivisões: A, B, C, D, E, F, G) BOM FIM (ZOT 08.1 - B) FARROUPILHA (ZOT 08.1 - G) ZOT 08.2 (subdivisões A e B): AUXILIADORA (ZOT 08.2 - A) FARRAPOS (ZOT 08.2 - B) FLORESTA (ZOT 08.2 - A) HUMAITÁ (ZOT 08.2 - B) INDEPENDÊNCIA (ZOT 08.2 - A) MOINHOS DE VENTO (ZOT 08.2 - A) NAVEGANTES (ZOT 08.2 - B) SÃO GERALDO (ZOT 08.2 - A) SÃO JOÃO (ZOT 08.2 - A e B) ZOT 08.3 (subdivisões A, B e C): AUXILIADORA (ZOT 08.3 - C) AZENHA (ZOT 08.3 - A e B) BELA VISTA (ZOT 08.3 - C) BOA VISTA (ZOT 08.3 - C) BOM JESUS (ZOT 08.3 - B e C) CHÁCARA DAS PEDRAS (ZOT 08.3 - C) CRISTAL (ZOT 08.3 - A) HIGIENÓPOLIS (ZOT 08.3 - C) JARDIM BOTÂNICO (ZOT 08.3 - B e C) JARDIM CARVALHO (ZOT 08.3 - B e C) JARDIM DO SALSO (ZOT 08.3 - B e C) JARDIM EUROPA (ZOT 08.3 - C) JARDIM SABARÁ (ZOT 08.3 - C) MEDIANEIRA (ZOT 08.3 - B) MONTSERRAT (ZOT 08.3 - C) PARTENON (ZOT 08.3 - B) PETRÓPOLIS (ZOT 08.3 - B e C) PRAIA DE BELAS (ZOT 08.3 - A e B) RIO BRANCO (ZOT 08.3 - C) SANTA CECÍLIA (ZOT 08.3 - B e C) SANTANA (ZOT 08.3 - B) SANTO ANTÔNIO (ZOT 08.3 - B) SÃO JOÃO (ZOT 08.3 - C) TRÊS FIGUEIRAS (ZOT 08.3 - C) VILA JARDIM (ZOT 08.3 - C) VILA JOÃO PESSOA (ZOT 08.3 - B) VILA SÃO JOSÉ (ZOT 08.3 - B) Total: A ZOT 08 e suas subdivisões estão presentes em 39 bairros diferentes de Porto Alegre, representando uma das zonas mais amplamente distribuídas na cidade, especialmente em áreas com maior potencial de verticalização e transformação urbana.

---

### Caso #479

**Tags:** bairros
**Dificuldade:** medium
**Versão:** 2

**Conteúdo:**

Segundo a Lei nº 12.112, sancionada em 22 de agosto de 2016, o município de Porto Alegre passou a contar com 94 bairros oficiais. Estes bairros são reconhecidos no novo Plano Diretor e utilizados para fins de delimitação das macrozonas e das unidades de planejamento local, com a finalidade de monitoramento e gestão territorial. Os 94 bairros de Porto Alegre são: ABERTA DOS MORROS AGRONOMIA ANCHIETA ARQUIPÉLAGO AUXILIADORA AZENHA BELA VISTA BELÉM NOVO BELÉM VELHO BOA VISTA BOA VISTA DO SUL BOM FIM BOM JESUS CAMAQUÃ CAMPO NOVO CASCATA CAVALHADA CEL. APARICIO BORGES CENTRO HISTÓRICO CHAPÉU DO SOL CHÁCARA DAS PEDRAS CIDADE BAIXA COSTA E SILVA CRISTAL CRISTO REDENTOR ESPÍRITO SANTO EXTREMA FARRAPOS FARROUPILHA FLORESTA GLÓRIA GUARUJÁ HIGIENÓPOLIS HUMAITÁ HÍPICA INDEPENDÊNCIA IPANEMA JARDIM BOTÂNICO JARDIM CARVALHO JARDIM DO SALSO JARDIM EUROPA JARDIM FLORESTA JARDIM ISABEL JARDIM ITU JARDIM LEOPOLDINA JARDIM LINDÓIA JARDIM SABARÁ JARDIM SÃO PEDRO LAGEADO LAMI LOMBA DO PINHEIRO MEDIANEIRA MENINO DEUS MOINHOS DE VENTO MONTSERRAT MORRO SANTANA MÁRIO QUINTANA NAVEGANTES NONOAI PARQUE SANTA FÉ PARTENON PASSO DA AREIA PASSO DAS PEDRAS PEDRA REDONDA PETRÓPOLIS PITINGA PONTA GROSSA PRAIA DE BELAS RESTINGA RIO BRANCO RUBEM BERTA SANTA CECÍLIA SANTA MARIA GORETTI SANTA ROSA DE LIMA SANTA TEREZA SANTANA SANTO ANTÔNIO SARANDI SERRARIA SÃO CAETANO SÃO GERALDO SÃO JOÃO SÃO SEBASTIÃO SÉTIMO CÉU TERESÓPOLIS TRISTEZA TRÊS FIGUEIRAS VILA ASSUNÇÃO VILA CONCEIÇÃO VILA IPIRANGA VILA JARDIM VILA JOÃO PESSOA VILA NOVA VILA SÃO JOSÉ

---

### Caso #482

**Tags:** bairros, enchentes_2024
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

57 bairros estão classificados como "Bairros com Ocupação Urbana Acima da Cota de Inundação 2024"

---

### Caso #483

**Tags:** bairros
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

25 bairros são classificados como "Bairros Protegidos pelo Sistema Atual" de proteção contra inundações.

---

### Caso #484

**Tags:** bairros, protecao, enchentes_2024
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

13 bairros estão classificados como "Bairros em Área de Estudo", que são territórios diretamente impactados pelas inundações e ainda não plenamente protegidos pelo sistema atual.

---

### Caso #487

**Tags:** bairros, centro, historico
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O Centro Histórico possui as seguintes ZOTs: ESPECIAL, ZOT 08.1 - A, ZOT 08.1 - B, ZOT 08.1 - C, ZOT 08.1 - D, ZOT 08.1 - E, ZOT 08.1 - F, ZOT 08.1 - G.

---

### Caso #490

**Tags:** bairros
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O Centro Histórico é um dos bairros com maior diversidade de ZOTs, possuindo 8 zonas diferentes (ESPECIAL e 7 subdivisões da ZOT 08.1).

---

### Caso #491

**Tags:** bairros
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O bairro Auxiliadora possui as seguintes ZOTs: ZOT 07, ZOT 08.2 - A, ZOT 08.3 - C.

---

### Caso #492

**Tags:** bairros
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O bairro Azenha possui as seguintes ZOTs: ZOT 07, ZOT 08, ZOT 08.3 - A, ZOT 08.3 - B, ZOT 10, ZOT 12.

---

### Caso #495

**Tags:** bairros, enchentes_2024, areas_risco
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Os 13 bairros em Área de Estudo são: ARQUIPÉLAGO, BELÉM NOVO, BOA VISTA DO SUL, CHAPÉU DO SOL, EXTREMA, FARRAPOS, HUMAITÁ, LAGEADO, LAMI, PONTA GROSSA, RESTINGA, SARANDI, SERRARIA.

---

### Caso #496

**Tags:** bairros
**Dificuldade:** medium
**Versão:** 2

**Conteúdo:**

A ZOT 01 está presente em múltiplos bairros. Segue a lista completa ordenada pelo nome do bairro: ABERTA DOS MORROS AGRONOMIA BELÉM VELHO BOA VISTA DO SUL CAMAQUÃ CAMPO NOVO CASCATA CAVALHADA CEL. APARICIO BORGES CHAPÉU DO SOL EXTREMA GLÓRIA HÍPICA JARDIM ISABEL LAGEADO LOMBA DO PINHEIRO NONOAI PARTENON PEDRA REDONDA PITINGA PONTA GROSSA RESTINGA SANTA TEREZA SÉTIMO CÉU TERESÓPOLIS TRISTEZA VILA CONCEIÇÃO VILA JOÃO PESSOA VILA NOVA VILA SÃO JOSÉ

---

### Caso #498

**Tags:** bairros, enchentes_2024, areas_risco
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O bairro MÁRIO QUINTANA está classificado como "Bairros com Ocupação Urbana Acima da Cota de Inundação 2024", indicando menor risco de alagamento.

---

### Caso #499

**Tags:** bairros
**Dificuldade:** high
**Versão:** 2

**Conteúdo:**

Os bairros com ZOT 08 e suas subdivisões incluem: - ZOT 08: PRAIA DE BELAS,MENINO DEUS,AZENHA - ZOT 08.1 - A: CENTRO HISTÓRICO - ZOT 08.1 - B: BOM FIM e CENTRO HISTÓRICO - ZOT 08.1 - C: CENTRO HISTÓRICO - ZOT 08.1 - D: CENTRO HISTÓRICO - ZOT 08.1 - E: CENTRO HISTÓRICO - ZOT 08.1 - F: CENTRO HISTÓRICO - ZOT 08.1 - G: CENTRO HISTÓRICO e FARROUPILHA - ZOT 08.2 - A: AUXILIADORA, FLORESTA, INDEPENDÊNCIA, MOINHOS DE VENTO, SÃO GERALDO e SÃO JOÃO - ZOT 08.2 - B: FARRAPOS, HUMAITÁ, NAVEGANTES e SÃO JOÃO - ZOT 08.3 - A: AZENHA, CRISTAL, MENINO DEUS e PRAIA DE BELAS - ZOT 08.3 - B: AZENHA, BOM JESUS, JARDIM BOTÂNICO, JARDIM CARVALHO, JARDIM DO SALSO, MEDIANEIRA, MENINO DEUS, PARTENON, PETRÓPOLIS, PRAIA DE BELAS, SANTA CECÍLIA, SANTANA, SANTO ANTÔNIO, VILA JOÃO PESSOA e VILA SÃO JOSÉ - ZOT 08.3 - C: AUXILIADORA, BELA VISTA, BOA VISTA, BOM JESUS, CHÁCARA DAS PEDRAS, HIGIENÓPOLIS, JARDIM BOTÂNICO, JARDIM CARVALHO, JARDIM DO SALSO, JARDIM EUROPA, JARDIM SABARÁ, MOINHOS DE VENTO, MONTSERRAT, PETRÓPOLIS, RIO BRANCO, SANTA CECÍLIA, SÃO JOÃO, TRÊS FIGUEIRAS e VILA JARDIM

---

### Caso #504

**Tags:** bairros
**Dificuldade:** medium
**Versão:** 2

**Conteúdo:**

Ordenados pelo nome estão na ZOT 13 os seguintes bairros: COSTA E SILVA JARDIM FLORESTA JARDIM ITU JARDIM LEOPOLDINA JARDIM LINDÓIA JARDIM SÃO PEDRO MÁRIO QUINTANA MORRO SANTANA PARQUE SANTA FÉ PASSO DAS PEDRAS RUBEM BERTA SANTA ROSA DE LIMA SÃO SEBASTIÃO SARANDI VILA IPIRANGA VILA JARDIM

---

### Caso #505

**Tags:** bairros
**Dificuldade:** medium
**Versão:** 3

**Conteúdo:**

Ordenados pelo nome estão na ZOT 12 os seguintes bairros: AGRONOMIA AZENHA CEL. APARICIO BORGES CRISTAL CRISTO REDENTOR GLÓRIA JARDIM CARVALHO JARDIM ITU JARDIM LEOPOLDINA JARDIM LINDÓIA JARDIM SABARÁ JARDIM SÃO PEDRO LOMBA DO PINHEIRO MÁRIO QUINTANA MEDIANEIRA MORRO SANTANA NONOAI PARTENON PASSO DA AREIA PASSO DAS PEDRAS SANTA MARIA GORETTI SANTA TEREZA SANTO ANTÔNIO SÃO JOÃO SÃO SEBASTIÃO TERESÓPOLIS VILA IPIRANGA VILA JARDIM

---

### Caso #513

**Tags:** bairros
**Dificuldade:** medium
**Versão:** 2

**Conteúdo:**

Vários bairros possuem tanto a ZOT 14 quanto a ZOT 15, sendo estes: ZOT 14 : ABERTA DOS MORROS AGRONOMIA ARQUIPÉLAGO BELÉM NOVO BELÉM VELHO BOA VISTA DO SUL CAMPO NOVO CASCATA CHAPÉU DO SOL EXTREMA GLÓRIA HÍPICA LAGEADO LAMI LOMBA DO PINHEIRO PITINGA PONTA GROSSA RESTINGA SÃO CAETANO TERESÓPOLIS VILA NOVA ZOT 15: ABERTA DOS MORROS AGRONOMIA ANCHIETA ARQUIPÉLAGO BELÉM NOVO BELÉM VELHO BOA VISTA DO SUL CAMPO NOVO CASCATA CAVALHADA CEL. APARICIO BORGES CHAPÉU DO SOL CRISTAL GLÓRIA GUARUJÁ HÍPICA JARDIM BOTÂNICO JARDIM CARVALHO LAGEADO LAMI LOMBA DO PINHEIRO MÁRIO QUINTANA MORRO SANTANA NONOAI PARTENON PEDRA REDONDA PITINGA PONTA GROSSA RESTINGA RUBEM BERTA SANTA ROSA DE LIMA SANTA TEREZA SARANDI SERRARIA TERESÓPOLIS VILA NOVA VILA SÃO JOSÉ

---

## Coeficiente Aproveitamento

**Total de casos nesta categoria:** 4

### Caso #434

**Tags:** coeficiente_aproveitamento
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Aqui estão as Zonas de Ordenamento Territorial (ZOT) com coeficiente de aproveitamento máximo superior a 4: ZOT 11 , ZOT 08.1 - A, ZOT 06, ZOT 07, ZOT 08, ZOT 08.1 - B, ZOT 08.1 - C, ZOT 08.1 - D, ZOT 08.1 - E, ZOT 08.1 - G, ZOT 08.2, ZOT 08.2 - B, ZOT 08.3 - A, ZOT 08.3 - B, ZOT 08.3 - C, ZOT 12, ZOT 13,

---

### Caso #448

**Tags:** coeficiente_aproveitamento
**Dificuldade:** easy
**Versão:** 2

**Conteúdo:**

Sim, a proposta da revisão do Plano Diretor Urbano Sustentável de Porto Alegre prevê a possibilidade de cobrança de outorga onerosa do direito de construir. O Art. 106 da LUOS 2025 afirma que a outorga onerosa do direito de construir (OODC) é a autorização concedida pelo Município para utilização de potencial construtivo adicional além do coeficiente de aproveitamento básico do lote, até o limite do coeficiente de aproveitamento máximo, mediante contrapartida definida nesta Lei Complementar. - 1º A OODC observará os objetivos estabelecidos no Plano Diretor. - 2º A OODC poderá ser aplicada em todo o perímetro urbano, observados os padrões e restrições de adensamento fixados para cada Zona de Ordenamento Territorial, nos termos desta Lei Complementar. A outorga onerosa é um instrumento previsto pelo Estatuto da Cidade (Lei Federal nº 10.257/2001), que permite ao município cobrar do proprietário ou empreendedor uma contrapartida financeira quando deseja construir acima do coeficiente de aproveitamento básico definido para a sua área, dentro dos limites estabelecidos pela legislação municipal. O texto preliminar do Plano Diretor destaca, entre seus princípios e diretrizes, a recuperação dos investimentos públicos que tenham resultado na valorização de imóveis urbanos e a distribuição equitativa dos benefícios e ônus decorrentes do processo de urbanização. Esses são fundamentos para aplicação de instrumentos como a outorga onerosa do direito de construir, como parte das formas de financiamento do desenvolvimento urbano sustentável e para promover justiça urbana. Os detalhes sobre o cálculo, a aplicação e as exceções da outorga onerosa serão definidos na regulamentação específica, que normalmente é detalhada na Lei de Uso e Ocupação do Solo (LUOS) e em decretos posteriores. Portanto: Sim, a proposta prevê o uso da outorga onerosa como instrumento para o financiamento urbano e distribuição de benefícios e ônus do desenvolvimento, conforme diretrizes do Plano Diretor Urbano Sustentável de Porto Alegre. Como ficam as contrapartidas dos Empreendimentos no Plano Diretor: As contrapartidas dos empreendimentos no novo Plano Diretor de Porto Alegre são regulamentadas por diversos instrumentos urbanísticos, com critérios claros e foco na qualificação do território. A Outorga Onerosa do Direito de Construir exige pagamento proporcional ao potencial construtivo adicional utilizado, com possibilidade de contrapartidas financeiras ou em obras, serviços e doação de áreas ou imóveis, vinculadas ao Fundo Municipal de Gestão do Território (FMGT) e ao Fundo Municipal de Habitação de Interesse Social (FMHIS). No parcelamento do solo, é possível a conversão da obrigação de destinação de área pública, mediante transferência de terrenos urbanizados ou não, execução de obras ou pagamento pecuniário, conforme viabilidade e interesse público, com formalização por Termo de Conversão de Área Pública. Também há previsão de compensação por Transferência do Direito de Construir (TDC) quando exigências urbanísticas ultrapassarem os limites máximos estabelecidos para a ZOT. As Operações Urbanas Consorciadas preveem contrapartidas específicas, como recursos financeiros, imóveis, execução de obras ou produção de habitação de interesse social, definidas por lei para cada operação. Já o Estudo de Impacto de Vizinhança (EIV) exige medidas mitigadoras e compensatórias proporcionais aos impactos diagnosticados, como condição para aprovação do empreendimento. Esses instrumentos asseguram que os benefícios gerados pelas transformações urbanas retornem em melhorias para a coletividade.

---

### Caso #473

**Tags:** coeficiente_aproveitamento
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Os principais índices do regime urbanístico do bairro Três Figueiras em Porto Alegre são os seguintes: - ZOT 08.3 - C: Coeficiente de aproveitamento básico (CA básico) de 3.6, coeficiente de aproveitamento máximo (CA máximo) de 7.5 e altura máxima de 90.0 metros. - ZOT 04: Coeficiente de aproveitamento básico (CA básico) de 2.0, coeficiente de aproveitamento máximo (CA máximo) de 4.0 e altura máxima de 18.0 metros. - ZOT 07: Coeficiente de aproveitamento básico (CA básico) de 3.6, coeficiente de aproveitamento máximo (CA máximo) de 6.5 e altura máxima de 60.0 metros. Resuma o regime urbanístico do três figueiras. Os principais índices do regime urbanístico do bairro Três Figueiras em Porto Alegre são os seguintes: - ZOT 08.3 - C: Coeficiente de aproveitamento básico (CA básico) de 3.6, coeficiente de aproveitamento máximo (CA máximo) de 7.5 e altura máxima de 90.0 metros. - ZOT 04: Coeficiente de aproveitamento básico (CA básico) de 2.0, coeficiente de aproveitamento máximo (CA máximo) de 4.0 e altura máxima de 18.0 metros. - ZOT 07: Coeficiente de aproveitamento básico (CA básico) de 3.6, coeficiente de aproveitamento máximo (CA máximo) de 6.5 e altura máxima de 60.0 metros. Qual é o potencial construtivo do três figueiras. Com base nos dados encontrados para o bairro Três Figueiras em Porto Alegre, o potencial construtivo varia de acordo com a zona de ocupação do local. Seguem as informações encontradas: 1.ZOT 08.3 - C: Coeficiente de aproveitamento básico (CA básico) de 3.6, coeficiente de aproveitamento máximo (CA máximo) de 7.5 e altura máxima de 90.0 metros. 1.ZOT 04: Coeficiente de aproveitamento básico (CA básico) de 2.0, coeficiente de aproveitamento máximo (CA máximo) de 4.0 e altura máxima de 18.0 metros. 1.ZOT 07: Coeficiente de aproveitamento básico (CA básico) de 3.6, coeficiente de aproveitamento máximo (CA máximo) de 6.5 e altura máxima de 60.0 metros. Esses dados indicam o potencial de construção permitido em cada zona do bairro Três Figueiras. Recomenda-se verificar junto à Prefeitura de Porto Alegre para mais informações específicas sobre o potencial construtivo do local. Três figueiras. Os dados fornecidos referem-se a algumas zonas do Plano Diretor de Porto Alegre. Cada zona possui especificações quanto ao Coeficiente de Aproveitamento Básico (CA básico), Coeficiente de Aproveitamento Máximo (CA máximo) e Altura Máxima permitida para construções. Para a zona "ZOT 08.3 - C", os valores são: - Coeficiente de Aproveitamento Básico (CA básico): 3.6 - Coeficiente de Aproveitamento Máximo (CA máximo): 7.5 - Altura Máxima permitida: 90.0 metros Para a zona "ZOT 04", os valores são: - Coeficiente de Aproveitamento Básico (CA básico): 2.0 - Coeficiente de Aproveitamento Máximo (CA máximo): 4.0 - Altura Máxima permitida: 18.0 metros Para a zona "ZOT 07", os valores são: - Coeficiente de Aproveitamento Básico (CA básico): 3.6 - Coeficiente de Aproveitamento Máximo (CA máximo): 6.5 - Altura Máxima permitida: 60.0 metros Essas informações são importantes para orientar o planejamento urbano e o uso do solo em Porto Alegre, visando o desenvolvimento sustentável da cidade. Descreva as zonas do três figueiras. As zonas do Três Figueiras encontradas nos dados são as seguintes: 1. ZOT 08.3 - C - Coeficiente de aproveitamento básico: 3.6 - Coeficiente de aproveitamento máximo: 7.5 - Altura máxima: 90.0 metros 2. ZOT 04 - Coeficiente de aproveitamento básico: 2.0 - Coeficiente de aproveitamento máximo: 4.0 - Altura máxima: 18.0 metros 3. ZOT 07 - Coeficiente de aproveitamento básico: 3.6 - Coeficiente de aproveitamento máximo: 6.5 - Altura máxima: 60.0 metros Essas informações são importantes para orientar o uso e ocupação do solo dentro das zonas do bairro Três Figueiras, de acordo com o Plano Diretor de Porto Alegre.

---

### Caso #476

**Tags:** coeficiente_aproveitamento
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O índice de aproveitamento médio do bairro Cristal é de 3.3125. Esse valor pode variar de acordo com a zona e as diretrizes específicas de cada área. No entanto, com base nos dados fornecidos, o índice de aproveitamento varia de 2.0 a 7.5, dependendo da zona, com alturas máximas variando de 9.0 a 130.0 metros.

---

## Conceitual

**Total de casos nesta categoria:** 27

### Caso #410

**Tags:** conceitual
**Dificuldade:** medium
**Versão:** 2

**Conteúdo:**

O Plano Diretor propõe transformar o Guaíba em protagonista da vida urbana. Isso significa fomentar atividades náuticas, culturais e de lazer ao longo da orla, conectar os bairros ao lago com infraestrutura acessível e integrar o Guaíba aos sistemas de mobilidade, cultura e meio ambiente da cidade. Em vez de ser apenas paisagem, o Guaíba passa a ser espaço de convivência, turismo, transporte e valorização das comunidades que vivem em suas margens.

---

### Caso #411

**Tags:** conceitual
**Dificuldade:** medium
**Versão:** 2

**Conteúdo:**

O novo Plano Diretor reorganiza o crescimento da cidade para aproximar moradia, trabalho e serviços. Ele permite mais habitação nos lugares com transporte coletivo e infraestrutura urbana, como corredores de ônibus e áreas com muitos empregos. Além disso, valoriza o uso misto do solo e propõe redes de centralidades mais bem conectadas, tudo isso para facilitar o dia a dia de quem vive longe de onde precisa estar.

---

### Caso #412

**Tags:** conceitual
**Dificuldade:** high
**Versão:** 2

**Conteúdo:**

Sim. O plano incentiva que mais pessoas morem perto de onde trabalham, estudam e usam serviços, reduzindo a necessidade de grandes deslocamentos. Ao promover o uso misto do solo e concentrar o adensamento nas áreas com melhor infraestrutura, o plano favorece trajetos mais curtos, fortalece o transporte coletivo e estimula modos ativos, como caminhar e pedalar. Isso também ajuda a reduzir a poluição: segundo o Plano de Ação Climática de Porto Alegre, o transporte por automóvel é o principal responsável pelas emissões de gases de efeito estufa na cidade.

---

### Caso #413

**Tags:** conceitual
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O Plano Diretor facilita a construção de mais moradias em áreas bem localizadas, próximas ao transporte coletivo e aos empregos. Ele estimula o uso de terrenos ociosos, permite diferentes tipos de moradia, incentiva reformas de prédios existentes e simplifica as regras urbanísticas. Com mais oferta onde a cidade já tem infraestrutura, o custo por moradia tende a cair --- e morar bem se torna mais acessível para mais gente.

---

### Caso #415

**Tags:** conceitual
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Nas áreas com melhor infraestrutura urbana e transporte coletivo, como os corredores de ônibus, centros de bairro e zonas mais consolidadas da cidade. O novo Plano Diretor permite mais unidades habitacionais nesses locais e incentiva o uso de terrenos vazios ou subutilizados. Isso aproxima as pessoas dos serviços e empregos, reduz os custos com transporte e aumenta a oferta de moradia onde já é possível viver com qualidade.

---

### Caso #416

**Tags:** conceitual
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O Plano Diretor propõe transformar a forma como a cidade lida com o clima extremo. Em vez de afastar a população das áreas vulneráveis, o plano organiza o território com foco na adaptação --- fortalecendo a drenagem urbana, valorizando soluções baseadas na natureza e conectando áreas verdes para formar redes ecológicas. Áreas expostas a alagamentos passam a ser priorizadas para investimentos públicos, com infraestrutura segura e resiliência ambiental. É uma nova forma de planejar: reconhecendo os riscos, mas sem abandonar quem mais precisa de proteção.

---

### Caso #417

**Tags:** conceitual
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Sim. O plano estimula que mais pessoas morem perto do transporte coletivo e dos empregos, o que reduz o uso do carro --- hoje o principal responsável pelas emissões em Porto Alegre, segundo o Plano de Ação Climática. Além disso, ele promove o uso misto do solo, valoriza a mobilidade ativa (como caminhar e pedalar) e protege áreas verdes, que ajudam a regular o clima. É um passo importante para tornar a cidade mais sustentável e justa com o meio ambiente.

---

### Caso #418

**Tags:** conceitual
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O novo Plano Diretor organiza o crescimento da cidade com mais clareza e previsibilidade. Isso dá mais segurança para quem quer investir, empreender ou construir. O plano também fortalece o papel do planejamento urbano como motor da economia, conectando as decisões sobre o uso do solo à infraestrutura, ao orçamento público e às oportunidades de financiamento. Com regras mais simples, uso mais eficiente do território e visão de longo prazo, a cidade se torna mais preparada para receber projetos que geram emprego, renda e qualidade de vida.

---

### Caso #419

**Tags:** conceitual
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O novo Plano Diretor cria o CIT -- Centro de Inteligência Territorial --, uma estrutura permanente que integra dados, mapas e indicadores para entender como a cidade está mudando. Ele permite que o planejamento urbano seja feito com base em evidências técnicas, ajudando a Prefeitura a tomar decisões mais rápidas, inteligentes e transparentes. Isso significa mais capacidade de resposta diante das transformações da cidade --- e mais eficiência no uso dos recursos públicos.

---

### Caso #420

**Tags:** conceitual
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O novo Plano Diretor fortalece o sistema de gestão urbana para garantir que os recursos arrecadados com instrumentos como a Outorga Onerosa --- novo nome do solo criado --- sejam usados com inteligência. Esses valores passam a ser direcionados de forma estratégica para melhorar a infraestrutura da cidade, qualificar os bairros e ampliar o acesso à moradia digna. A aplicação dos recursos será orientada por dados e prioridades territoriais, assegurando que o crescimento urbano traga retorno real para toda a população.

---

### Caso #428

**Tags:** conceitual
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Sim. O novo plano cria o Centro de Inteligência Territorial (CIT), que vai monitorar os dados do território em tempo real. Ele acompanha indicadores urbanos, avalia o impacto das políticas e orienta revisões futuras com base em evidências. Cada indicador será publicado com série histórica, metodologia e base geográfica, garantindo transparência e controle público. Isso marca uma ruptura com modelos anteriores de planejamento sem monitoramento efetivo.

---

### Caso #429

**Tags:** conceitual
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O novo Plano Diretor de Porto Alegre propõe uma série de mudanças estruturais e estratégicas em relação ao plano vigente. A seguir, destaco os principais pontos de mudança: Organização do Plano: Criação de Sistemas Territoriais (Urbano, Ecológico, Socioeconômico e de Gestão) para integrar políticas setoriais e qualificar a aplicação das normas urbanísticas. Nova Estrutura de Zoneamento: substituição das zonas de uso anteriores por 16 Zonas de Ordenamento Territorial (ZOTs) com diretrizes e parâmetros mais claros. Parâmetros Urbanísticos: Alturas máximas e coeficientes de aproveitamento definidos por ZOT, com estímulo ao adensamento de áreas com maior disponibilidade de infraestrutura e acesso a equipamentos públicos e serviços urbanos. Criação da taxa de permeabilidade, possibilitante o aumento da permeabilidade do solo e adaptando o território as mudanças climáticas. Uso do solo mais flexível: incentivo à mistura de usos, especialmente em áreas com maior infraestrutura. Estratégia de Adensamento: Definição de Áreas Estratégicas para Adensamento com base na infraestrutura instalada (transporte, saneamento, equipamentos). Integração entre forma urbana e função social da cidade, com foco em ampliar acesso à moradia e oportunidades. Instrumentos de Planejamento e Gestão: Atualização de instrumentos como Outorga Onerosa e parcelamento. Inclusão de instrumentos como EIV e incentivos à reabilitação urbana. Sustentabilidade e Resiliência: Integração de aspectos ambientais no zoneamento: limites para áreas sensíveis, conexão com o sistema ecológico. Indicação de bairros prioritários para adaptação climática. Implementação e Monitoramento: Proposta de Centro de Inteligência Territorial para apoiar a implementação, monitoramento e revisão do plano. Criação de indicadores de acompanhamento e metas relacionadas a mobilidade, habitação, infraestrutura, meio ambiente e economia.

---

### Caso #430

**Tags:** conceitual, areas_risco
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O Plano Diretor Urbano Sustentável de Porto Alegre trata as áreas de risco com enfoque na resiliência urbana e adaptação às mudanças climáticas, integrando estratégias de prevenção, recuperação e mitigação dos riscos ambientais, especialmente em relação a enchentes, deslizamentos e ocupações em áreas suscetíveis a desastres naturais. Principais pontos sobre áreas de risco: O Plano Diretor define como objetivo a adaptação da cidade aos efeitos das mudanças climáticas, incluindo a implantação de sistemas de monitoramento e alerta de eventos extremos, o fortalecimento da infraestrutura urbana adaptativa e a incorporação da gestão de riscos climáticos ao planejamento urbano e aos instrumentos de regulação territorial. Prevê a elaboração de um plano de ação para a recuperação das áreas de risco e para a mitigação de riscos nas áreas passíveis de ocupação, de forma integrada com as políticas de habitação. Define as Áreas de Risco e Vulnerabilidade Ambiental (ARVA) como zonas suscetíveis a desastres naturais, como enchentes e deslizamentos, ou a impactos antrópicos, como poluição. Nessas áreas, são estabelecidas restrições de ocupação e necessidade de intervenções para mitigação dos riscos. O Plano também aponta a necessidade de estabelecer incentivos e normas para aumentar a resiliência das edificações e espaços urbanos, como o uso de infraestruturas verdes, áreas permeáveis e corredores ecológicos. A Lei de Uso e Ocupação do Solo (LUOS), que regulamenta o Plano Diretor, veda o parcelamento e a edificação em terrenos alagadiços ou sujeitos a inundações, em áreas com declividade acentuada (igual ou superior a 30%) ou em terrenos cuja condição geológica não seja compatível com a edificação, salvo se forem atendidas exigências técnicas específicas. Também há restrições para edificações em áreas de preservação permanente, salvo exceções previstas em lei. Exige-se, em áreas estratégicas para drenagem urbana, a construção de reservatórios de retenção de águas pluviais, dependendo do tipo de edificação. Em resumo: O Plano Diretor propõe um tratamento preventivo e regulatório das áreas de risco, priorizando a segurança, a resiliência e a adaptação climática. As intervenções são pautadas por critérios técnicos, com restrições ao uso e ocupação do solo em áreas vulneráveis e integração das ações urbanísticas às políticas ambientais e habitacionais. Esses parâmetros fazem parte da proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre.

---

### Caso #432

**Tags:** conceitual
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O PDUS é a lei que orienta o desenvolvimento urbano de Porto Alegre. Ele define as estratégias para o uso e a ocupação do solo, organização do território, infraestrutura, mobilidade, proteção ambiental, habitação e desenvolvimento econômico. A proposta atual está sendo revisada com foco em sustentabilidade, qualificação dos espaços públicos e adaptação às mudanças climáticas.

---

### Caso #437

**Tags:** conceitual, regularizacao
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O plano: Define procedimentos específicos de licenciamento e regularização de edificações e assentamentos consolidados; Cria Áreas de Requalificação Urbana, com prioridade de investimento em infraestrutura, serviços e habitação; Estabelece políticas contínuas de regularização fundiária integrada, com foco na permanência das famílias, salvo em áreas de risco ou em casos de requalificação necessária; Cria incentivos específicos para parcelamento e uso do solo voltados à regularização.

---

### Caso #439

**Tags:** conceitual
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O Sistema Ecológico é um dos quatro sistemas estruturantes do território definidos pelo novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre. Ele organiza e integra os elementos ambientais da cidade --- como áreas de preservação permanente (APPs), morros, matas, banhados, arroios, várzeas e áreas permeáveis --- com o objetivo de proteger os recursos naturais, conter riscos e fortalecer a resiliência urbana frente às mudanças climáticas. Esse sistema trata o meio ambiente como infraestrutura urbana essencial, e não apenas como área de restrição. Ele orienta o ordenamento territorial e a ocupação do solo, articulando a preservação ambiental com a qualidade de vida urbana, a partir de diretrizes que incentivam a renaturalização de cursos d'água, a recuperação de áreas degradadas, a ampliação da permeabilidade e a criação de corredores ecológicos. Ao estruturar o território com base nos seus atributos ambientais, o Sistema Ecológico contribui para um modelo de cidade mais sustentável, segura e adaptada às condições climáticas extremas.

---

### Caso #440

**Tags:** conceitual, enchentes_2024
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Sim. O novo Plano Diretor Urbano Sustentável (PDUS) incorpora as enchentes de 2024 como elemento central de sua estratégia de adaptação climática e gestão de riscos. O evento reforçou a urgência de reestruturar a relação da cidade com seus sistemas naturais, especialmente os arroios e áreas de várzea, motivando a adoção de medidas mais rígidas de prevenção e resiliência. Entre as principais ações previstas estão: a criação do Sistema Ecológico, que valoriza áreas de preservação e corredores de biodiversidade; a exigência de cotas mínimas de proteção contra cheias para novas edificações e obras públicas; a ampliação da permeabilidade urbana; e a priorização de soluções baseadas na natureza para drenagem e contenção de riscos. Essas diretrizes consolidam uma mudança de paradigma no planejamento urbano, colocando a gestão ambiental e climática como parte integrante da estrutura territorial da cidade.

---

### Caso #441

**Tags:** conceitual
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O Sistema de Espaços Abertos é um dos quatro sistemas estruturantes do território no novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre. Ele organiza os espaços públicos não edificados --- como praças, parques, largos, calçadas amplas, áreas verdes e espaços de lazer --- reconhecendo-os como infraestrutura urbana essencial para a convivência, a mobilidade ativa, o bem-estar e a identidade da cidade. Esses espaços são aquilo que o cidadão percebe como o rosto público da cidade, essenciais para a vida urbana cotidiana. O sistema busca promover continuidade, acessibilidade e integração entre os espaços públicos, articulando-os à paisagem, à estrutura ecológica e aos equipamentos urbanos. Também valoriza as Áreas de Interesse Cultural (AIC), que incluem territórios com relevância simbólica, histórica e social --- entre eles, espaços vinculados a povos tradicionais, cuja relação com o entorno urbano deve ser qualificada e respeitada. Dessa forma, o Sistema de Espaços Abertos fortalece os vínculos entre espaço público, memória e pertencimento.

---

### Caso #442

**Tags:** conceitual
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O Sistema de Estrutura e Infraestrutura é um dos quatro sistemas estruturantes do território no novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre. Ele organiza os elementos físicos que estruturam o funcionamento da cidade e sustentam seu desenvolvimento, incluindo a mobilidade urbana, os equipamentos urbanos e comunitários (como escolas, postos de saúde, centros culturais), as redes de infraestrutura técnica (abastecimento, saneamento, energia, comunicação) e os sistemas de proteção contra cheias e drenagem. Esse sistema orienta a ocupação do solo com base na capacidade instalada de atendimento à população, promovendo a integração entre moradia, transporte e serviços públicos. Também qualifica os territórios a partir da lógica da infraestrutura social e ambiental, priorizando o adensamento em áreas com boa oferta de equipamentos e redes, e induzindo investimentos onde há déficit. Com isso, o sistema busca garantir eficiência urbana, reduzir desigualdades territoriais e aumentar a resiliência da cidade frente a eventos climáticos extremos.

---

### Caso #443

**Tags:** conceitual
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O Sistema Socioeconômico é um dos quatro sistemas estruturantes do território no novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre. Ele organiza as atividades econômicas, sociais e produtivas da cidade, articulando o uso do solo à geração de empregos, à oferta de serviços, ao comércio, à inovação e às dinâmicas culturais e comunitárias. Esse sistema se articula diretamente com as Áreas Estruturadoras do PDUS, que são porções do território com alto potencial de transformação urbana e relevância estratégica para o desenvolvimento sustentável da cidade. Ao integrar as diretrizes do Sistema Socioeconômico a essas áreas --- como o Centro Histórico, o 4º Distrito, os eixos de transporte coletivo e os corredores de centralidades --- o plano orienta a aplicação de incentivos urbanísticos e o direcionamento de investimentos públicos, promovendo adensamento qualificado, aproveitamento da infraestrutura existente e integração entre moradia e emprego. O sistema também contempla as Áreas de Requalificação Urbana (ARU) como territórios prioritários, por combinarem déficit urbano com localização estratégica próxima a centralidades e áreas de emprego. Com isso, o Sistema Socioeconômico apoia decisões estruturantes de desenvolvimento econômico e territorial, ampliando oportunidades e promovendo uma ocupação urbana mais equilibrada, inclusiva e eficiente.

---

### Caso #445

**Tags:** conceitual
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O Sistema de Gestão, Controle, Planejamento e Financiamento Urbano (SGC) é o núcleo institucional responsável por garantir a implementação efetiva do Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre. Ele articula, coordena e monitora o conjunto de ações necessárias para transformar as diretrizes do plano em resultados concretos no território. Entre suas funções estratégicas estão: a coordenação integrada da política urbana, a atualização periódica do PDUS, da LUOS e dos planos urbanísticos, e a execução de planos locais, planos de pormenor e projetos urbanos prioritários, com foco especial nas Áreas Estruturadoras e nas intervenções de requalificação urbana. O sistema também atua na aplicação dos instrumentos de desenvolvimento urbano previstos no plano, como outorga onerosa, operações urbanas consorciadas, reparcelamento, regularização fundiária e transferência do direito de construir. Além disso, o SGC realiza o monitoramento contínuo do território, com base em indicadores de desempenho urbano, subsidiando decisões técnicas, revisões normativas e a alocação de recursos. Ele é o elo entre planejamento, gestão, financiamento e participação social, apoiando a implementação de projetos urbanos integrados e sustentáveis, com foco na qualificação do espaço público, na eficiência territorial e na promoção do desenvolvimento equilibrado da cidade.

---

### Caso #456

**Tags:** conceitual
**Dificuldade:** high
**Versão:** 2

**Conteúdo:**

No Art. 90 da LUOS o Estudo de Impacto de Vizinhança (EIV) é considerado como instrumento urbanístico destinado a avaliar os efeitos positivos e negativos de empreendimentos ou atividades sobre a qualidade de vida urbana, a infraestrutura urbana e o entorno imediato, visando compatibilizá-los com as condições da vizinhança consolidada, sendo exigido nos casos definidos no Anexo 7 desta Lei Complementar. Parágrafo único: O Estudo de Impacto de Vizinhança será exigido para as atividades e tipologias previstos no Anexo 7, e deverá ser requerido previamente à análise do projeto arquitetônico ou do projeto de parcelamento do solo, conforme o caso.

---

### Caso #460

**Tags:** conceitual
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Sim, houve participação social ativa e estruturada em várias etapas na construção da proposta de revisão do Plano Diretor Urbano Sustentável de Porto Alegre. A participação social é um dos princípios fundamentais do novo Plano Diretor e está prevista tanto no texto da minuta quanto na prática, com o envolvimento da população, de entidades da sociedade civil, setores produtivos e do poder público. A participação foi estruturada em várias etapas, incluindo: Oficinas territoriais e temáticas Audiências públicas Escutas setoriais Reuniões no CMDUA (Conselho Municipal de Desenvolvimento Urbano Ambiental) Canais digitais de consulta e participação Alguns números da participação social até o momento incluem: 9 Oficinas Territoriais 15 Exposições Interativas 2 Seminários 2 Conferências 7 Oficinas Temáticas 24 Devolutivas 4 Consultas Públicas 184 Reuniões 30 Reuniões do CMDUA Diversas visitas a entidades Um debate que se estende desde 2019 Além disso, o novo plano propõe governança permanente da política urbana, criando novos pilares institucionais: Centro de Inteligência Territorial (CIT) CMDUA fortalecido SGC -- Sistema de Gestão, Controle e Planejamento Dessa forma, a participação social não termina com a aprovação da lei. Ela passa a ser contínua, auditável e baseada em dados públicos, consolidando um modelo de gestão urbana democrático e transparente. Como previsto na minuta do plano: "A participação social e comunitária na formulação e implementação das políticas urbanas se dará por meio de consultas públicas, audiências e demais instrumentos de participação, incluindo a atuação no Conselho Municipal de Desenvolvimento Urbano Ambiental." Você pode contribuir e acompanhar todo o processo pelo canal oficial: Participe da construção do Plano Diretor

---

### Caso #463

**Tags:** conceitual
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O novo Plano Diretor Urbano Sustentável (PDUS 2025) de Porto Alegre propõe um enfoque na gestão do espaço urbano, incluindo a possibilidade de segmentar o planejamento em planos de pormenor e planos parciais. Isso visa adaptar as diretrizes urbanísticas às especificidades de áreas e bairros, promovendo um desenvolvimento mais sustentável e integrado. Como Funciona o Modelo do PDUS Planos de Pormenor: São instrumentos que detalham aspectos específicos de determinadas áreas, permitindo um planejamento mais preciso e adaptado às necessidades locais. Eles podem incluir diretrizes sobre uso do solo, infraestrutura e serviços urbanos. Planos Parciais: Permitem uma abordagem mais flexível e segmentada, abordando áreas que requerem atenção especial e que podem ter características distintas em relação ao restante do município. Esses planos podem tratar de aspectos como mobilidade, paisagem e uso do solo de forma mais focada. Importância do detalhamento de escalas intermediárias Adaptação Local: Contribui para que as políticas urbanas sejam mais adequadas às realidades específicas de cada região. Participação Cidadã: Facilita a inclusão da comunidade nas discussões sobre o desenvolvimento de suas áreas. Sustentabilidade: Promove um uso mais eficiente dos recursos e planejamento integrado, favorecendo um crescimento urbano que respeite o meio ambiente. Variações por ZOT e Bairro Os parâmetros urbanísticos, como altura máxima de edificações e coeficientes de aproveitamento, variam conforme a Zona de Ordenamento Territorial (ZOT) e o bairro específico. Para obter informações detalhadas sobre o que pode ser construído em uma área específica, recomenda-se consultar o mapa interativo ou fornecer o nome do bairro desejado.

---

### Caso #464

**Tags:** conceitual
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O Plano Diretor Urbano Sustentável de Porto Alegre, conforme sua proposta de revisão, não tem como objetivo promover a gentrificação, mas sim enfrentar desigualdades históricas e promover inclusão social e espacial. Os princípios e objetivos definidos no documento buscam garantir acesso equitativo à cidade, reduzir o custo da moradia, incentivar a habitação em áreas com infraestrutura, e promover justiça espacial, sempre com foco na população vulnerável e no combate à segregação social.

---

### Caso #465

**Tags:** conceitual
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Gentrificação ocorre quando a requalificação de áreas urbanas leva ao aumento dos preços e à substituição da população original (geralmente de baixa renda) por moradores de maior poder aquisitivo. É um processo não desejado pelas políticas de inclusão social e habitacional.

---

### Caso #466

**Tags:** conceitual
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Um dos objetivos centrais é reduzir o custo da moradia e garantir o acesso de todos à cidade. Estimula a inclusão social e territorial, especialmente de quem está em situação de vulnerabilidade ou precariedade habitacional. Defende o uso de instrumentos urbanísticos para garantir moradia em áreas com infraestrutura e acesso ao emprego, além de incentivar a ocupação de imóveis ociosos e a regularização fundiária. Valoriza a participação social e a proteção de comunidades tradicionais e modos de vida locais.

---

## Geral

**Total de casos nesta categoria:** 28

### Caso #409

**Tags:** geral, espaco_publico
**Dificuldade:** high
**Versão:** 2

**Conteúdo:**

Pela primeira vez, o Plano Diretor propõe uma estrutura permanente e integrada para planejar, coordenar e qualificar os espaços públicos da cidade. Isso significa que, em vez de cada secretaria atuar isoladamente, haverá uma instância dedicada à compatibilização de projetos, à solução de conflitos e à valorização do espaço público com o mesmo nível de atenção técnica que hoje é dedicado ao setor privado. A gestão passa a ser mais estratégica, garantindo que obras e investimentos públicos estejam bem articulados entre si --- com mais eficiência e foco nas pessoas.

---

### Caso #421

**Tags:** geral
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Não. O Plano Diretor parte da lógica de que a cidade deve funcionar para todos, e isso exige que o mercado urbano esteja regulado com clareza, justiça e previsibilidade. A revisão não retira direitos sociais --- ao contrário, amplia instrumentos como a Outorga Onerosa (solo criado) para gerar recursos para habitação, infraestrutura e espaços públicos. Além disso, o plano propõe a organização do território em sistemas que garantam equilíbrio entre adensamento, proteção ambiental e acesso à cidade para todas as classes sociais.

---

### Caso #422

**Tags:** geral
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

A participação foi estruturada em várias etapas: oficinas, audiências públicas, escutas setoriais, reuniões no CMDUA e canais digitais. Alguns números da participação social até o momento incluem: 9 Oficinas Territoriais, 15 Exposições Interativas, 2 Seminários, 2 Conferências, 7 Oficinas Temáticas, 24 Devolutivas, 4 Consultas Públicas, 184 Reuniões e 30 Reuniões do CMDUA e diversas visitas à entidades. Um debate que se estende desde 2019. O novo plano ainda propõe uma governança permanente da política urbana, com o Centro de Inteligência Territorial (CIT), o CMDUA fortalecido e o SGC (Sistema de Gestão, Controle e Planejamento) como pilares institucionais. Isso garante que a participação não acabe com a aprovação da lei --- ela passa a ser contínua, auditável e com base em dados públicos.

---

### Caso #444

**Tags:** geral
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O CMDUA -- Conselho Municipal de Desenvolvimento Urbano e Ambiental tem um papel central no novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre como instância de gestão democrática da política urbana. Ele atua na formulação, acompanhamento, fiscalização e avaliação da implementação do plano, contribuindo para assegurar a efetividade das diretrizes e instrumentos definidos. O CMDUA será responsável por deliberar sobre temas estratégicos, como a aplicação de instrumentos urbanísticos, a definição de áreas prioritárias, a aprovação de planos locais e planos de pormenor, e a análise de propostas de alteração da legislação urbanística. Também participa do processo de monitoramento permanente do plano, contribuindo com a leitura técnica e social do território, a partir da representação da sociedade civil e do poder público. Com isso, o CMDUA consolida-se como espaço de participação institucionalizada e qualificada, essencial para garantir a transparência, o controle social e a continuidade da política urbana estabelecida pelo PDUS.

---

### Caso #450

**Tags:** geral
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Exatamente, sua percepção está correta! Na proposta de revisão da Lei de Uso e Ocupação do Solo (LUOS) de Porto Alegre, NÃO existe mais o parâmetro de "taxa de ocupação" para as edificações nos terrenos.

---

### Caso #451

**Tags:** geral
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

A taxa de ocupação, que limitava a porcentagem do terreno que podia ser coberta pela edificação, foi retirada dos parâmetros urbanísticos no novo modelo. Os principais parâmetros agora são: altura máxima, coeficiente de aproveitamento e taxa de permeabilidade do solo (esta última, sim, está prevista para garantir áreas livres e permeáveis, especialmente em terrenos maiores). O controle sobre o adensamento e o volume construído se dá principalmente pelo coeficiente de aproveitamento e os recuos obrigatórios, variando conforme a ZOT (Zona de Ordenamento Territorial).

---

### Caso #452

**Tags:** geral
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

A exclusão da taxa de ocupação visa simplificar e modernizar a legislação urbanística, focando em parâmetros mais flexíveis e adaptados à realidade contemporânea das cidades, sem comprometer o controle urbanístico essencial. Essas diretrizes fazem parte da proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre. Se quiser saber os parâmetros urbanísticos exatos (altura, coeficiente de aproveitamento, taxa de permeabilidade) de algum bairro, basta informar o nome!

---

### Caso #453

**Tags:** geral
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

A audiência pública do Plano Diretor será realizada no dia 09 de agosto de 2025 (sábado), às 9h, no Auditório Araújo Vianna, localizado no Parque Farroupilha, nº 685. Participe!

---

### Caso #455

**Tags:** geral
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O novo Plano Diretor Urbano Sustentável (PDUS) de Porto Alegre não prevê o Estudo de Viabilidade Urbanística (EVU) como instrumento, mas sim o Estudo de Impacto de Vizinhança (EIV), que passa a ser o principal mecanismo para avaliação prévia dos impactos urbanos dos empreendimentos.

---

### Caso #458

**Tags:** geral
**Dificuldade:** high
**Versão:** 2

**Conteúdo:**

A proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre não utiliza mais a taxa de ocupação como parâmetro urbanístico. Na nova proposta, o foco dos parâmetros urbanísticos está na altura máxima, coeficiente de aproveitamento (ou seja, quanto pode ser construído em relação à área do terreno), e taxa de permeabilidade (solo livre e áreas verdes). A taxa de ocupação, tradicionalmente usada para limitar o quanto do terreno pode ser coberto por edificações no térreo, foi retirada dos novos regramentos. Resumo: Taxa de ocupação: Não é mais utilizada na proposta revisada. Taxa de permeabilidade: Continua como parâmetro obrigatório, determinando o mínimo de solo livre para infiltração de água. Outros parâmetros de controle: altura máxima, coeficiente de aproveitamento e, em alguns casos, área mínima de terreno. Por quê? A retirada da taxa de ocupação visa dar mais flexibilidade para a implantação dos projetos, incentivando formas construtivas mais adequadas à cidade compacta, sustentabilidade e soluções inovadoras, desde que respeitada a permeabilidade, altura e coeficiente estabelecidos para cada ZOT. Esses parâmetros fazem parte da proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre. Se precisar de explicação sobre outro parâmetro ou quiser saber os valores de taxa de permeabilidade do seu bairro, me informe o nome do bairro que faço a consulta!

---

### Caso #459

**Tags:** geral
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O Plano Diretor Urbano Sustentável (PDUS) e a Lei de Uso e Ocupação do Solo (LUOS) de Porto Alegre incentiva construções sustentáveis através de várias diretrizes. Uma das principais iniciativas é a concessão de acréscimos nos limites de altura para projetos que obtêm Certificação em Sustentabilidade Ambiental. Isso significa que, ao adotar práticas sustentáveis em seus empreendimentos, os construtores podem ter a oportunidade de construir em maior altura do que o permitido normalmente. Além disso, os empreendimentos são orientados a considerar aspectos ambientais e de sustentabilidade em seus projetos, refletindo uma preocupação com o desenvolvimento sustentável e a qualidade de vida dos cidadãos. É importante ressaltar que os parâmetros de construção, como altura máxima, coeficientes de aproveitamento e outros regulamentos, podem variar de acordo com a Zona de Ordenamento Territorial (ZOT) e o bairro específico. Para obter informações detalhadas sobre as regras construtivas em uma área específica, recomendo consultar o mapa interativo do PDUS ou informar o bairro de interesse.

---

### Caso #462

**Tags:** geral
**Dificuldade:** easy
**Versão:** 2

**Conteúdo:**

De acordo com a proposta da nova Lei de Uso e Ocupação do Solo de Porto Alegre, especificamente conforme os anexos e dispositivos complementares, há a seguinte regra: "Os recuos laterais e de fundos serão exigidos quando a edificação ultrapassar o limite máximo de construção permitido nas divisas do lote, conforme previsto no Anexo 2 desta Lei Complementar, e deverão ser calculados em 18% (dezoito por cento) da altura de cada volume da edificação em relação à divisa correspondente." O que isso significa na prática? Edificações podem construir até um determinado limite junto à divisa do terreno (esse limite está especificado para cada ZOT nos anexos da lei). Se a edificação ultrapassar esse limite de construção junto à divisa, passa a ser obrigatório observar um recuo lateral ou de fundos. Esse recuo obrigatório deve ser de 18% da altura da edificação, calculado em relação à divisa correspondente e aplicado a cada volume da edificação. Exemplo prático: Se uma edificação atinge 20 metros de altura acima do limite permitido junto à divisa, o recuo obrigatório será de 3,6 metros (18% de 20 metros) em relação à divisa em questão. Essa regra busca garantir ventilação, insolação e privacidade entre os edifícios, promovendo melhor qualidade ambiental urbana. Lembrando: o limite de construção junto à divisa e quando o recuo passa a ser exigido dependem do zoneamento (ZOT) e devem ser conferidos no Anexo 2 da proposta da LUOS. Esses parâmetros fazem parte da proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre.

---

### Caso #467

**Tags:** geral
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Prevê monitoramento de preços de moradia e renda para orientar políticas públicas. Fomenta instrumentos para manter a população de baixa renda em áreas centrais e bem servidas. Propõe a ampliação da oferta de habitação de interesse social nas regiões valorizadas, aliando crescimento econômico ao combate à exclusão. Em resumo: O Plano Diretor reconhece a possibilidade de transformação urbana, mas procura garantir que ela seja inclusiva, justa e que combata a expulsão de moradores de menor renda. A proposta é promover uma cidade diversa e acessível, e não excludente. Esses princípios fazem parte da proposta de revisão do Plano Diretor Urbano Sustentável e da Lei de Uso e Ocupação do Solo de Porto Alegre.

---

### Caso #501

**Tags:** geral
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Existem diferentes níveis de controle de polarização de entretenimento noturno, variando de Nível 1 a Nível 4, sendo aplicados conforme a ZOT e suas características.

---

### Caso #502

**Tags:** geral
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

A área mínima de lote mais comum é de 125,0 m² na maioria das ZOTs.

---

### Caso #503

**Tags:** geral
**Dificuldade:** medium
**Versão:** 2

**Conteúdo:**

A testada mínima de lote varia de acordo com cada zona. O valor absoluto mínimo é de 0,0 metros para as seguintes zonas e respectivos bairros: - ESPECIAL: BOA VISTA, CENTRO HISTÓRICO, FARROUPILHA, JARDIM EUROPA, LOMBA DO PINHEIRO, MOINHOS DE VENTO, PRAIA DE BELAS, SÉTIMO CÉU, TRISTEZA, - ZONA RURAL: BELÉM NOVO, BOA VISTA DO SUL, CHAPÉU DO SOL, EXTREMA, LAGEADO, LAMI e SÃO CAETANO

---

### Caso #507

**Tags:** geral
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Os módulos de fracionamento variam entre 3.000 m² e 5.000 m², dependendo da ZOT específica.

---

### Caso #508

**Tags:** geral
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Para loteamentos (acima de 22.500 m²), geralmente são exigidos 32% para malha viária e 18% para equipamentos públicos.

---

### Caso #509

**Tags:** geral
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Não, o comércio atacadista tem restrições variadas. Em algumas ZOTs é permitido sem limites (S/L), em outras tem limite de porte (como 1.500 m²), e em algumas zonas específicas pode ser proibido.

---

### Caso #510

**Tags:** geral
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

A face máxima do quarteirão é geralmente de 200 metros na maioria das ZOTs.

---

### Caso #511

**Tags:** geral
**Dificuldade:** medium
**Versão:** 2

**Conteúdo:**

A área máxima do quarteirão é tipicamente de 22.500 m² na maioria das zonas.

---

### Caso #512

**Tags:** geral
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Não, as indústrias têm restrições variadas. Indústrias inócuas geralmente têm limite de 300 m² de área, enquanto indústrias com interferência ambiental podem ter limites maiores (como 1.500 m²) ou serem permitidas sem limite em zonas específicas.

---

### Caso #515

**Tags:** geral
**Dificuldade:** medium
**Versão:** 2

**Conteúdo:**

No contexto do regime urbanístico "S/L" significa "Sem Limite". Neste caso, indica que não há restrição de porte (tamanho/área) para determinada atividade naquela ZOT específica.

---

### Caso #516

**Tags:** geral
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Existem três tipos de desmembramento: Tipo 1: acima de 3.000 a 4.000 m² Tipo 2: acima de 4.000 a 5.000 m² Tipo 3: acima de 5.000 a 22.500 m²

---

### Caso #565

**Tags:** geral
**Dificuldade:** easy
**Versão:** 1

**Conteúdo:**

Os bairros e respectivas zonas com altura máxima acima de 90 metros são: - Altura máxima de 100m: . ZOT 08.1 - D: CENTRO HISTÓRICO - Altura máxima de 130m: . ZOT 08.1 - E CENTRO HISTÓRICO, . ZOT 08.2 - A: AUXILIADORA, FLORESTA, INDEPENDÊNCIA, MOINHOS DE VENTO, SÃO GERALDO e SÃO JOÃO . ZOT 08.2 - B: FARRAPOS,HUMAITÁ, NAVEGANTES e SÃO JOÃO . ZOT 08.3 - A: AZENHA, CRISTAL, MENINO DEUS e PRAIA DE BELAS Tags: geral | Versão: 1 #566 – Caso 18 Pergunta: Qual a altura máxima no centro histórico? Resposta Esperada: O Centro Histórico possui diferentes zonas com suas respectivas regulamentações. A altura máxima é de 130m na Zona de Ordenamento Territorial ZOT 08.1 - E

---

### Caso #567

**Tags:** geral
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Art. 106. A outorga onerosa do direito de construir (OODC) é a autorização concedida pelo Município para utilização de potencial construtivo adicional além do coeficiente de aproveitamento básico do lote, até o limite do coeficiente de aproveitamento máximo, mediante contrapartida definida nesta Lei Complementar. - 1º A OODC observará os objetivos estabelecidos no Plano Diretor. - 2º A OODC poderá ser aplicada em todo o perímetro urbano, observados os padrões e restrições de adensamento fixados para cada Zona de Ordenamento Territorial, nos termos desta Lei Complementar.

---

### Caso #568

**Tags:** geral
**Dificuldade:** easy
**Versão:** 1

**Conteúdo:**

O bairro Cidade Baixa está localizado em uma Zona de Ordenamento Territorial ZOT 07, que possui os seguintes parâmetros: Altura Máxima 60 Coef. básico 3,60 Coef. máx 6,50

---

### Caso #569

**Tags:** geral
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O Art. 4º da LUOS 2025 define o conceito de zoneamento do Município por Zonas de Ordenamento Territorial (ZOT) classificando o território conforme suas características e estratégias de desenvolvimento local, em conformidade com o Macrozoneamento estabelecido pelo Plano Diretor.O novo plano diretor considera que os seguintes bairros fazem parte da Zona de Ordenamento Territorial ESPECIAL: BOA VISTA CENTRO HISTÓRICO FARROUPILHA JARDIM EUROPA LOMBA DO PINHEIRO MOINHOS DE VENTO PRAIA DE BELAS SÉTIMO CÉU TRISTEZA

---

## Habitacao

**Total de casos nesta categoria:** 3

### Caso #414

**Tags:** habitacao
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Porque regras mais simples e claras ajudam a destravar projetos e reduzir os custos com estudos, revisões e prazos de aprovação. O novo Plano Diretor e a nova LUOS substituem centenas de zonas específicas por uma lógica mais enxuta e coerente com a realidade da cidade. Isso permite construir com mais segurança jurídica, amplia as possibilidades de uso dos terrenos e facilita a regularização de imóveis. Quanto menos barreiras, mais moradias podem ser viabilizadas --- e mais acessíveis elas se tornam.

---

### Caso #426

**Tags:** habitacao, regularizacao, areas_irregulares
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Sim. O plano reconhece o déficit habitacional e inclui estratégias para regularização fundiária, reassentamento de famílias em áreas de risco e ampliação da oferta de habitação social em áreas com infraestrutura e emprego. Há zonas específicas para melhorias urbanas com foca na qualificação da HIS (Habitação de Interesse Social), além de regras mais claras para parcelamentos populares e para uso misto, o que permite moradia mais próxima de oportunidades.

---

### Caso #435

**Tags:** habitacao
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O novo Plano Diretor trata a habitação de interesse social como eixo estruturante da política urbana, com foco na redução do custo da moradia e na garantia do acesso de todos à cidade. Esse Objetivo Estratégico reconhece que o afastamento da população de baixa renda dos territórios bem estruturados é um dos principais vetores de desigualdade urbana em Porto Alegre, propondo ampliar a produção de moradia em áreas com infraestrutura, serviços e oferta de oportunidades, especialmente ao longo dos eixos de transporte coletivo e nas centralidades. Para viabilizar essa diretriz, a LUOS estabelece parâmetros específicos de parcelamento e uso do solo voltados à demanda habitacional prioritária, além de prever incentivos urbanísticos como a Outorga Onerosa do Direito de Construir, com fator de planejamento diferenciado --- incluindo a isenção do valor da outorga para habitação de interesse social --- e a destinação de recursos ao Fundo Municipal de Habitação. De forma complementar, o plano define as Áreas de Requalificação Urbana (ARU) como territórios com carências de infraestrutura e baixa integração à malha urbana, priorizando-os para intervenções públicas e privadas voltadas à urbanização, regularização e qualificação habitacional.

---

## Legal

**Total de casos nesta categoria:** 8

### Caso #543

**Tags:** legal, artigo, luos
**Dificuldade:** high
**Versão:** 2

**Conteúdo:**

Art. 81 - III: os acréscimos definidos em regulamento para projetos que obtenham Certificação em Sustentabilidade Ambiental, desde que não ultrapassem o limite de 20% (vinte por cento) do total da área construída computável permitida.

---

### Caso #544

**Tags:** legal, artigo, luos
**Dificuldade:** high
**Versão:** 2

**Conteúdo:**

Art. 74: Os empreendimentos localizados na ZOT 8.2 - 4º Distrito deverão observar as diretrizes específicas do Programa de Revitalização do 4º Distrito, com incentivos para uso misto e preservação do patrimônio histórico

---

### Caso #546

**Tags:** legal, artigo, luos
**Dificuldade:** medium
**Versão:** 4

**Conteúdo:**

O Art. 26 da LUOS informa que "para imóveis atingidos pelo traçado do Plano Diretor, o coeficiente de aproveitamento e a taxa de permeabilidade serão calculados conforme as seguintes condições: I - quando houver possibilidade de ocupação fora da área atingida pelo traçado: a) o coeficiente de aproveitamento e a taxa de permeabilidade serão calculados exclusivamente sobre a área remanescente do terreno; b) o coeficiente de aproveitamento e a taxa de permeabilidade poderão ser calculados sobre a totalidade da área do terreno, mediante Transferência do Direito de Construir (TDC).

---

### Caso #547

**Tags:** legal, artigo, luos
**Dificuldade:** simple
**Versão:** 3

**Conteúdo:**

O Art. 204 do Plano Diretor informa que "os incentivos urbanísticos poderão compreender, entre outros:"..."II - redução ou dispensa dos recuos obrigatórios definidos pela legislação urbanística"

---

### Caso #548

**Tags:** legal, artigo, luos, eiv, art90, anexo7, vizinhança
**Dificuldade:** high
**Versão:** 3

**Conteúdo:**

No Art. 90 da LUOS o Estudo de Impacto de Vizinhança (EIV) é considerado como instrumento urbanístico destinado a avaliar os efeitos positivos e negativos de empreendimentos ou atividades sobre a qualidade de vida urbana, a infraestrutura urbana e o entorno imediato, visando compatibilizá-los com as condições da vizinhança consolidada, sendo exigido nos casos definidos no Anexo 7 desta Lei Complementar. Parágrafo único: O Estudo de Impacto de Vizinhança será exigido para as atividades e tipologias previstos no Anexo 7, e deverá ser requerido previamente à análise do projeto arquitetônico ou do projeto de parcelamento do solo, conforme o caso.

---

### Caso #549

**Tags:** legal, artigo, luos
**Dificuldade:** simple
**Versão:** 3

**Conteúdo:**

Art. 106. A outorga onerosa do direito de construir (OODC) é a autorização concedida pelo Município para utilização de potencial construtivo adicional além do coeficiente de aproveitamento básico do lote, até o limite do coeficiente de aproveitamento máximo, mediante contrapartida definida nesta Lei Complementar. - 1º A OODC observará os objetivos estabelecidos no Plano Diretor. - 2º A OODC poderá ser aplicada em todo o perímetro urbano, observados os padrões e restrições de adensamento fixados para cada Zona de Ordenamento Territorial, nos termos desta Lei Complementar.

---

### Caso #550

**Tags:** legal, artigo, luos
**Dificuldade:** high
**Versão:** 2

**Conteúdo:**

Art. 92: As ZEIS são porções do território destinadas à regularização fundiária e produção de habitação de interesse social, com parâmetros urbanísticos especiais

---

### Caso #551

**Tags:** legal, artigo, luos
**Dificuldade:** simple
**Versão:** 3

**Conteúdo:**

O Art. 25 da LUOS informa que no licenciamento de projetos de edificação e na aprovação do parcelamento do solo, poderão incidir restrições específicas sobre o imóvel, decorrentes dos seguintes elementos: – traçado do Plano Diretor; – faixa não edificável, relativa a: a) áreas destinadas à implantação de redes e equipamentos públicos urbanos vinculados à prestação de serviços de competência do Município; b) áreas de preservação permanente, conforme legislação aplicável; c) restrições administrativas impostas por outros entes federativos, tais como faixas de domínio de rodovias, ferrovias e servidões administrativas.

---

## Lei

**Total de casos nesta categoria:** 1

### Caso #563

**Tags:** lei, artigo, luos
**Dificuldade:** medium
**Versão:** 4

**Conteúdo:**

Art. 75. O regime volumétrico é um dos componentes do regime urbanístico e compreende os parâmetros que definem os limites físicos da edificação no lote, conforme estabelecido para cada ZOT, podendo incluir os seguintes conceitos: – taxa de permeabilidade (TP): proporção mínima da área do terreno que deve permanecer livre de pavimentação ou construção que inviabilize a infiltração da água no solo; – referência de nível (RN): ponto de referência adotado no projeto arquitetônico para fins de medição da altura da edificação, ou de volumes que a compõem, escolhido pelo responsável técnico em qualquer ponto do terreno natural ou do passeio com frente para o imóvel, observados os limites definidos no art. 80 desta Lei Complementar; – altura: distância vertical entre a referência de nível da edificação e o nível correspondente à parte inferior da laje que encerra o último pavimento, desconsideradas estruturas técnicas superiores; – recuos laterais e de fundos: afastamentos mínimos obrigatórios entre a edificação e as divisas laterais e posteriores do lote; – recuo de jardim: afastamento mínimo entre a edificação e a divisa frontal do lote, destinado à criação de área aberta voltada à qualificação do espaço público, podendo incluir espaço verde, área de transição, fruição ou ampliação da calçada.

---

## Recuos

**Total de casos nesta categoria:** 4

### Caso #461

**Tags:** recuos
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

De acordo com a proposta da nova Lei de Uso e Ocupação do Solo de Porto Alegre, especificamente conforme os anexos e dispositivos complementares, há a seguinte regra: "Os recuos laterais e de fundos serão exigidos quando a edificação ultrapassar o limite máximo de construção permitido nas divisas do lote, conforme previsto no Anexo 2 desta Lei Complementar, e deverão ser calculados em 18% (dezoito por cento) da altura de cada volume da edificação em relação à divisa correspondente."

---

### Caso #500

**Tags:** recuos
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O recuo de jardim padrão é de 4,0 metros na maioria das ZOTs.

---

### Caso #506

**Tags:** recuos
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Os afastamentos laterais e de fundos são calculados em 18% da altura total desde o RN (Referência de Nível), sendo aplicáveis acima de 12,5 metros de altura na maioria das ZOTs.

---

### Caso #517

**Tags:** recuos
**Dificuldade:** medium
**Versão:** 2

**Conteúdo:**

Não, o afastamento frontal é "Isento" na maioria das ZOTs, significando que não é obrigatório manter afastamento da frente do lote.

---

## Taxa Permeabilidade

**Total de casos nesta categoria:** 5

### Caso #425

**Tags:** taxa_permeabilidade, enchentes_2024
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O Plano Diretor não substitui os planos operacionais de manutenção, mas organiza o território com o objetivo de prevenir novos riscos. A proposta valoriza a ampliação de áreas de preservação, a criação de corredores ecológicos, a integração de redes de drenagem e a definição de áreas prioritárias para ação pública. A adaptação climática é um dos objetivos centrais do plano, e a requalificação de áreas vulneráveis está prevista nas Áreas Estruturadoras e nos Sistemas de Espaços Abertos e Ecológicos. É possível dividir o território de Porto Alegre em duas grandes áreas, considerando os eventos climáticos de 2024: uma acima da cota de inundação, e outra abaixo dessa cota, que foi diretamente impactada. Para essa área diretamente afetada, o plano prevê, de forma geral, duas estratégias principais: a recuperação do sistema nas áreas protegidas; e a realização de estudos específicos para as ilhas e para a porção sul do território. Nas áreas protegidas, o Plano Diretor orienta a ocupação com índices compatíveis com a infraestrutura disponível e com o acesso a serviços públicos. Já nas ilhas e na porção sul, onde não há zoneamento de proteção, são propostos índices e taxas urbanísticas mais restritivos, prevendo o posterior detalhamento por meio de estudos já contratados e em andamento.

---

### Caso #457

**Tags:** taxa_permeabilidade
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

A proposta de revisão da Lei de Uso e Ocupação do Solo de Porto Alegre não utiliza mais a taxa de ocupação como parâmetro urbanístico. Na nova proposta, o foco dos parâmetros urbanísticos está na altura máxima, coeficiente de aproveitamento (ou seja, quanto pode ser construído em relação à área do terreno), e taxa de permeabilidade (solo livre e áreas verdes). A taxa de ocupação, tradicionalmente usada para limitar o quanto do terreno pode ser coberto por edificações no térreo, foi retirada dos novos regramentos. Resumo: Taxa de ocupação: Não é mais utilizada na proposta revisada. Taxa de permeabilidade: Continua como parâmetro obrigatório, determinando o mínimo de solo livre para infiltração de água. Outros parâmetros de controle: altura máxima, coeficiente de aproveitamento e, em alguns casos, área mínima de terreno.

---

### Caso #493

**Tags:** taxa_permeabilidade
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

As taxas de permeabilidade para terrenos acima de 1.500 m² variam de acordo com a ZOT, sendo os valores mais comuns: 20%, 25%, 32%, 35%, 40% e 45%.

---

### Caso #494

**Tags:** taxa_permeabilidade
**Dificuldade:** medium
**Versão:** 2

**Conteúdo:**

A taxa de permeabilidade varia de acordo com o tamanho da área do lote, sendo: A taxas de permeabilidade mais altas exigidas são: - Taxa de Permeabilidade (acima de 1,500 m²): 70 - Taxa de Permeabilidade (até 1,500 m²): 50

---

### Caso #514

**Tags:** taxa_permeabilidade
**Dificuldade:** medium
**Versão:** 3

**Conteúdo:**

Sim, para terrenos até 1.500 m², a taxa de permeabilidade geralmente é menor, variando entre 0% e 50%, dependendo da ZOT.

---

## Teste

**Total de casos nesta categoria:** 1

### Caso #560

**Tags:** teste, zot, altura
**Dificuldade:** simple
**Versão:** 4

**Conteúdo:**

A altura máxima para construções em ZOT 02 é de 9 metros

---

## Teste-Browser

**Total de casos nesta categoria:** 1

### Caso #562

**Tags:** teste-browser, v2
**Dificuldade:** medium
**Versão:** 4

**Conteúdo:**

O Art. 76 da LUOS informa que a taxa de permeabilidade exigida para cada imóvel será determinada conforme a ZOT em que se insere, nos termos dos padrões definidos no Anexo 2 desta Lei Complementar. 1º A taxa de permeabilidade poderá variar também em razão da área do terreno, conforme os parâmetros estabelecidos para cada ZOT no Anexo 2 desta Lei Complementar. 2º Não serão computados no cálculo da taxa de permeabilidade as áreas construídas indicadas no inc. IX do art. 73, as marquises e os acessos cobertos, observadas as disposições do Código de Edificações.

---

## Zonas

**Total de casos nesta categoria:** 8

### Caso #423

**Tags:** zonas
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

O novo zoneamento não distribui "ganhos" e "perdas" arbitrariamente: ele reorganiza o território para equilibrar densidade, infraestrutura e vocações locais. As 16 ZOTs (Zonas de Ordenamento Territorial) foram desenhadas a partir de dados reais sobre uso do solo, mobilidade, riscos ambientais e acesso a serviços. Em vez de regras fragmentadas por zoneamentos específicos, as ZOTs buscam coerência e equidade territorial. Ganham as pessoas --- sobretudo onde havia travas ao uso urbano qualificado.

---

### Caso #424

**Tags:** zonas, centro
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Não. Esses planos locais fazem parte da Componente Espacial, que permite que áreas com desafios e oportunidades específicas tenham diretrizes mais detalhadas, sem contrariar os princípios gerais do Plano Diretor. Eles são estratégicos para ativar o potencial urbano, cultural e econômico de cada território e obedecem aos objetivos e sistemas definidos pelo plano geral. Diversos municípios ao redor do mundo utilizam instrumentos equivalentes aos chamados planos parciais, planos locais, planos de bairro ou planos de detalhamento --- que detalham regras urbanísticas mais específicas em certas áreas da cidade, em complemento ao plano diretor ou plano regulador geral. Esses instrumentos são comuns em cidades que adotam planejamento urbano por zonas, com diferentes níveis de detalhamento espacial. Aqui estão alguns exemplos internacionais relevantes: Paris, Lyon, Bordeaux (França); Berlim, Munique, Hamburgo (Alemanha); Londres, Manchester, Birmingham (Reino Unido); Toronto, Vancouver, Calgary (Canadá); San Francisco, Nova York, Portland (Estados Unidos); Barcelona, Madri, Sevilha (Espanha); Santiago e Valparaíso (Chile); Lisboa e Porto (Portugal); Bogotá (Colômbia).

---

### Caso #431

**Tags:** zonas
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

O território foi dividido em 16 ZOTs, com base em características morfológicas, ambientais e funcionais. Cada ZOT possui parâmetros próprios: ZOTs 1 a 3: áreas predominantemente residenciais com baixa transformação; ZOTs 4 a 7: áreas com maior potencial de adensamento e transformação urbana; ZOTs 8 a 13: áreas estratégicas, com maior verticalização e articulação a planos e projetos estruturantes; ZOTs 14 a 16: áreas de transição e proteção ambiental, com parâmetros mais restritivos e foco em usos compatíveis com a preservação.

---

### Caso #436

**Tags:** zonas
**Dificuldade:** high
**Versão:** 1

**Conteúdo:**

Sim, o novo Plano Diretor contempla as ZEIS por meio de uma abordagem atualizada e mais propositiva. Entretanto, o novo plano adota o conceito de AEIS - Área de Especial Interesse Social integrando ao conjunto das Áreas de Requalificação Urbana (ARU). As AEIS previstas no plano anterior (PDDUA) são automaticamente incorporadas ao novo PDUS, mas agora inseridas em um contexto mais amplo, que busca não apenas reconhecer essas áreas, mas atuar ativamente na sua qualificação urbana. Essa integração amplia o papel tradicional das ZEIS, indo além da simples demarcação para fins de regularização. No PDUS, as AEIS nas ARUs são tratadas como territórios prioritários para políticas públicas que promovam acesso à cidade, inclusão territorial, infraestrutura, regularização fundiária, produção habitacional e melhoria da qualidade de vida, articulando a política habitacional com os instrumentos de planejamento e ordenamento do solo urbano.

---

### Caso #446

**Tags:** zonas
**Dificuldade:** high
**Versão:** 2

**Conteúdo:**

O novo Plano Diretor de Porto Alegre não realiza a revisão da zona rural, mantendo os limites estabelecidos pela legislação vigente. No entanto, a proposta reconhece a importância estratégica da zona rural e prevê que sua revisão será objeto de estudo específico, a ser elaborado posteriormente, com base nos critérios definidos pela Lei Complementar nº 775/2015. Além disso, o plano estabelece que a ZOT 16, incluída no zoneamento da nova LUOS, poderá ser avaliada como área de possível expansão da zona rural, desde que fundamentada por análise técnica e submetida a processo de alteração legislativa adequado. Com isso, o plano mantém a zona rural sob regime próprio, mas abre caminho para ajustes futuros alinhados ao planejamento territorial integrado. A seguir apresento a lista de bairros ordenados pelo nome: ZONA RURAL:, BELÉM NOVO, BOA VISTA DO SUL, CHAPÉU DO SOL, EXTREMA, LAGEADO, LAMI e SÃO CAETANO

---

### Caso #481

**Tags:** zonas
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Existem 16 ZOTs principais (ZOT 01 a ZOT 16), além de subdivisões específicas nas ZOTs 08.1, 08.2 e 08.3, totalizando 30 tipos diferentes de zoneamento, incluindo também as zonas ESPECIAL e ZONA RURAL.

---

### Caso #488

**Tags:** zonas
**Dificuldade:** medium
**Versão:** 2

**Conteúdo:**

Os bairros que possuem Zona Especial são: JARDIM EUROPA, LOMBA DO PINHEIRO, PRAIA DE BELAS, MOINHOS DE VENTO, CENTRO HISTÓRICO, BOA VISTA, TRISTEZA, FARROUPILHA, SÉTIMO CÉU.

---

### Caso #489

**Tags:** zonas
**Dificuldade:** medium
**Versão:** 1

**Conteúdo:**

Os bairros que possuem Zona Rural são: BELÉM NOVO, BOA VISTA DO SUL, CHAPÉU DO SOL, EXTREMA, LAGEADO, LAMI, PONTA GROSSA, SÉTIMO CÉU.

---
