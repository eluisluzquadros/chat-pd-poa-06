import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PredefinedRequest {
  responseType: string;
  query: string;
}

const OBJECTIVES_RESPONSE = `# Tire suas dúvidas sobre a proposta do **Plano Diretor Sustentável**

## 1. O que é o Plano Diretor Sustentável e por que ele importa para a minha vida?

O **Plano Diretor Sustentável** é a principal lei que organiza o crescimento e o funcionamento da cidade. Ele define, por exemplo, onde podem ser construídos prédios, áreas comerciais ou casas; onde ficam os parques, as escolas, as ciclovias e as linhas de ônibus; e como a cidade vai se preparar para as mudanças climáticas. 

Isso significa que ele afeta diretamente seu bairro, o trânsito que você enfrenta, o preço da moradia, a qualidade do ar e até o tempo que você leva para ir ao trabalho.

## 2. Quanto tempo demorou o processo de revisão do Plano Diretor?

A revisão do **Plano Diretor Sustentável** levou cerca de **seis anos** desde o início do processo. A etapa de escuta à população começou em **2019**, com oficinas, audiências e consultas públicas realizadas em diferentes regiões da cidade. 

No entanto, o cronograma sofreu atrasos significativos devido à pandemia de Covid-19, que suspendeu temporariamente as atividades presenciais. Mais recentemente, a tragédia climática das enchentes também impactou o calendário de tramitação. Apesar dos imprevistos, o processo seguiu sendo conduzido com ampla participação social e técnica, garantindo que a proposta final refletisse as necessidades atuais da cidade e as contribuições da população ao longo dos anos.

## 3. A revisão segue qual marco legal?

A revisão seguiu o **Estatuto da Cidade** (Lei Federal nº 10.257/2001), garantindo participação ampla da sociedade. As reuniões temáticas seguiram o Guia do Ministério das Cidades, assegurando rigor técnico e transparência. O processo incorporou boas práticas internacionais, conferindo visão ampliada e atualizada.

## 4. Quais os cinco principais objetivos do Plano Diretor Sustentável?

1. **Adaptar a cidade aos efeitos das mudanças climáticas** e alcançar a neutralidade na emissão de gases de efeito estufa
2. **Qualificar os espaços públicos** e ampliar o uso do Guaíba pela população
3. **Reduzir o tempo de deslocamento** nos trajetos do dia a dia
4. **Diminuir o custo da moradia** e garantir o acesso de todas as pessoas à cidade
5. **Fortalecer o planejamento urbano** com base na economia da cidade, tornando-o mais eficiente diante das dinâmicas urbanas e ampliando as formas de financiamento

## 5. Qual o papel dos equipamentos públicos no novo Plano Diretor Sustentável?

Os **equipamentos públicos** são tratados como elementos fundamentais para garantir qualidade de vida e acesso a serviços essenciais. O **Plano Diretor Sustentável** orienta a localização estratégica desses equipamentos, buscando a distribuição equilibrada em todas as regiões da cidade, a fim de promover a inclusão social e a acessibilidade. 

Estão previstos incentivos para a instalação de novas escolas, unidades de saúde, centros culturais e esportivos, integrando-os ao planejamento urbano.

## 6. Posso participar da criação do Plano Diretor Sustentável?

Você pode participar da revisão do **Plano Diretor Sustentável** de várias maneiras. A Prefeitura de Porto Alegre abriu espaços para que a população contribuísse com ideias, críticas e sugestões ao longo de todo o processo. 

Desde **2019**, foram realizadas **189 atividades**, com **6 mil participações**. Além disso, todos podem enviar contribuições por e-mail ou preencher formulários online no site oficial do Plano Diretor Sustentável. 

E, no dia **9 de agosto de 2025, às 10h**, no **Araújo Vianna** (Parque Farroupilha, 685), acontece a **audiência pública** da proposta, quando a comunidade pode opinar sobre as propostas antes que a minuta seja enviada à Câmara de Vereadores. Tudo isso é feito para garantir que o plano seja construído de forma coletiva, levando em conta a realidade e os desejos de quem vive a cidade todos os dias.

## 7. Quais as inovações que o Plano Diretor traz para a adaptação climática?

Transforma a **adaptação climática** em objetivo estratégico e propõe uma série de inovações para tornar a cidade mais resiliente. Cria o **Sistema Ecológico**, incluindo Áreas de Preservação Permanente (APPs), Unidades de Conservação, Áreas de risco e Corredores de Biodiversidade, tanto ecológicos quanto verdes. 

Além disso, estabelece o **Sistema de Estrutura e Infraestrutura**, que contempla a drenagem urbana, sistemas de proteção contra cheias e infraestruturas que garantem resiliência e segurança para o crescimento urbano. Também institui a **taxa de permeabilidade do solo** como instrumento urbanístico e ambiental, e incentiva a certificação de **Edificação Sustentável**, promovendo construções verdes, adaptadas e resilientes.

## 8. Como o plano trata a questão dos eventos climáticos extremos, especialmente após as cheias de 2024?

A proposta do **Plano Diretor Sustentável** cria as condições para que a cidade seja mais preparada para **eventos climáticos extremos**, como as enchentes. Ele define, por exemplo:

- **Cotas mínimas** para construção em áreas de risco
- **Preservação de áreas verdes** e regras que favorecem o solo permeável
- **Soluções baseadas na natureza**, como corredores ecológicos e mais arborização

Para o bairro **Sarandi**, por exemplo, propõem-se a implantação de um parque linear associado a estruturas de proteção contra cheias e a requalificação das bacias hidrográficas para aumentar a segurança hídrica local.

A proposta trata a **drenagem urbana** e o **controle de cheias** como elementos de adaptação climática, exigindo manutenção das condições hidrológicas em novos empreendimentos, com medidas de amortecimento de vazões e soluções construtivas resilientes. O plano dialoga com outras políticas públicas, como os planos locais de resiliência e o **Escritório de Adaptação Climática**.

## 9. O que muda para os bairros tradicionais da cidade?

Os bairros mais antigos e consolidados continuam com regras específicas, respeitando sua identidade. Porém, o plano propõe um **uso mais eficiente da infraestrutura existente**, permitindo, por exemplo, mais moradias e comércios perto de avenidas e transporte. 

A ideia não é descaracterizar, mas sim **qualificar o uso dos espaços**, incentivar a convivência, melhorar os serviços e facilitar a mobilidade. Em áreas com **patrimônio histórico**, o Plano garante instrumentos de preservação e incentivos para a conservação dos imóveis.

## 10. O novo plano vai permitir construir prédios muito altos no município?

**Não existe uma permissão geral** para prédios altos em qualquer lugar. A proposta do novo **Plano Diretor Sustentável** organiza a cidade em diferentes zonas, e cada uma tem regras específicas sobre o que pode ou não ser construído, inclusive a **altura máxima dos edifícios**. 

Essas regras consideram a infraestrutura disponível, como transporte, água, esgoto e áreas verdes. A prioridade é **adensar** onde a cidade já tem estrutura para isso, principalmente perto de corredores de transporte público. Além disso, o plano impõe regras de recuos, permeabilidade e proteção do ambiente urbano. 

Ou seja, qualquer verticalização será feita de forma **planejada**, sem descaracterizar bairros residenciais e com controle técnico.

## 11. Como irá funcionar a regra em relação à altura dos prédios?

O **Plano Diretor** e a **Lei de Uso e Ocupação do Solo** estabelecem um **Regime Volumétrico** muito claro, com uso inteligente do espaço. A altura é definida por **16 Zonas de Ordenamento Territorial (ZOTs)**. 

As maiores alturas estão concentradas em áreas com infraestrutura robusta, especialmente ao longo dos eixos de transporte de alta e média capacidade, incentivando o adensamento onde ele é mais eficiente. Há regras para:

- **Recuos laterais e de fundos** que garantem insolação e ventilação
- **Taxa de permeabilidade** que favorece a infiltração da água no solo
- **Acréscimos de altura incentivados**, não indiscriminados

Por exemplo, edificações que buscam certificações de sustentabilidade ambiental ou que promovam a preservação de bens tombados podem ter alturas maiores. Ou seja, estamos premiando projetos que agregam valor à cidade e ao meio ambiente.

## 12. Como o plano ajuda quem precisa de moradia popular?

Um dos grandes objetivos do novo **Plano Diretor Sustentável** é facilitar o acesso à **moradia digna**, principalmente para famílias de baixa renda. Ele prevê:

- **Estímulos à construção de Habitação de Interesse Social (HIS)** em áreas bem localizadas
- **Simplificação da regularização** de áreas informais
- **Uso de terrenos ociosos** para criar novas moradias
- **Incentivos** incluindo isenções e flexibilização de normas

O foco é combater a exclusão urbana e integrar essas famílias à cidade formal.

## 13. Como o Plano Diretor Sustentável trata as áreas de habitação irregular e os assentamentos informais na cidade?

O **Plano Diretor Sustentável** reconhece a existência de áreas com habitação irregular e assentamentos informais, que são um desafio histórico para Porto Alegre. A abordagem prevista busca **integrar essas comunidades** ao tecido urbano, por meio de:

- **Programas de regularização fundiária**
- **Urbanização e melhoria das condições de infraestrutura básica** (saneamento, iluminação, acessibilidade)
- **Respeito às limitações ambientais e legais**

O objetivo é garantir moradia digna, segurança jurídica e qualidade de vida, sem estimular novas ocupações clandestinas, promovendo soluções inclusivas e sustentáveis.

## 14. Quanto de permeabilidade do solo o novo Plano Diretor Sustentável está propondo?

O novo **Plano Diretor Sustentável** propõe aumentar de **32% para 45%** a exigência mínima de permeabilidade do solo em áreas privadas da cidade. 

Isso significa que uma parcela maior dos terrenos deverá ser mantida com capacidade de infiltração de água no solo, reduzindo a impermeabilização urbana. Essa medida é fundamental para:

- **Enfrentar alagamentos**
- **Melhorar a drenagem urbana**
- **Contribuir com o clima**
- **Reforçar a adaptação às mudanças climáticas**

## 15. Como o Plano Diretor Sustentável trata a preservação das áreas verdes na cidade?

O **Plano Diretor** reforça a importância das **áreas verdes** como elementos essenciais para a qualidade de vida e sustentabilidade urbana. Ele prevê:

- **Proteção e ampliação** de parques, praças e corredores verdes
- **Conectividade ecológica** e acesso público
- **Regras para compensação ambiental** em casos de supressão de vegetação
- **Priorização do plantio de espécies nativas**

As áreas verdes são componentes do **Sistema de Espaços Abertos** e do **Sistema Ecológico**, que visam qualificar o território e valorizar o espaço público como elemento central da vivência urbana.

## 16. Quantos quilômetros de corredores de biodiversidade estão previstos?

O **Plano Diretor Sustentável** prevê a criação de mais de **390 quilômetros** de corredores de biodiversidade em Porto Alegre. Esses corredores incluem:

- **Corredores ecológicos** que conectam áreas de preservação e promovem o fluxo de fauna e flora
- **Corredores verdes urbanos** que incluem arborização, drenagem sustentável e áreas de lazer

Essas estruturas partem principalmente das **Unidades de Conservação** e se espalham pelo território, fortalecendo a infraestrutura verde da cidade.

## 17. Quais são as diretrizes para mobilidade urbana previstas no Plano Diretor Sustentável?

O **Plano Diretor** orienta a mobilidade urbana priorizando:

- **Transporte público coletivo**
- **Mobilidade ativa** (caminhada e bicicleta)
- **Integração dos diferentes modais**

Estão previstas:
- **Expansão das ciclovias**
- **Melhoria da acessibilidade** nas calçadas
- **Criação de corredores exclusivos** para ônibus
- **Incentivos para veículos elétricos**
- **Políticas para transporte compartilhado**

## 18. O adensamento urbano não pode piorar o trânsito e a infraestrutura em áreas já saturadas?

O **adensamento proposto é qualificado**, ou seja, ele é planejado para acontecer onde já existe infraestrutura consolidada, como corredores de transporte público e áreas com boa oferta de serviços. 

A lógica é justamente a contrária: **evitar a expansão horizontal** que sobrecarrega os sistemas da cidade e estimula longos deslocamentos. O plano também prevê investimento em mobilidade ativa, transporte coletivo e uso misto do solo, o que permite que as pessoas morem, trabalhem e tenham acesso a serviços em regiões próximas.

## 19. Quantas pessoas poderão morar mais perto do trabalho a partir do novo Plano Diretor Sustentável?

Com as diretrizes do novo **Plano Diretor Sustentável**, estima-se que **151.962 pessoas** poderão passar a morar mais próximas de seus locais de trabalho. 

Esse número considera os lotes com maior potencial de adensamento e transformação urbana nos chamados **eixos de renovação urbana**, áreas com infraestrutura consolidada e conectividade com transporte coletivo.

## 20. Como o Plano Diretor prevê o desenvolvimento econômico sustentável?

O novo **Plano Diretor Sustentável** de Porto Alegre propõe um modelo de **desenvolvimento econômico que integra crescimento com responsabilidade ambiental**. A proposta estimula:

- **Diversificação da economia local**
- **Cadeias produtivas de baixo impacto ambiental**
- **Instalação de negócios sustentáveis** em áreas estratégicas
- **Geração de empregos próximos às moradias**
- **Apoio a micro e pequenos empreendedores**
- **Incentivo ao turismo sustentável e cultural**

## 21. Qual a diferença entre o Plano Diretor Sustentável e a LUOS, e por que eles estão sendo discutidos separadamente?

Enquanto o **Plano Diretor Sustentável** define **diretrizes gerais** para o desenvolvimento urbano (como crescimento da cidade, mobilidade, habitação e sustentabilidade), a **Lei de Uso e Ocupação do Solo (LUOS)** detalha aspectos técnicos mais específicos, como:

- O que pode ou não ser construído em cada zona da cidade
- Os usos permitidos dos imóveis (residencial, comercial, industrial)
- Índices de aproveitamento do solo
- Alturas máximas e recuos obrigatórios

**Em resumo:** o **Plano Diretor Sustentável** aponta para onde a cidade deve crescer, e a **LUOS** define como isso deve acontecer no território.

## 22. Quais outras cidades têm Plano Diretor e LUOS?

**São Paulo**, **Curitiba**, **Belo Horizonte**, **Fortaleza**, **Recife**, **Distrito Federal**, entre outras.

## 23. O que são as ZOTs e por que isso importa para mim?

**ZOTs** são as **Zonas de Ordenamento Territorial**, que organizam a cidade em diferentes tipos de uso. Cada uma das **16 ZOTs** tem regras específicas sobre:

- O que pode ser construído
- Qual a altura permitida
- Quanto do terreno deve ser permeável
- Entre outros critérios

Isso importa porque essas regras afetam diretamente como o seu bairro vai se desenvolver: se haverá mais moradia, comércio, áreas verdes, transporte e serviços. A ideia é que cada área cresça respeitando sua vocação e o bem-estar da população.

## 24. Quais são os mecanismos previstos para o controle do uso e ocupação do solo?

O **Plano Diretor Sustentável** e a **LUOS** estabelecem um sistema rigoroso de controle, baseado nas **Zonas de Ordenamento Territorial (ZOTs)**, que definem:

- **Usos permitidos**
- **Índices urbanísticos**
- **Parâmetros construtivos**

Além disso, há instrumentos de incentivo e restrição para orientar o desenvolvimento urbano, como incentivos para revitalização de áreas degradadas e restrições em zonas de risco ambiental ou de interesse cultural.

## 25. O que diferencia o Plano Diretor Sustentável das versões anteriores?

O novo **Plano Diretor Sustentável** de Porto Alegre adota uma abordagem integrada, orientada por dados e voltada para a sustentabilidade, a inclusão social e a adaptação climática. Ele traz inovações como:

- **Organização da cidade por Zonas de Ordenamento Territorial (ZOTs)**
- **Fortalecimento dos instrumentos de financiamento urbano** (como a Outorga Onerosa)
- **Criação de mecanismos de monitoramento contínuo**
- **Resposta direta a desafios atuais** (mudanças climáticas, crise habitacional)
- **Foco na qualificação dos espaços públicos**

## 26. Onde posso ver o mapa e as regras do novo Plano Diretor Sustentável?

Você pode acessar todas as informações no site oficial da **Prefeitura de Porto Alegre**: [www.prefeitura.poa.br/planodiretor](https://www.prefeitura.poa.br/planodiretor), onde estão disponíveis:

- **Texto da proposta**
- **Mapas interativos**
- **Vídeos explicativos**
- **Canal para tirar dúvidas**

Também é possível acompanhar as redes sociais da **Secretaria Municipal do Meio Ambiente, Urbanismo e Sustentabilidade (SMAMUS)**, que atualiza constantemente os canais com informações sobre o plano, audiências e formas de participação.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { responseType, query }: PredefinedRequest = await req.json();
    
    let response = '';
    
    switch (responseType) {
      case 'objectives':
        response = OBJECTIVES_RESPONSE;
        break;
      default:
        return new Response(JSON.stringify({ error: 'Response type not supported' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({
      response,
      confidence: 1.0,
      sources: { predefined: true },
      query
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Predefined responses error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});