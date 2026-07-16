# Hierarquia de autoridade das fontes

**Versão:** 1.0  
**Data:** 2026-07-16  
**Status:** canônico e vinculante para produto, documentação e implementação

## 1. Objetivo

Este documento define qual fonte prevalece quando requisitos, decisões, documentação, issues, código, mockups ou evidências técnicas divergem.

A hierarquia existe para impedir que uma decisão técnica, um ADR, um protótipo ou o estado atual do código redefina silenciosamente o produto solicitado pela Estímulo.

## 2. Hierarquia geral

### Nível 1 — `premissas-desenvolvimento.md`

`premissas-desenvolvimento.md`, integrante do pacote de referências fornecido em 2026-07-16, é a fonte de maior autoridade do projeto.

Ela prevalece sobre:

- os demais documentos do pacote;
- issues e discussões do GitHub;
- ADRs;
- documentação técnica;
- código, schema, migrations e testes;
- mockups e protótipos;
- decisões inferidas anteriormente.

Seu conteúdo define, entre outros pontos:

- entrega final como plataforma web LMS completa e em produção;
- desenvolvimento interno do produto;
- AWS para staging e produção;
- Supabase para desenvolvimento e testes;
- uso obrigatório das issues como backlog funcional;
- reutilização máxima responsável do repositório anterior;
- manutenção, legado, arquitetura e documentação como critérios de aceite;
- armazenamento estruturado de todas as ações do usuário;
- HubSpot como centro de todas as informações do usuário;
- identificação e unificação de clientes com e sem crédito;
- campos obrigatórios de entrada e captura de UTM;
- aderência ao guia visual da Estímulo e aos mockups de referência;
- diagnóstico inicial configurável;
- requisitos das interfaces de participante e administração.

### Nível 2 — demais documentos do pacote de referências

Os demais documentos fornecidos no mesmo pacote são autoridade para assuntos não técnicos, incluindo:

- contexto institucional;
- objetivos de negócio e impacto;
- lógica de Capacitação de Crédito;
- público e jornada do empreendedor;
- arquétipos e maturidade operacional;
- requisitos funcionais e experiência desejada;
- conteúdo, pedagogia, progressão, avaliações e linguagem;
- prioridades operacionais e pilotos;
- teoria da mudança e mensuração de impacto;
- referências visuais, editoriais e de benchmarking.

Eles não são autoridade para escolher arquitetura, stack, padrões de código, protocolos, serviços AWS, desenho físico de banco, segurança de aplicação, observabilidade, CI/CD ou outros meios técnicos.

Quando dois documentos de nível 2 divergirem, a divergência deve ser registrada. Não é permitido escolher silenciosamente a versão mais conveniente.

### Nível 3 — decisões posteriores explicitamente aprovadas

Uma decisão posterior pode complementar ou substituir uma fonte anterior somente quando:

1. a aprovação for explícita;
2. a fonte afetada for identificada;
3. a mudança de requisito for descrita;
4. a data e o responsável pela aprovação forem registrados;
5. documentação, backlog e critérios de aceite forem atualizados juntos.

Uma decisão técnica não pode usar este nível para reduzir requisito de produto sem aprovação de produto equivalente.

### Nível 4 — issues do GitHub

As issues são backlog operacional obrigatório e devem ser verificadas continuamente.

Elas:

- detalham trabalho a executar;
- podem adicionar critérios compatíveis com as fontes superiores;
- não podem remover, restringir ou redefinir requisito superior;
- devem ser reconciliadas quando conflitarem com as fontes de nível 1 ou 2.

### Nível 5 — decisões e evidências técnicas

ADRs, padrões de engenharia, documentação técnica, código, testes, estado dos ambientes e melhores práticas definem **como** cumprir os requisitos.

Para questões estritamente técnicas, a ordem de avaliação é:

1. segurança, privacidade e obrigações legais aplicáveis;
2. comportamento comprovado dos ambientes autorizados;
3. requisitos técnicos explícitos de `premissas-desenvolvimento.md`;
4. melhores práticas e documentação oficial dos fornecedores;
5. ADRs aprovados;
6. estado atual do código.

Uma limitação técnica não altera o requisito. Quando não for possível cumpri-lo com segurança ou viabilidade comprovada, deve ser aberto um bloqueador com alternativas e impacto.

## 3. Regra para produto versus implementação

As fontes de negócio definem o resultado esperado. A engenharia define o mecanismo.

Exemplos:

- a premissa exige todos os dados do usuário no HubSpot; a engenharia pode usar PostgreSQL como banco operacional e sincronização assíncrona, mas não pode decidir que apenas um subconjunto conveniente será representado no HubSpot;
- a premissa exige AWS em produção; a engenharia decide os serviços, a topologia e a infraestrutura como código;
- a premissa exige diagnóstico editável e menciona Typeform; a engenharia deve propor a integração segura e versionada, sem substituir o requisito por um formulário fixo;
- a premissa exige desenvolvimento interno; serviços mandatados de infraestrutura e integração podem ser usados, mas não se pode comprar ou terceirizar o LMS como substituto da implementação interna.

## 4. Interpretação vinculante do HubSpot

A frase “todos os dados capturados ou usados devem estar no HubSpot” é requisito superior.

Consequentemente:

- toda categoria de dado relacionada ao usuário deve possuir destino, representação e regra de sincronização no HubSpot;
- todas as ações do usuário devem ser persistidas como eventos estruturados;
- o PostgreSQL pode ser banco operacional, event store, outbox e fonte de processamento;
- a sincronização pode ser assíncrona quando não houver necessidade de confirmação imediata;
- o HubSpot deve permitir recuperar a visão completa do usuário, inclusive por objetos, propriedades, associações ou registros de interação adequados;
- não é permitido classificar unilateralmente eventos comportamentais como “não projetáveis por padrão” quando forem dados do usuário exigidos pela premissa;
- logs puramente técnicos, segredos e binários não são tratados como informação de usuário para fins desta regra, salvo quando contiverem dado pessoal ou forem necessários para a visão do usuário;
- qualquer exceção por limite de licença, API, volume, privacidade ou custo deve ser documentada e aprovada, não presumida.

## 5. Interpretação vinculante de desenvolvimento interno

“Todo desenvolvido internamente” significa:

- propriedade interna do código, arquitetura, dados, regras e manutenção;
- nenhuma compra ou terceirização de um LMS que substitua a plataforma;
- nenhuma delegação da responsabilidade central de produto e engenharia;
- uso permitido dos serviços já exigidos ou autorizados, como AWS, Supabase de desenvolvimento/teste, HubSpot e integrações necessárias;
- bibliotecas e serviços de infraestrutura não transferem a propriedade do produto nem substituem sua implementação.

## 6. Segurança de credenciais

O pacote de referência contém valores sensíveis de ambiente. A autoridade da fonte não autoriza a reprodução desses valores no Git, em documentos, issues, logs ou PRs.

Regras técnicas obrigatórias:

- representar credenciais somente por nomes de variáveis e referências a secret managers;
- considerar como comprometido qualquer segredo já compartilhado em texto;
- rotacionar valores expostos;
- verificar o histórico Git;
- usar push protection e secret scanning.

Essa proteção não altera a decisão de ambiente presente na fonte; apenas define o tratamento técnico seguro.

## 7. Inventário do pacote de referência

| Fonte | Autoridade principal |
|---|---|
| `premissas-desenvolvimento.md` | máxima autoridade geral |
| `Estímulo _ Proposta_estagio.md` | propósito do estágio, escopo e resultado esperado |
| `trabalho.md` | Capacitação de Crédito, eventos comportamentais, personalização e integração |
| `resumo-diagnostico-capacitacao.md` | tese estratégica, pilares, pilotos e ativação |
| `Estímulo-Institucional.md` | instituição, público, 3Cs, missão e impacto |
| `teoria-mudança.md` | teoria da mudança e indicadores institucionais |
| `teoria-mudança-amazonia.md` | contexto e teoria da mudança da Amazônia |
| `arquetipos_estimulo.md` | modelo de arquétipos, maturidade e diagnóstico |
| `arquetipos_estimulo_ppxt.md` | comunicação e síntese visual dos arquétipos |
| `draft-validacao-jornada-capacitacao-ia-digital-mei_me.md` | estrutura geral da Jornada OpenAI |
| `Bloco-01-boas-vindas-e-potencial-da-ia .docx.md` | conteúdo e pedagogia do bloco 1 |
| `bloco-02-base-opcional.docx.md` | conteúdo e pedagogia do bloco base |
| `trilha-01-marketing-e-vendas-com-ia.docx.md` | conteúdo da trilha de Marketing e Vendas |
| `trilha-02-gestao-com-ia.docx.md` | conteúdo da trilha de Gestão |
| `trilha-03-desenvolvimento-avancado-com-codex.docx.md` | conteúdo da trilha avançada de Codex |
| `referencias.md` | benchmarks, mockups e fundação anterior |
| `Jornada do Empreendedor Estímulo.pdf` | fluxo visual e momentos da jornada de crédito |

## 8. Tratamento de lacunas e conflitos

Quando faltar informação:

1. registrar a lacuna em `INFORMATION_REQUESTS.md`;
2. manter a configuração bloqueada quando a lacuna afetar resultado oficial;
3. usar dados sintéticos somente em testes e identificá-los claramente;
4. não transformar hipótese, protótipo ou heurística em requisito oficial;
5. não apresentar uma capacidade genérica como produto oficial concluído.

Quando houver conflito:

1. citar as fontes conflitantes;
2. aplicar a hierarquia deste documento;
3. atualizar o registro de decisões;
4. atualizar a matriz de rastreabilidade;
5. atualizar os bloqueadores e issues afetados;
6. preservar evidência da decisão.

## 9. Regra para documentos existentes

Todo documento ativo deve ser interpretado sob esta hierarquia, mesmo quando ainda utilizar expressões antigas como “referências oficiais” ou citar uma baseline anterior.

Em caso de conflito textual não corrigido:

> `SOURCE_AUTHORITY_HIERARCHY.md` e `premissas-desenvolvimento.md` prevalecem.

Código, ADR, issue, mockup ou documento auxiliar conflitante deve ser corrigido; não pode ser usado como justificativa para ignorar a fonte superior.
