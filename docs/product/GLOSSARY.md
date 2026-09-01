# Glossário do domínio

**Versão:** 1.0  
**Revisado em:** 2026-09-01  
**Status:** vocabulário vigente

| Termo | Definição |
|---|---|
| Conta de acesso | Identidade autenticável. Não é sinônimo de empreendedor, negócio ou participação. |
| Empreendedor | Pessoa participante das iniciativas da Estímulo, separada da credencial de autenticação. |
| Negócio | Unidade econômica beneficiária. É distinta das organizações que operam a plataforma. |
| Organização | Estímulo, parceiro ou outra entidade operadora. Membership organizacional determina escopo de operação. |
| Programa | Estrutura de nível superior que agrupa jornadas. |
| Jornada | Experiência longitudinal representada no produto por um único registro operacional `draft` ou `published`; pode ser editada ao vivo quando publicada. |
| Identificador legado de versão de jornada | Campo/tabela física com nome `journey_version*` preservado por compatibilidade. No lifecycle vigente não representa snapshot editorial navegável. |
| Trilha | Caminho dentro da jornada com etapas e critérios de progressão. |
| Curso | Unidade editorial reutilizável. |
| Módulo | Agrupamento editorial de conteúdo/atividade. |
| Atividade | Unidade executável, como conteúdo, avaliação, prática ou recurso externo. |
| Conteúdo | Informação consumível, como vídeo, texto, slide, prompt ou arquivo. |
| Definição | Identidade estável usada por capacidades que realmente possuem versionamento. |
| Versão | Snapshot de configuração/regra em capacidades versionadas, como diagnóstico ou documento legal. Não deve ser generalizado automaticamente para jornada. |
| Instância | Execução de uma capacidade por um ator, como sessão diagnóstica, tentativa ou matrícula. |
| Participação / matrícula | Relação de um empreendedor com uma jornada operacional. |
| Diagnóstico | Instrumento configurável e versionado que coleta respostas e calcula resultado. |
| Dimensão | Construto/configuração calculada no diagnóstico. |
| Arquétipo | Classificação temporal produzida pelo diagnóstico principal; não é atributo fixo nem score de crédito. |
| Quick check | Avaliação curta vinculada à experiência de aprendizagem. |
| Múltipla escolha | Quick check em que a resposta correta é o conjunto exato das alternativas marcadas como corretas. |
| Gamificação | Pontos, badges, conquistas e credenciais derivados de fatos verificáveis. |
| Badge award | Concessão identificada de um selo. A UI anuncia apenas awards novos, nunca o histórico apenas porque o browser é novo. |
| Ledger de pontos | Histórico imutável de créditos/débitos; saldo e ranking são projeções. |
| Ranking | Projeção ordenada por pontos; identificação pública usa dado mascarado, não e-mail completo. |
| Evento | Fato estruturado e idempotente sobre algo que ocorreu. |
| Outbox | Registro transacional para efeitos externos assíncronos sem acoplar o domínio ao destino. |
| Feature comportamental | Valor derivado de eventos para análise. |
| Score comportamental | Resultado analítico configurável que não altera acesso, recomendação, recompensa ou crédito. |
| RLS | Row-Level Security usada como defesa em profundidade no PostgreSQL. |
| RBAC | Autorização por papéis/capacidades e escopo organizacional. |
| Preview | Deployment ou modo isolado usado para revisão; não equivale à produção institucional. |
| Fonte de verdade | Artefato autorizado a definir determinado estado. Para schema físico, são as migrations versionadas. |