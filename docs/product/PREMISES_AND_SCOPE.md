# Premissas e escopo

**Versão:** 1.1  
**Data:** 2026-07-16  
**Status:** baseline canônica alinhada ao pacote de referências e à decisão HubSpot mais recente

## Autoridade documental

A ordem completa está em [SOURCE_AUTHORITY_HIERARCHY.md](SOURCE_AUTHORITY_HIERARCHY.md).

1. `premissas-desenvolvimento.md` é a maior autoridade;
2. os demais documentos do pacote são autoridade para produto, negócio, conteúdo, pedagogia, operação e impacto, mas não para escolhas estritamente técnicas;
3. decisões posteriores só substituem requisito quando aprovadas e rastreadas;
4. issues detalham o backlog;
5. ADRs, código e testes definem meios técnicos e evidência.

O escopo vigente do HubSpot está na [DEC-070](../decisions/HUBSPOT_SCOPE_DECISION.md).

## Problema central

A Estímulo precisa transformar capacitação em uma camada integrada à jornada do empreendedor e à jornada de crédito.

A plataforma deve:

- centralizar uma experiência hoje fragmentada;
- entregar conteúdo adequado ao perfil e ao momento do empreendedor;
- criar progressão e engajamento recorrente;
- registrar ações relevantes como eventos comportamentais estruturados;
- preservar sequência, contexto e temporalidade;
- gerar base confiável para relacionamento, personalização, mensuração e pesquisa futura.

A primeira entrega não deve apresentar correlação como causalidade nem usar sinais educacionais como regra automática de crédito.

## Resultado final obrigatório

A entrega final é uma plataforma web LMS:

- com as funcionalidades solicitadas pela Estímulo;
- operando em produção na AWS;
- mantida internamente;
- documentada e reproduzível;
- com experiência de participante e administração;
- integrada ao site, identidade, HubSpot e sistemas autorizados;
- com a Jornada OpenAI publicada;
- preparada para utilizar dados comportamentais de forma governada.

Fundação genérica, protótipo, ambiente Supabase ou vertical sintética não equivalem à entrega final.

## Desenvolvimento interno

O produto será desenvolvido e mantido internamente.

Isso exclui:

- compra de um LMS que substitua a plataforma;
- terceirização da responsabilidade central de produto, código, arquitetura, dados ou manutenção;
- dependência que impeça a equipe de operar e evoluir o produto.

Permanecem permitidos os serviços de infraestrutura e integração definidos pelo projeto, incluindo AWS, Supabase de desenvolvimento/teste e HubSpot.

## Repositório, issues e manutenção

- repositório oficial: `pablo-marchina/LMS-estimulo`;
- as issues são backlog funcional obrigatório;
- o repositório anterior deve ser reutilizado quando seguro e justificável;
- legado deve ser inventariado, contido e substituído somente quando necessário;
- arquitetura, documentação, testes, migrations e CI são critérios de aceite;
- nenhum artefato técnico pode redefinir requisito de produto.

## Ambientes

| Ambiente | Plataforma | Finalidade |
|---|---|---|
| local | ferramentas locais | desenvolvimento individual |
| desenvolvimento/teste | Supabase autorizado | integração e QA |
| staging | AWS | paridade, segurança, integrações e operação |
| produção | AWS | operação real |

Não haverá promoção direta do Supabase para produção.

Credenciais presentes em materiais de referência devem ser rotacionadas e gerenciadas por secret managers.

## Dados comportamentais

A plataforma deve capturar dados úteis sobre a interação do usuário.

Regras obrigatórias:

- ações relevantes do participante e do operador geram registro estruturado;
- eventos preservam ator, objeto, momento, sequência, contexto, versão e finalidade;
- eventos são idempotentes e auditáveis;
- coleta deve ser segura, justificável e transparente;
- dados sintéticos são identificados;
- dados de capacitação não influenciam crédito produtivo sem validação e governança.

“Máximo de dados” não autoriza coleta sem finalidade ou descumprimento legal.

## Escopo do HubSpot

O HubSpot não é o banco operacional nem o repositório integral do LMS.

A integração do LMS com o HubSpot deve armazenar somente:

- identificadores mínimos necessários para vincular o dado ao usuário correto;
- informações de engajamento na plataforma;
- informações que possam ajudar em cálculos, classificações, personalização, análise ou pesquisa aprovados.

Exemplos de engajamento:

- acesso e sessões;
- progresso e conclusão;
- participação, comentários e avaliações de utilidade;
- tentativas, resultados e retomadas;
- pontos, conquistas, recompensas, selos e certificados;
- abandono, recorrência e sequência de ações.

Exemplos de informações úteis para cálculo:

- respostas e resultados do diagnóstico quando necessários;
- dimensões, arquétipo e maturidade;
- variáveis de contexto autorizadas;
- indicadores derivados e features versionadas;
- resultados de classificações e personalizações;
- desfechos usados em pesquisa aprovada.

O PostgreSQL permanece como banco operacional, event store, outbox, histórico detalhado e fonte de processamento.

A matriz HubSpot deve classificar cada dado como:

```text
linking_identifier
engagement_signal
calculation_input_or_result
not_synced
```

Permanecem fora do HubSpot por padrão:

- estado transacional detalhado;
- configurações editoriais e conteúdo completo;
- payloads brutos sem finalidade aprovada;
- arquivos binários e URLs assinadas;
- logs técnicos, filas, retries e segredos.

Nenhuma informação educacional ou comportamental pode influenciar decisão de crédito sem validação metodológica, governança, análise de vieses e aprovação institucional.

## Identidade e entrada pelo site

O acesso deve coletar ou resolver:

- nome;
- e-mail;
- CPF;
- telefone;
- CNPJ opcional;
- UTMs e origem.

Esses dados podem existir no HubSpot como dados CRM independentes do LMS. A integração do LMS deve usar somente os identificadores mínimos necessários para localizar ou associar corretamente o registro.

Clientes com crédito devem ser vinculados ao registro existente. Clientes sem crédito devem ser criados de forma que uma operação futura possa ser associada sem duplicação silenciosa.

Cadastro de teste não encerra o requisito de integração oficial.

## Diagnóstico e personalização

O diagnóstico:

- é opcional;
- deve ser editável e versionado;
- preserva perguntas, alternativas, cálculo, versão, resultado e histórico;
- opera inicialmente Fazedor, Batalhador, Construtor e Navegador;
- mantém maturidade como eixo separado;
- permite evolução sem destruir histórico;
- não publica scoring ou desempate não homologado.

Usuários sem diagnóstico visualizam conteúdos sem restrição por arquétipo.

## Jornada OpenAI

A Jornada OpenAI deve seguir os documentos editoriais do pacote:

- boas-vindas e potencial da IA;
- bloco base opcional;
- Marketing e Vendas com IA;
- Gestão com IA;
- desenvolvimento avançado com Codex;
- vídeos, materiais, prompts, templates e práticas;
- quick checks, avaliações, pontos, credenciais, comentários e uploads previstos.

Divergências editoriais permanecem bloqueadas até reconciliação.

## Interface do participante

### Home

- anúncios;
- trilhas disponíveis;
- continuar progresso;
- barra de progresso;
- menu;
- recompensas, pontos e credenciais.

### Trilhas e atividades

- catálogo e labels;
- visibilidade por arquétipo;
- blocos expansíveis;
- regras configuráveis;
- comentários;
- avaliação em cinco estrelas;
- quick checks;
- conteúdo multimídia;
- práticas e uploads.

### Perfil e engajamento

- dados do usuário;
- diagnóstico;
- certificados e selos;
- histórico de engajamento;
- progresso e pontuação;
- conquistas, recompensas e ranking governado.

## Interface administrativa

A área administrativa deve oferecer:

- gestão de usuários;
- gestão de trilhas, blocos, atividades e regras;
- biblioteca com labels e taxonomia;
- gestão do diagnóstico e cálculo;
- avaliações, práticas, comentários e moderação;
- selos, certificados, pontos e recompensas;
- relatórios e acompanhamento;
- publicação e histórico.

## Fora da primeira entrega, salvo aprovação

- decisão automática de crédito;
- alteração automática de taxa, limite ou garantia;
- aplicativo móvel nativo;
- compra de LMS externo;
- segunda jornada publicada antes da OpenAI;
- refatorações sem impacto concreto.

## Princípios de aceite

1. `premissas-desenvolvimento.md` prevalece.
2. Os demais documentos do pacote prevalecem em assuntos não técnicos.
3. Código não redefine produto.
4. Toda ação relevante gera dado estruturado.
5. O HubSpot recebe somente vínculo mínimo, engajamento e dados úteis para cálculos aprovados.
6. Configurações publicadas preservam versão e histórico.
7. Supabase é desenvolvimento/teste; AWS é staging/produção.
8. Desenvolvimento e manutenção permanecem internos.
9. Código, testes, integrações e documentação mudam juntos.
10. Lacunas não são preenchidas por heurística silenciosa.
