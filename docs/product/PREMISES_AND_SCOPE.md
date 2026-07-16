# Premissas e escopo

**Versão:** 1.0  
**Data:** 2026-07-16  
**Status:** baseline canônica alinhada ao pacote de referências

## Autoridade documental

A ordem completa está em [SOURCE_AUTHORITY_HIERARCHY.md](SOURCE_AUTHORITY_HIERARCHY.md).

Para este documento:

1. `premissas-desenvolvimento.md` é a maior autoridade;
2. os demais documentos fornecidos no pacote são autoridade de produto, negócio, conteúdo, pedagogia, operação e impacto, mas não de implementação técnica;
3. decisões posteriores só substituem requisito quando aprovadas explicitamente e rastreadas;
4. issues detalham o backlog e não podem reduzir requisito superior;
5. ADRs, código e testes definem meios técnicos e evidência, não o produto desejado.

## Problema central

A Estímulo precisa transformar capacitação em uma camada integrada à jornada do empreendedor e à jornada de crédito.

A plataforma deve:

- centralizar uma experiência hoje fragmentada;
- entregar conteúdo adequado ao perfil e ao momento do empreendedor;
- criar progressão e engajamento recorrente;
- registrar todas as ações relevantes como eventos comportamentais estruturados;
- preservar sequência, contexto e temporalidade;
- disponibilizar todos os dados capturados ou usados no HubSpot;
- gerar base confiável para relacionamento, personalização, mensuração e pesquisa futura relacionada a crédito.

A primeira entrega não deve apresentar correlação como causalidade nem usar sinais educacionais como regra automática de crédito sem validação e governança específicas.

## Resultado final obrigatório

A entrega final é uma plataforma web LMS:

- com todas as funcionalidades solicitadas pela Estímulo implementadas;
- operando em produção na AWS;
- mantida internamente;
- documentada e reproduzível;
- com experiência de participante e administração;
- integrada ao site, identidade, HubSpot e demais sistemas autorizados;
- com a Jornada OpenAI publicada;
- preparada para preservar e utilizar dados comportamentais de forma governada.

Uma fundação genérica, protótipo, ambiente Supabase ou vertical sintética não equivalem à entrega final.

## Desenvolvimento interno

O produto será desenvolvido e mantido internamente.

Isso exclui:

- compra de um LMS que substitua a plataforma;
- terceirização da responsabilidade central de produto, código, arquitetura, dados ou manutenção;
- dependência de fornecedor que impeça a equipe de operar e evoluir o produto.

Permanecem permitidos e necessários os serviços de infraestrutura e integração definidos pelo projeto, incluindo AWS, Supabase para desenvolvimento/testes, HubSpot e integrações autorizadas. Bibliotecas e serviços não transferem a propriedade do produto.

## Repositório, issues, legado e manutenção

- repositório oficial: `pablo-marchina/LMS-estimulo`;
- as issues devem ser verificadas continuamente e tratadas como backlog funcional obrigatório;
- o repositório `denilsontorres2024/plataforma-estimulo` deve ser reutilizado ao máximo quando o reaproveitamento for seguro, compatível e economicamente justificável;
- legado deve ser inventariado, contido e substituído somente quando necessário;
- arquitetura, estrutura, padrões, documentação, testes, migrations e CI são critérios de aceite;
- documentação deve refletir o runtime atual e a fonte superior;
- nenhum artefato técnico pode redefinir silenciosamente requisito de produto.

## Ambientes

| Ambiente | Plataforma | Finalidade |
|---|---|---|
| local | ferramentas locais e serviços de teste | desenvolvimento individual |
| desenvolvimento/teste | Supabase autorizado | desenvolvimento, integração e QA |
| staging | AWS | prova de paridade, segurança, integrações e operação |
| produção | AWS | operação real |

Não haverá promoção do Supabase para produção. A implementação técnica deve preservar portabilidade e comprovar o runtime real na AWS.

Credenciais presentes em materiais de referência não devem ser copiadas para Git, documentos, issues ou logs. Devem ser rotacionadas e gerenciadas por secret managers.

## Dados comportamentais

A plataforma tem como objetivo capturar o máximo de dados úteis sobre a interação do usuário para utilização posterior.

Regras obrigatórias:

- todas as ações relevantes do participante e do operador devem gerar registro estruturado;
- os eventos devem preservar ator, objeto, momento, sequência, contexto, versão e finalidade;
- eventos devem ser idempotentes e auditáveis;
- coleta deve ser tecnicamente segura, legalmente justificável e transparente;
- dados sintéticos devem ser identificados e não podem ser apresentados como reais;
- dados de capacitação não podem influenciar crédito produtivo sem validação, governança, revisão humana e aprovação institucional.

“Máximo de dados” não autoriza coleta sem finalidade, dado inseguro ou descumprimento legal. Limitações necessárias devem ser registradas como decisões de segurança e privacidade, sem apagar o objetivo de captura comportamental.

## HubSpot como centro das informações do usuário

Todos os dados relacionados ao usuário que forem capturados ou usados devem possuir representação e sincronização no HubSpot.

O desenho técnico pode usar PostgreSQL como banco operacional, event store, outbox, histórico detalhado e fonte de processamento, mas deve assegurar que:

- o HubSpot seja a visão central e recuperável do usuário;
- cada categoria de dado tenha mapeamento de destino;
- eventos comportamentais tenham representação adequada no CRM, diretamente ou por objeto/registro de interação aprovado;
- identidade, negócio, crédito, diagnóstico, arquétipo, progresso, pontuação, engajamento, conclusões, credenciais e interações possam ser relacionados ao mesmo usuário;
- sincronização possua idempotência, retry, reconciliação e observabilidade;
- indisponibilidade temporária não perca dados;
- exceções por limite de API, licença, volume, custo ou privacidade sejam explicitamente aprovadas.

Logs puramente técnicos, segredos e arquivos binários não são enviados como se fossem dados de relacionamento. Quando contiverem dados pessoais, devem seguir a governança aplicável.

## Identidade, login e entrada pelo site

O acesso deve coletar ou resolver:

- nome;
- e-mail;
- CPF;
- telefone;
- CNPJ opcional;
- UTMs e origem da entrada.

Clientes que já possuem crédito devem ser vinculados ao mesmo registro e identidade existentes no HubSpot.

Clientes sem crédito devem ser criados no HubSpot com as informações coletadas. Se solicitarem crédito posteriormente, os dados de crédito devem ser associados ao mesmo registro, sem duplicação silenciosa.

O fluxo oficial deve ser integrado ao site e à área autenticada da Estímulo. Cadastro de teste não encerra este requisito.

## Diagnóstico e personalização

No primeiro acesso, o usuário deve poder responder ao diagnóstico para definição do arquétipo.

O diagnóstico:

- não é obrigatório;
- deve ser editável e versionado;
- deve preservar perguntas, alternativas, cálculo, versão, resultado e histórico;
- deve operar inicialmente os quatro arquétipos Fazedor, Batalhador, Construtor e Navegador;
- deve manter maturidade operacional como eixo separado;
- deve permitir alteração futura sem destruir resultados históricos;
- deve ser integrado ao Typeform ou a solução equivalente aprovada que cumpra a intenção da premissa;
- não pode publicar scoring, desempate ou textos não homologados.

Usuários sem diagnóstico visualizam somente conteúdos sem restrição por arquétipo.

## Jornada OpenAI

A Jornada OpenAI é o conteúdo prioritário da primeira release e deve ser implementada conforme os documentos do pacote:

- boas-vindas e potencial da IA;
- bloco base opcional;
- Marketing e Vendas com IA;
- Gestão com IA;
- desenvolvimento avançado com Codex;
- vídeos, materiais, prompts, templates e práticas;
- quick checks, avaliações e critérios de conclusão;
- pontos, selos, certificados, comentários e uploads previstos.

Os documentos de conteúdo prevalecem sobre protótipos e código para questões editoriais e pedagógicas. Divergências de duração, estrutura, avaliação ou credencial devem permanecer bloqueadas até reconciliação.

## Interface do participante

A interface deve seguir o guia de estilo da Estímulo e usar os mockups Lovable como referência visual subordinada às premissas.

### Home

- carrossel de anúncios;
- trilhas disponíveis ao perfil;
- continuar de onde parou;
- barra de progresso;
- menu superior;
- recompensas possíveis;
- pontos e credenciais relevantes.

### Trilhas

- catálogo das trilhas disponíveis;
- labels de organização e elegibilidade;
- filtragem por arquétipo;
- conteúdo geral para usuários sem diagnóstico.

### Dentro da trilha

- blocos expansíveis;
- descrição e labels;
- atividades não necessariamente sequenciais dentro do bloco;
- progresso integral exigido quando definido para selo ou certificado;
- regras de pré-requisito e conclusão configuráveis.

### Atividades

- comentários;
- avaliação de utilidade em cinco estrelas;
- pergunta curta de aprendizagem;
- conteúdos internos e externos;
- suporte a formatos adequados, incluindo vídeo horizontal e vertical, texto, imagem, áudio, arquivos, embeds e links;
- materiais complementares;
- práticas e uploads quando previstos.

### Perfil

- dados do usuário;
- resultado do diagnóstico;
- certificados e selos;
- histórico de engajamento;
- progresso e pontuação.

### Engajamento

- conquistas;
- recompensas;
- histórico de pontuação;
- ranking, sujeito a regras de privacidade e operação aprovadas.

## Interface administrativa

A área administrativa será acessível somente a contas autorizadas da Estímulo e deverá oferecer:

- gestão de usuários;
- gestão integral de trilhas, blocos, atividades e regras;
- biblioteca de conteúdo com labels e taxonomia;
- administração de conteúdo próprio e de parceiros;
- gestão do diagnóstico, versões e cálculo;
- avaliações, práticas, comentários e moderação;
- selos, certificados, pontos e recompensas;
- relatórios e acompanhamento das interações;
- controles de publicação e histórico.

## Escopo técnico

A engenharia deve pesquisar e aplicar melhores práticas atuais para:

- arquitetura de aplicação web e LMS;
- segurança e privacidade;
- manutenção de GitHub;
- modelagem de dados;
- APIs e integrações;
- acessibilidade e responsividade;
- observabilidade;
- CI/CD;
- AWS;
- testes funcionais, de integração, segurança e recuperação.

Decisões técnicas podem escolher os meios mais adequados, mas não podem reduzir silenciosamente o resultado exigido pelas fontes.

## Fora da primeira entrega, salvo nova aprovação

- decisão automática de crédito;
- alteração automática de taxa, limite ou garantia por sinal educacional;
- aplicativo móvel nativo;
- compra de LMS externo;
- segunda jornada publicada antes da Jornada OpenAI;
- refatorações sem impacto concreto na entrega.

## Princípios de aceite

1. `premissas-desenvolvimento.md` prevalece.
2. Os demais documentos do pacote prevalecem em assuntos não técnicos.
3. Código não redefine produto.
4. Toda ação relevante gera dado estruturado.
5. Todo dado de usuário capturado ou usado possui representação no HubSpot.
6. Configurações publicadas preservam versão e histórico.
7. Supabase é desenvolvimento/teste; AWS é staging/produção.
8. Desenvolvimento e manutenção permanecem internos.
9. Código, testes, integrações e documentação da mesma capacidade mudam juntos.
10. Lacunas não são preenchidas por heurística silenciosa.
