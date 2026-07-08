# Relatório de conclusão - E06 Especificação da Jornada OpenAI

**Versão:** 0.1  
**Data:** 2026-07-08  
**Status:** Concluído no nível de especificação; publicação bloqueada por lacunas editoriais

## 1. Tarefas concluídas

| Tarefa | Status | Resultado |
|---|---|---|
| E06-T01 Hierarquia formal | DONE | Jornada, blocos, trilhas, unidades, provas e práticas especificados |
| E06-T02 Competências e objetivos | DONE V0.1 | 16 competências propostas e separadas de comportamento/impacto |
| E06-T03 Progressão e desbloqueio | DONE V0.1 | Grafo, estados e regras estruturadas definidos |
| E06-T04 Avaliações e práticas | DONE STRUCTURE | Tipos, tentativas, submissões e rubrica genérica definidos; conteúdo ainda pendente |
| E06-T05 Pontos, selos e certificados | DONE V0.1 | Ledger, regras sugeridas, proteções e credenciais definidos |
| E06-T06 Versionamento editorial | DONE V0.1 | Ciclo editorial, publicação e migração especificados |
| E06-T07 Eventos por componente | DONE REQUIREMENTS | Fatos necessários listados para detalhamento no E08 |

## 2. Decisões estruturais resultantes

- Boas-vindas precede o hub.
- O bloco base permanece opcional e não bloqueia o certificado base segundo a fonte.
- Marketing e Gestão são trilhas paralelas e obrigatórias para o Certificado Base.
- O bônus Codex é opcional e posterior ao Certificado Base.
- Conclusão base e conclusão avançada são marcos diferentes.
- Duração total será derivada das atividades publicadas.
- Avaliações, pontos, selos e certificados são definições versionadas.
- Prática, compreensão, progressão e feedback são estados/eventos separados.
- Pontos não serão usados como score comportamental por padrão.
- A versão publicada é imutável para participantes já inscritos.

## 3. Bloqueios explicitamente não resolvidos

- materiais finais;
- inconsistências de duração e numeração;
- perguntas e respostas das avaliações;
- notas e tentativas;
- escopo e obrigatoriedade das práticas;
- rubricas finais e capacidade de revisão;
- parâmetros de conclusão de mídia;
- termos e política de autorização;
- validade das credenciais;
- revisão de segurança dos conteúdos;
- adequação final da ferramenta ao público.

Esses bloqueios são de conteúdo, operação e governança. Eles não impedem o início do E08, mas impedem publicar a jornada em produção.

## 4. Teste de extensibilidade

A especificação usa códigos e regras genéricas de atividades, progressão, avaliação e credenciais. Nenhuma regra depende de condicionais no núcleo como `if journey == openai`. O YAML demonstra que a Jornada OpenAI pode ser carregada como configuração versionada.

## 5. Próxima etapa

E07 - pesquisa e definição do diagnóstico/arquétipos - é a próxima etapa funcional na ordem original. Entretanto, como a pesquisa depende das entrevistas e da obtenção da amostra, o E08 - arquitetura de eventos comportamentais - também pode avançar em paralelo usando os requisitos semânticos produzidos no E06.
