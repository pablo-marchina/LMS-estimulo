# Hierarquia de autoridade das fontes

**Versão:** 1.1  
**Data:** 2026-07-16  
**Status:** canônico e vinculante para produto, documentação e implementação

## 1. Objetivo

Este documento define qual fonte prevalece quando requisitos, decisões, documentação, issues, código, mockups ou evidências técnicas divergem.

A hierarquia impede que uma decisão técnica, um ADR, um protótipo ou o estado atual do código redefina silenciosamente o produto solicitado pela Estímulo.

## 2. Hierarquia geral

### Nível 1 — `premissas-desenvolvimento.md`

`premissas-desenvolvimento.md`, integrante do pacote de referências fornecido em 2026-07-16, é a fonte de maior autoridade do projeto.

Ela prevalece sobre:

- os demais documentos do pacote;
- issues e discussões do GitHub;
- ADRs e documentação técnica;
- código, schema, migrations e testes;
- mockups e protótipos;
- decisões inferidas anteriormente.

Seu conteúdo define, entre outros pontos:

- entrega final como plataforma web LMS completa e em produção;
- desenvolvimento interno do produto;
- AWS para staging e produção;
- Supabase para desenvolvimento e testes;
- issues como backlog funcional;
- reutilização responsável do repositório anterior;
- manutenção, arquitetura e documentação como critérios de aceite;
- armazenamento estruturado das ações relevantes do usuário;
- identificação e unificação de clientes com e sem crédito;
- campos obrigatórios de entrada e captura de UTM;
- diagnóstico configurável;
- requisitos das interfaces de participante e administração.

### Nível 2 — demais documentos do pacote

Os demais documentos fornecidos no mesmo pacote são autoridade para assuntos não técnicos, incluindo:

- contexto institucional;
- objetivos de negócio e impacto;
- lógica de Capacitação de Crédito;
- público e jornada do empreendedor;
- arquétipos e maturidade;
- requisitos funcionais e experiência;
- conteúdo, pedagogia, progressão e avaliações;
- prioridades operacionais e pilotos;
- teoria da mudança;
- referências visuais, editoriais e de benchmarking.

Eles não são autoridade para escolher arquitetura, stack, protocolos, serviços AWS, desenho físico de banco, segurança de aplicação, observabilidade ou CI/CD.

Quando dois documentos de nível 2 divergirem, a divergência deve ser registrada. Não é permitido escolher silenciosamente a versão mais conveniente.

### Nível 3 — decisões posteriores explicitamente aprovadas

Uma decisão posterior pode complementar ou substituir uma fonte anterior somente quando:

1. a aprovação for explícita;
2. a fonte afetada for identificada;
3. a mudança for descrita;
4. a data e o responsável forem registrados;
5. documentação, backlog e critérios de aceite forem atualizados juntos.

A decisão aprovada em 2026-07-16 sobre HubSpot substitui interpretações anteriores mais amplas: a integração do LMS com o CRM deve armazenar apenas identificadores mínimos de vínculo, informações de engajamento na plataforma e informações que possam contribuir para cálculos, classificações, personalização, análise ou pesquisa aprovados.

### Nível 4 — issues do GitHub

As issues são backlog operacional obrigatório. Elas podem detalhar requisitos, mas não remover ou redefinir uma fonte superior sem decisão aprovada.

### Nível 5 — decisões e evidências técnicas

ADRs, padrões de engenharia, documentação técnica, código, testes e estado dos ambientes definem **como** cumprir os requisitos.

Para questões estritamente técnicas, a ordem de avaliação é:

1. segurança, privacidade e obrigações legais;
2. comportamento comprovado dos ambientes;
3. requisitos técnicos explícitos de `premissas-desenvolvimento.md`;
4. documentação oficial e melhores práticas;
5. ADRs aprovados;
6. estado atual do código.

Uma limitação técnica não altera o requisito. Quando não for possível cumpri-lo, deve ser aberto um bloqueador com alternativas e impacto.

## 3. Produto versus implementação

As fontes de negócio definem o resultado esperado. A engenharia define o mecanismo.

Exemplos:

- a plataforma deve registrar ações relevantes; a engenharia define evento, schema, idempotência e retenção;
- a premissa exige AWS em produção; a engenharia decide serviços, topologia e infraestrutura como código;
- o diagnóstico deve ser editável; a engenharia define a integração e o versionamento;
- desenvolvimento interno não impede o uso de AWS, Supabase de teste, HubSpot e bibliotecas de infraestrutura.

## 4. Escopo vinculante do HubSpot

O HubSpot não é o banco operacional nem o repositório integral do LMS.

A integração do LMS com o HubSpot deve sincronizar somente:

1. **identificadores mínimos de vínculo** necessários para associar o dado ao contato, empresa ou operação corretos;
2. **informações de engajamento na plataforma**, como acesso, progresso, participação, tentativas, conclusões, avaliações de utilidade, retomadas, pontos e credenciais;
3. **informações úteis para cálculos aprovados**, incluindo variáveis ou resultados que possam contribuir para diagnóstico, classificação, personalização, análise, pesquisa ou modelos futuros governados.

A matriz HubSpot deve classificar cada campo ou evento como:

```text
linking_identifier
engagement_signal
calculation_input_or_result
not_synced
```

Cada item sincronizado deve declarar finalidade, granularidade, frequência, retenção, sensibilidade e reconciliação.

Permanecem fora do HubSpot por padrão:

- estado transacional detalhado do LMS;
- configurações editoriais e conteúdo completo;
- respostas ou payloads brutos sem utilidade aprovada;
- arquivos binários e URLs assinadas;
- logs técnicos, filas e dados internos de retry;
- segredos, tokens e credenciais;
- dados sem finalidade de engajamento ou cálculo.

O PostgreSQL permanece como banco operacional, event store, outbox e fonte detalhada. A sincronização pode ser assíncrona.

Informações educacionais ou comportamentais não podem influenciar decisão de crédito sem validação metodológica, análise de vieses, governança e aprovação institucional.

## 5. Desenvolvimento interno

“Desenvolvido internamente” significa:

- propriedade interna do código, arquitetura, dados, regras e manutenção;
- nenhuma compra ou terceirização de LMS que substitua a plataforma;
- nenhuma delegação da responsabilidade central de produto e engenharia;
- uso permitido de serviços mandatados de infraestrutura e integração.

## 6. Segurança de credenciais

Valores sensíveis presentes nas fontes não devem ser reproduzidos no Git, documentos, issues, logs ou PRs.

Regras obrigatórias:

- usar nomes de variáveis e secret managers;
- considerar comprometido qualquer segredo compartilhado em texto;
- rotacionar valores expostos;
- verificar o histórico Git;
- usar push protection e secret scanning.

## 7. Inventário do pacote

| Fonte | Autoridade principal |
|---|---|
| `premissas-desenvolvimento.md` | máxima autoridade geral |
| `Estímulo _ Proposta_estagio.md` | propósito do estágio e resultado esperado |
| `trabalho.md` | capacitação, dados comportamentais e personalização |
| `resumo-diagnostico-capacitacao.md` | tese estratégica, pilares e pilotos |
| `Estímulo-Institucional.md` | instituição, público, 3Cs e impacto |
| `teoria-mudança.md` | teoria da mudança e indicadores |
| `teoria-mudança-amazonia.md` | contexto e impacto na Amazônia |
| `arquetipos_estimulo.md` | arquétipos, maturidade e diagnóstico |
| `arquetipos_estimulo_ppxt.md` | síntese visual dos arquétipos |
| `draft-validacao-jornada-capacitacao-ia-digital-mei_me.md` | estrutura geral da Jornada OpenAI |
| `Bloco-01-boas-vindas-e-potencial-da-ia .docx.md` | bloco de boas-vindas |
| `bloco-02-base-opcional.docx.md` | bloco base opcional |
| `trilha-01-marketing-e-vendas-com-ia.docx.md` | trilha de Marketing e Vendas |
| `trilha-02-gestao-com-ia.docx.md` | trilha de Gestão |
| `trilha-03-desenvolvimento-avancado-com-codex.docx.md` | trilha avançada de Codex |
| `referencias.md` | benchmarks, mockups e fundação anterior |
| `Jornada do Empreendedor Estímulo.pdf` | fluxo visual da jornada de crédito |

## 8. Lacunas e conflitos

Quando faltar informação:

1. registrar em `INFORMATION_REQUESTS.md`;
2. manter a configuração bloqueada quando necessário;
3. usar dados sintéticos somente em testes;
4. não converter hipótese ou protótipo em requisito oficial;
5. não apresentar capacidade genérica como produto oficial concluído.

Quando houver conflito:

1. citar as fontes;
2. aplicar esta hierarquia;
3. atualizar o registro de decisões;
4. atualizar rastreabilidade e bloqueadores;
5. preservar evidência da decisão.

## 9. Regra para documentos existentes

Todo documento ativo deve ser interpretado sob esta hierarquia e sob as decisões posteriores aprovadas.

Em caso de conflito textual não corrigido:

> `SOURCE_AUTHORITY_HIERARCHY.md`, `premissas-desenvolvimento.md` e a decisão HubSpot de 2026-07-16 prevalecem.
