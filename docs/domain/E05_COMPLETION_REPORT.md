# Relatório de conclusão — E05 Modelo de domínio e extensibilidade

**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** Concluído em nível conceitual; sujeito ao Gate da fase inicial

## 1. Tarefas concluídas

| Tarefa | Status | Artefato principal |
|---|---|---|
| E05-T01 Definir entidades e conceitos | DONE V0.1 | `DOMAIN_MODEL.md` |
| E05-T02 Definir contextos delimitados | DONE V0.1 | `BOUNDED_CONTEXTS.md` |
| E05-T03 Definir estados e ciclos de vida | DONE V0.1 | `LIFECYCLES_AND_STATE_MACHINES.md` |
| E05-T04 Definir matriz de permissões | DONE V0.1 | `PERMISSION_MODEL.md` |
| E05-T05 Definir modelo de extensibilidade | DONE V0.1 | `EXTENSIBILITY_MODEL.md` |

## 2. Validações executadas

- Jornada, curso e atividade foram separados.
- Definição, versão e instância foram separados.
- Conta, empreendedor, negócio e organização foram separados.
- Segmento, arquétipo, coorte e momento de crédito foram separados.
- Conteúdo reutilizável foi desacoplado da orquestração.
- Uma segunda jornada hipotética foi mapeada sem novas tabelas específicas.
- Publicação imutável e fixação da participação à versão foram definidas.
- Autorização foi estruturada por capacidade e escopo.
- Administração foi tratada como composição de casos de uso.
- Score permaneceu fora do cadastro principal e da decisão de crédito na release inicial de produção.

## 3. Critérios de aceite do E05

| Critério | Resultado |
|---|---|
| Entidades sem sobreposição conceitual evitável | Atendido em V0.1 |
| Contextos com responsabilidade e propriedade claras | Atendido em V0.1 |
| Transições inválidas identificáveis | Atendido conceitualmente |
| Ações sensíveis associadas a políticas | Atendido conceitualmente |
| Segunda jornada sem duplicar tabelas | Atendido no teste hipotético |
| Nenhuma regra central específica da OpenAI | Definido como restrição; implementação ainda será auditada/refatorada |

## 4. Pendências que não bloqueiam o E06

- inventário real do HubSpot;
- estados e identificadores de crédito;
- papéis operacionais finais;
- política jurídica de retenção;
- regras editoriais finais da Jornada OpenAI;
- diagnóstico e arquétipos validados;
- escolha da linguagem de regras;
- nomes finais de tabelas e contratos.

## 5. Próxima etapa recomendada

Executar o **E06 — Especificação versionada da Jornada OpenAI**, usando o modelo aprovado conceitualmente:

1. hierarquia formal;
2. objetivos e competências;
3. atividades e ativos;
4. trilhas, etapas e transições;
5. regras de entrada/progressão/conclusão;
6. avaliações e práticas;
7. pontos, selos e certificados;
8. versionamento editorial;
9. eventos esperados por etapa;
10. lacunas que precisam de definição da Estímulo.
